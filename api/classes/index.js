import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || "MONGODB_URI_ENVIRONMENT_VARIABLE";
const DB_NAME = 'flashcard';
const CLASSES_COLLECTION_NAME = 'classes';
const COLLECTION_NAME = 'flashcards';
const GROUPS_COLLECTION_NAME = 'groups';
const SETTINGS_COLLECTION_NAME = 'settings';

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

function generateClassId(className) {
  // Generate a URL-safe class ID from the class name
  return className
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .substring(0, 30); // Limit length
}

export default async function handler(req, res) {
  const { method } = req;

  // Add cache control headers to prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const { db } = await connectToDatabase();
    const classesCollection = db.collection(CLASSES_COLLECTION_NAME);
    const flashcardsCollection = db.collection(COLLECTION_NAME);
    const groupsCollection = db.collection(GROUPS_COLLECTION_NAME);
    const settingsCollection = db.collection(SETTINGS_COLLECTION_NAME);

    switch (method) {
      case 'GET':
        // Get all classes
        const classes = await classesCollection.find({}).sort({ createdAt: -1 }).toArray();
        res.status(200).json({ success: true, classes });
        break;

      case 'POST':
        // Create a new class
        const { className } = req.body;
        
        if (!className || typeof className !== 'string' || className.trim().length === 0) {
          return res.status(400).json({ error: 'Class name is required' });
        }

        const trimmedClassName = className.trim();
        if (trimmedClassName.length > 50) {
          return res.status(400).json({ error: 'Class name must be 50 characters or less' });
        }

        // Check if class name already exists - case insensitive
        const existingClass = await classesCollection.findOne({ 
          name: { $regex: new RegExp(`^${trimmedClassName}$`, 'i') } 
        });
        if (existingClass) {
          return res.status(400).json({ error: 'A class with this name already exists' });
        }

        // Generate unique class ID
        let classId = generateClassId(trimmedClassName);
        let counter = 1;
        
        // Ensure class ID is unique - case insensitive
        while (await classesCollection.findOne({ 
          id: { $regex: new RegExp(`^${classId}$`, 'i') } 
        })) {
          classId = generateClassId(trimmedClassName) + '-' + counter;
          counter++;
        }

        const newClass = {
          id: classId,
          name: trimmedClassName,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await classesCollection.insertOne(newClass);
        res.status(200).json({ success: true, class: newClass });
        break;

      case 'PUT':
        // Update a class
        const { classId: updateClassId, className: newClassName } = req.body;
        
        if (!updateClassId || !newClassName) {
          return res.status(400).json({ error: 'Class ID and new class name are required' });
        }

        const trimmedNewClassName = newClassName.trim();
        if (trimmedNewClassName.length === 0 || trimmedNewClassName.length > 50) {
          return res.status(400).json({ error: 'Class name must be between 1 and 50 characters' });
        }

        // Check if new name conflicts with existing class (excluding current class) - case insensitive
        const conflictingClass = await classesCollection.findOne({ 
          name: { $regex: new RegExp(`^${trimmedNewClassName}$`, 'i') }, 
          id: { $ne: updateClassId } 
        });
        
        if (conflictingClass) {
          return res.status(400).json({ error: 'A class with this name already exists' });
        }

        // Generate new class ID based on new name
        const newClassId = generateClassId(trimmedNewClassName);
        
        // Check if new class ID conflicts with existing class (excluding current class) - case insensitive
        const conflictingId = await classesCollection.findOne({ 
          id: { $regex: new RegExp(`^${newClassId}$`, 'i') }, 
          id: { $ne: updateClassId } 
        });
        
        if (conflictingId) {
          return res.status(400).json({ error: 'A class with this ID already exists. Please choose a different name.' });
        }

        // Update all flashcards with new class ID
        const flashcardsUpdateResult = await flashcardsCollection.updateMany(
          { classId: updateClassId },
          { $set: { classId: newClassId } }
        );

        // Update all groups with new class ID
        const groupsUpdateResult = await groupsCollection.updateMany(
          { classId: updateClassId },
          { $set: { classId: newClassId } }
        );

        // Update all settings with new class ID
        const settingsUpdateResult = await settingsCollection.updateMany(
          { classId: updateClassId },
          { $set: { classId: newClassId } }
        );

        // Update the class record with new name and ID
        const updateResult = await classesCollection.updateOne(
          { id: updateClassId },
          { 
            $set: { 
              id: newClassId,
              name: trimmedNewClassName, 
              updatedAt: new Date() 
            } 
          }
        );

        if (updateResult.matchedCount === 0) {
          return res.status(404).json({ error: 'Class not found' });
        }

        res.status(200).json({ 
          success: true, 
          message: 'Class updated successfully',
          newClassId: newClassId,
          updatedCounts: {
            flashcards: flashcardsUpdateResult.modifiedCount,
            groups: groupsUpdateResult.modifiedCount,
            settings: settingsUpdateResult.modifiedCount
          }
        });
        break;

      case 'DELETE':
        // Delete a class and all its associated data
        const { classId: deleteClassId } = req.body;
        
        if (!deleteClassId) {
          return res.status(400).json({ error: 'Class ID is required' });
        }

        // Delete class record
        const deleteClassResult = await classesCollection.deleteOne({ id: deleteClassId });
        
        if (deleteClassResult.deletedCount === 0) {
          return res.status(404).json({ error: 'Class not found' });
        }

        // Delete all associated flashcards, groups, and settings
        const deleteFlashcardsResult = await flashcardsCollection.deleteMany({ classId: deleteClassId });
        const deleteGroupsResult = await groupsCollection.deleteMany({ classId: deleteClassId });
        const deleteSettingsResult = await settingsCollection.deleteMany({ classId: deleteClassId });

        res.status(200).json({ 
          success: true, 
          message: 'Class and all associated data deleted successfully',
          deletedFlashcards: deleteFlashcardsResult.deletedCount,
          deletedGroups: deleteGroupsResult.deletedCount,
          deletedSettings: deleteSettingsResult.deletedCount
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Classes API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
