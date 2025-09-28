import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || "MONGODB_URI_ENVIRONMENT_VARIABLE";
const DB_NAME = 'flashcard';
const COLLECTION_NAME = 'flashcards';
const GROUPS_COLLECTION_NAME = 'groups';

let client;
let db;

async function connectToDatabase() {
  if (client && db) {
    return { client, db };
  }

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('Connected to MongoDB');
    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  const { method } = req;

  // Add cache control headers to prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    const groupsCollection = db.collection(GROUPS_COLLECTION_NAME);

    switch (method) {
      case 'GET':
        // Get all flashcards and groups
        const flashcards = await collection.find({}).sort({ createdAt: -1 }).toArray();
        const groups = await groupsCollection.find({}).sort({ createdAt: -1 }).toArray();
        res.status(200).json({ success: true, flashcards, groups });
        break;

      case 'POST':
        // Save flashcards and groups (replace all existing ones)
        const { flashcards: newFlashcards, groups: newGroups } = req.body;
        
        if (!newFlashcards || !Array.isArray(newFlashcards)) {
          return res.status(400).json({ error: 'Missing flashcards data' });
        }

        if (!newGroups || !Array.isArray(newGroups)) {
          return res.status(400).json({ error: 'Missing groups data' });
        }

        // Clear existing flashcards and groups, then insert new ones
        await collection.deleteMany({});
        await groupsCollection.deleteMany({});
        
        if (newFlashcards.length > 0) {
          // Add timestamps to each flashcard
          const flashcardsWithTimestamps = newFlashcards.map(card => ({
            ...card,
            createdAt: new Date(),
            updatedAt: new Date()
          }));
          
          await collection.insertMany(flashcardsWithTimestamps);
        }

        if (newGroups.length > 0) {
          // Add timestamps to each group
          const groupsWithTimestamps = newGroups.map(group => ({
            ...group,
            createdAt: new Date(),
            updatedAt: new Date()
          }));
          
          await groupsCollection.insertMany(groupsWithTimestamps);
        }

        res.status(200).json({ 
          success: true, 
          message: 'Flashcards and groups saved successfully',
          flashcardsCount: newFlashcards.length,
          groupsCount: newGroups.length
        });
        break;

      case 'DELETE':
        // Clear all flashcards and groups
        const deleteFlashcardsResult = await collection.deleteMany({});
        const deleteGroupsResult = await groupsCollection.deleteMany({});
        res.status(200).json({ 
          success: true, 
          message: 'All flashcards and groups cleared',
          deletedFlashcards: deleteFlashcardsResult.deletedCount,
          deletedGroups: deleteGroupsResult.deletedCount
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}