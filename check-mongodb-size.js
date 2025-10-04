// Direct MongoDB connection script to check database size
// Run this with: node check-mongodb-size.js

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'flashcard';

async function checkMongoDBSize() {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI environment variable not found');
        console.log('💡 Make sure you have a .env file with MONGODB_URI');
        return;
    }

    let client;
    
    try {
        console.log('🔍 Connecting to MongoDB...');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        
        const db = client.db(DB_NAME);
        
        console.log('📊 Getting database statistics...');
        
        // Get database stats
        const dbStats = await db.stats();
        
        // Get collection stats
        const collections = ['flashcards', 'groups', 'settings', 'classes'];
        const collectionStats = {};
        
        for (const collectionName of collections) {
            try {
                const collection = db.collection(collectionName);
                const count = await collection.countDocuments();
                
                // Try to get stats using runCommand for newer MongoDB driver versions
                let stats = { size: 0, storageSize: 0, avgObjSize: 0 };
                try {
                    const statsResult = await db.runCommand({ collStats: collectionName });
                    stats = {
                        size: statsResult.size || 0,
                        storageSize: statsResult.storageSize || 0,
                        avgObjSize: statsResult.avgObjSize || 0
                    };
                } catch (statsError) {
                    // Fallback: estimate based on document count and sample
                    if (count > 0) {
                        const sample = await collection.findOne();
                        if (sample) {
                            const sampleSize = JSON.stringify(sample).length;
                            stats = {
                                size: count * sampleSize,
                                storageSize: count * sampleSize * 1.2, // Estimate with overhead
                                avgObjSize: sampleSize
                            };
                        }
                    }
                }
                
                collectionStats[collectionName] = {
                    count,
                    size: stats.size,
                    storageSize: stats.storageSize,
                    avgObjSize: stats.avgObjSize
                };
            } catch (error) {
                console.log(`⚠️  Collection ${collectionName} not found or error: ${error.message}`);
                collectionStats[collectionName] = {
                    count: 0,
                    size: 0,
                    storageSize: 0,
                    avgObjSize: 0
                };
            }
        }
        
        // Display results
        console.log('\n📊 DATABASE STATISTICS');
        console.log('====================');
        console.log(`Database: ${dbStats.db}`);
        console.log(`Total Size: ${formatBytes(dbStats.totalSize)}`);
        console.log(`Data Size: ${formatBytes(dbStats.dataSize)}`);
        console.log(`Storage Size: ${formatBytes(dbStats.storageSize)}`);
        console.log(`Collections: ${dbStats.collections}`);
        console.log(`Documents: ${dbStats.objects}`);
        console.log(`Indexes: ${dbStats.indexes}`);
        
        console.log('\n📁 COLLECTION BREAKDOWN');
        console.log('======================');
        
        let totalDataSize = 0;
        let totalStorageSize = 0;
        let totalDocuments = 0;
        
        Object.entries(collectionStats).forEach(([name, stats]) => {
            console.log(`\n${name.toUpperCase()}:`);
            console.log(`  Documents: ${stats.count}`);
            console.log(`  Data Size: ${formatBytes(stats.size)}`);
            console.log(`  Storage Size: ${formatBytes(stats.storageSize)}`);
            console.log(`  Avg Document Size: ${formatBytes(stats.avgObjSize)}`);
            
            totalDataSize += stats.size;
            totalStorageSize += stats.storageSize;
            totalDocuments += stats.count;
        });
        
        console.log('\n📈 SUMMARY');
        console.log('==========');
        console.log(`Total Documents: ${totalDocuments}`);
        console.log(`Total Data Size: ${formatBytes(totalDataSize)}`);
        console.log(`Total Storage Size: ${formatBytes(totalStorageSize)}`);
        console.log(`Database Overhead: ${formatBytes(dbStats.totalSize - totalStorageSize)}`);
        
        // Calculate image storage estimate
        const flashcardsData = collectionStats.flashcards;
        if (flashcardsData.count > 0) {
            const avgImageSize = flashcardsData.avgObjSize;
            const estimatedImageStorage = flashcardsData.count * avgImageSize;
            console.log(`\n🖼️  IMAGE STORAGE ESTIMATE`);
            console.log(`========================`);
            console.log(`Flashcards with images: ${flashcardsData.count}`);
            console.log(`Estimated image storage: ${formatBytes(estimatedImageStorage)}`);
            console.log(`Average per flashcard: ${formatBytes(avgImageSize)}`);
        }
        
    } catch (error) {
        console.error('❌ Error checking database size:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ Database connection closed');
        }
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run the check
checkMongoDBSize();
