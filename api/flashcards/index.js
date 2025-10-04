import { MongoClient } from 'mongodb';

// Load environment variables for local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const MONGODB_URI = process.env.MONGODB_URI;
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
        const unassignedOnly = req.query.unassigned === 'true';
        
        // Build filter query
        let filter = {};
        if (unassignedOnly) {
          // Only return data without classId (unassigned data)
          filter = { $or: [{ classId: { $exists: false } }, { classId: null }] };
        } else if (classId) {
          // Specific class requested - case insensitive matching
          // Use regex to match classId case-insensitively
          filter = { classId: { $regex: new RegExp(`^${classId}$`, 'i') } };
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
        // Check if this is a single flashcard save
        if (req.query.single === 'true') {
          // Handle single flashcard save (add to existing, don't replace)
          const { flashcards: newFlashcards, classId: postClassId } = req.body;
          
          if (!newFlashcards || !Array.isArray(newFlashcards) || newFlashcards.length !== 1) {
            return res.status(400).json({ error: 'Single flashcard save requires exactly one flashcard' });
          }
          
          const newCard = newFlashcards[0];
          console.log('Single flashcard save:', { cardId: newCard.id, classId: postClassId });
          
          // Add timestamp and classId
          const cardWithTimestamp = {
            ...newCard,
            classId: postClassId || undefined,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Insert the single flashcard
          await collection.insertOne(cardWithTimestamp);
          console.log('Single flashcard inserted successfully');
          
          res.status(200).json({ 
            success: true, 
            message: 'Single flashcard saved successfully',
            cardId: newCard.id
          });
          break;
        }
        
        // Original bulk save logic (replace all existing ones)
        const { flashcards: newFlashcards, groups: newGroups, settings: newSettings, classId: postClassId } = req.body;
        
        console.log('POST request received:', {
          flashcardsCount: newFlashcards ? newFlashcards.length : 'undefined',
          groupsCount: newGroups ? newGroups.length : 'undefined',
          hasSettings: !!newSettings,
          classId: postClassId
        });
        
        if (!newFlashcards || !Array.isArray(newFlashcards)) {
          console.error('Invalid flashcards data:', typeof newFlashcards, Array.isArray(newFlashcards));
          return res.status(400).json({ error: 'Missing flashcards data' });
        }

        if (!newGroups || !Array.isArray(newGroups)) {
          console.error('Invalid groups data:', typeof newGroups, Array.isArray(newGroups));
          return res.status(400).json({ error: 'Missing groups data' });
        }

        // Build filter for deletion - if class specified, only delete that class's data
        let deleteFilter;
        if (postClassId) {
          deleteFilter = { classId: postClassId };
        } else {
          // For backward compatibility, delete data without classId
          deleteFilter = { $or: [{ classId: { $exists: false } }, { classId: null }] };
        }
        
        try {
          console.log('Deleting existing data with filter:', deleteFilter);
          // Clear existing flashcards and groups for this class (or unassigned data if no class specified)
          const deleteFlashcardsResult = await collection.deleteMany(deleteFilter);
          const deleteGroupsResult = await groupsCollection.deleteMany(deleteFilter);
          console.log('Deletion results:', { 
            deletedFlashcards: deleteFlashcardsResult.deletedCount, 
            deletedGroups: deleteGroupsResult.deletedCount 
          });
          
          if (newFlashcards.length > 0) {
            // Add timestamps and classId to each flashcard
            console.log('Processing flashcards for insertion...');
            const flashcardsWithTimestamps = newFlashcards.map((card, index) => {
              try {
                return {
                  ...card,
                  classId: postClassId || undefined, // Only add classId if specified
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
              } catch (error) {
                console.error(`Error processing flashcard ${index}:`, error, card);
                throw error;
              }
            });
            
            console.log(`Inserting ${flashcardsWithTimestamps.length} flashcards...`);
            await collection.insertMany(flashcardsWithTimestamps);
            console.log('Flashcards inserted successfully');
          }

          if (newGroups.length > 0) {
            // Add timestamps and classId to each group
            console.log('Processing groups for insertion...');
            const groupsWithTimestamps = newGroups.map((group, index) => {
              try {
                return {
                  ...group,
                  classId: postClassId || undefined, // Only add classId if specified
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
              } catch (error) {
                console.error(`Error processing group ${index}:`, error, group);
                throw error;
              }
            });
            
            console.log(`Inserting ${groupsWithTimestamps.length} groups...`);
            await groupsCollection.insertMany(groupsWithTimestamps);
            console.log('Groups inserted successfully');
          }
        } catch (dbError) {
          console.error('Database operation error:', dbError);
          throw dbError;
        }

        // Save settings if provided
        if (newSettings) {
          // Delete existing settings for this class (or global if no class)
          let settingsDeleteFilter;
          if (postClassId) {
            settingsDeleteFilter = { type: 'welcome', classId: postClassId };
          } else {
            settingsDeleteFilter = { 
              type: 'welcome', 
              $or: [{ classId: { $exists: false } }, { classId: null }] 
            };
          }
          
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