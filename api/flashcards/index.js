import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || "MONGODB_URI_ENVIRONMENT_VARIABLE";
const DB_NAME = 'flashcard';
const COLLECTION_NAME = 'flashcards';
const GROUPS_COLLECTION_NAME = 'groups';
const SETTINGS_COLLECTION_NAME = 'settings';
const CLASSES_COLLECTION_NAME = 'classes';

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
    const settingsCollection = db.collection(SETTINGS_COLLECTION_NAME);
    const classesCollection = db.collection(CLASSES_COLLECTION_NAME);

    switch (method) {
      case 'GET':
        // Get class parameter from query string (optional for backward compatibility)
        const classId = req.query.class;
        
        // Build filter query
        let filter = {};
        if (classId) {
          // Specific class requested
          filter = { classId: classId };
        } else {
          // No class specified - for backward compatibility, return data without classId
          // This allows the teacher interface to work with existing data
          filter = { $or: [{ classId: { $exists: false } }, { classId: null }] };
        }
        
        // Get flashcards, groups, and settings (filtered by class if specified)
        // Sort by custom order first, then by createdAt ascending (oldest first) for backwards compatibility
        const flashcards = await collection.find(filter).sort({ sortOrder: 1, createdAt: 1 }).toArray();
        const groups = await groupsCollection.find(filter).sort({ createdAt: -1 }).toArray();
        
        // Settings can be class-specific or global
        let settings;
        if (classId) {
          // Try to get class-specific settings first
          settings = await settingsCollection.findOne({ type: 'welcome', classId: classId });
          // Fall back to global settings if no class-specific settings found
          if (!settings) {
            settings = await settingsCollection.findOne({ 
              type: 'welcome', 
              $or: [{ classId: { $exists: false } }, { classId: null }] 
            });
          }
        } else {
          // For backward compatibility, get settings without classId
          settings = await settingsCollection.findOne({ 
            type: 'welcome', 
            $or: [{ classId: { $exists: false } }, { classId: null }] 
          });
        }
        
        // Get all classes for management interface
        const classes = await classesCollection.find({}).sort({ createdAt: -1 }).toArray();
        
        settings = settings || {};
        res.status(200).json({ success: true, flashcards, groups, settings, classes, classId });
        break;

      case 'POST':
        // Save flashcards, groups, and settings (replace all existing ones)
        const { flashcards: newFlashcards, groups: newGroups, settings: newSettings, classId: postClassId } = req.body;
        
        if (!newFlashcards || !Array.isArray(newFlashcards)) {
          return res.status(400).json({ error: 'Missing flashcards data' });
        }

        if (!newGroups || !Array.isArray(newGroups)) {
          return res.status(400).json({ error: 'Missing groups data' });
        }

        // Build filter for deletion - if class specified, only delete that class's data
        const deleteFilter = postClassId ? { classId: postClassId } : {};
        
        // Clear existing flashcards and groups for this class (or all if no class specified)
        await collection.deleteMany(deleteFilter);
        await groupsCollection.deleteMany(deleteFilter);
        
        if (newFlashcards.length > 0) {
          // Add timestamps and classId to each flashcard
          const flashcardsWithTimestamps = newFlashcards.map(card => ({
            ...card,
            classId: postClassId || undefined, // Only add classId if specified
            createdAt: new Date(),
            updatedAt: new Date()
          }));
          
          await collection.insertMany(flashcardsWithTimestamps);
        }

        if (newGroups.length > 0) {
          // Add timestamps and classId to each group
          const groupsWithTimestamps = newGroups.map(group => ({
            ...group,
            classId: postClassId || undefined, // Only add classId if specified
            createdAt: new Date(),
            updatedAt: new Date()
          }));
          
          await groupsCollection.insertMany(groupsWithTimestamps);
        }

        // Save settings if provided
        if (newSettings) {
          // Delete existing settings for this class (or global if no class)
          const settingsDeleteFilter = postClassId 
            ? { type: 'welcome', classId: postClassId }
            : { type: 'welcome', classId: { $exists: false } };
          
          await settingsCollection.deleteMany(settingsDeleteFilter);
          
          const settingsToSave = {
            type: 'welcome',
            ...newSettings,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Only add classId to settings if specified
          if (postClassId) {
            settingsToSave.classId = postClassId;
          }
          
          await settingsCollection.insertOne(settingsToSave);
        }

        res.status(200).json({ 
          success: true, 
          message: 'Flashcards, groups, and settings saved successfully',
          flashcardsCount: newFlashcards.length,
          groupsCount: newGroups.length,
          settingsSaved: !!newSettings,
          classId: postClassId
        });
        break;

      case 'DELETE':
        // Clear all flashcards, groups, and settings
        const deleteFlashcardsResult = await collection.deleteMany({});
        const deleteGroupsResult = await groupsCollection.deleteMany({});
        const deleteSettingsResult = await settingsCollection.deleteMany({});
        res.status(200).json({ 
          success: true, 
          message: 'All flashcards, groups, and settings cleared',
          deletedFlashcards: deleteFlashcardsResult.deletedCount,
          deletedGroups: deleteGroupsResult.deletedCount,
          deletedSettings: deleteSettingsResult.deletedCount
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