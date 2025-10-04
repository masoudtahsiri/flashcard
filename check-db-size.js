// Simple script to check database size
// Run this with: node check-db-size.js

async function checkDatabaseSize() {
    try {
        console.log('🔍 Checking database size...');
        
        // Make request to the stats endpoint
        const response = await fetch('http://localhost:3000/api/flashcards?stats=true');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('\n📊 DATABASE STATISTICS');
            console.log('====================');
            console.log(`Database: ${data.database.name}`);
            console.log(`Total Size: ${formatBytes(data.database.totalSize)}`);
            console.log(`Data Size: ${formatBytes(data.database.dataSize)}`);
            console.log(`Storage Size: ${formatBytes(data.database.storageSize)}`);
            console.log(`Collections: ${data.database.collections}`);
            console.log(`Documents: ${data.database.objects}`);
            console.log(`Indexes: ${data.database.indexes}`);
            
            console.log('\n📁 COLLECTION BREAKDOWN');
            console.log('======================');
            
            Object.entries(data.collections).forEach(([name, stats]) => {
                console.log(`\n${name.toUpperCase()}:`);
                console.log(`  Documents: ${stats.count}`);
                console.log(`  Size: ${formatBytes(stats.size)}`);
                console.log(`  Storage Size: ${formatBytes(stats.storageSize)}`);
                console.log(`  Avg Document Size: ${formatBytes(stats.avgObjSize)}`);
            });
            
            // Calculate total collection sizes
            const totalCollectionSize = Object.values(data.collections)
                .reduce((sum, stats) => sum + stats.size, 0);
            const totalStorageSize = Object.values(data.collections)
                .reduce((sum, stats) => sum + stats.storageSize, 0);
            
            console.log('\n📈 SUMMARY');
            console.log('==========');
            console.log(`Total Collection Data Size: ${formatBytes(totalCollectionSize)}`);
            console.log(`Total Collection Storage Size: ${formatBytes(totalStorageSize)}`);
            console.log(`Database Overhead: ${formatBytes(data.database.totalSize - totalStorageSize)}`);
            
        } else {
            console.error('❌ Failed to get database stats');
        }
        
    } catch (error) {
        console.error('❌ Error checking database size:', error.message);
        console.log('\n💡 Make sure your development server is running:');
        console.log('   npm run dev');
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
checkDatabaseSize();
