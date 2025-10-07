import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';

// Load environment variables for local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'flashcard';
const USERS_COLLECTION_NAME = 'users';
const ONBOARDING_COLLECTION_NAME = 'onboarding';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

// Helper function to verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Helper function to validate age
function isValidAge(age) {
  return Number.isInteger(age) && age >= 5 && age <= 120;
}

// Helper function to validate topics
function isValidTopics(topics) {
  const validTopics = [
    'Technology', 'Sports', 'Travel', 'Food & Cooking', 'Music', 
    'Art & Design', 'Business', 'Health & Fitness', 'Education', 
    'Entertainment', 'Science', 'Nature & Environment', 'Fashion', 
    'History', 'Literature'
  ];
  
  return Array.isArray(topics) && 
         topics.length >= 3 && 
         topics.length <= 6 && 
         topics.every(topic => validTopics.includes(topic));
}

export default async function handler(req, res) {
  const { method } = req;

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection(USERS_COLLECTION_NAME);
    const onboardingCollection = db.collection(ONBOARDING_COLLECTION_NAME);

    // Verify authentication for all requests
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authorization header required' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.type !== 'access') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }

    const userId = decoded.userId;

    switch (method) {
      case 'POST':
        console.log('🔍 DEBUG BACKEND: Received request body:', JSON.stringify(req.body, null, 2));
        console.log('🔍 DEBUG BACKEND: Request headers:', JSON.stringify(req.headers, null, 2));
        
        const { step, data } = req.body;
        
        console.log('🔍 DEBUG BACKEND: Extracted step:', step);
        console.log('🔍 DEBUG BACKEND: Extracted data:', JSON.stringify(data, null, 2));
        
        if (!step || !data) {
          console.log('🔍 DEBUG BACKEND: Missing step or data');
          return res.status(400).json({ 
            success: false, 
            error: 'Step and data are required' 
          });
        }

        if (step === 'basicInfo') {
          // Step 1: Basic Information Collection
          const { age, gender, topicsOfInterest } = data;
          
          console.log('🔍 DEBUG BACKEND: Basic info validation:');
          console.log('🔍 Age:', age, 'Type:', typeof age);
          console.log('🔍 Gender:', gender, 'Type:', typeof gender);
          console.log('🔍 Topics:', topicsOfInterest, 'Type:', typeof topicsOfInterest, 'Length:', Array.isArray(topicsOfInterest) ? topicsOfInterest.length : 'Not an array');
          
          if (!isValidAge(age)) {
            console.log('🔍 DEBUG BACKEND: Age validation failed');
            return res.status(400).json({ 
              success: false, 
              error: 'Age must be between 5 and 120' 
            });
          }

          if (!gender || !['Male', 'Female'].includes(gender)) {
            console.log('🔍 DEBUG BACKEND: Gender validation failed');
            return res.status(400).json({ 
              success: false, 
              error: 'Valid gender is required' 
            });
          }

          if (!isValidTopics(topicsOfInterest)) {
            console.log('🔍 DEBUG BACKEND: Topics validation failed');
            console.log('🔍 Topics array:', topicsOfInterest);
            console.log('🔍 Is array:', Array.isArray(topicsOfInterest));
            console.log('🔍 Length:', Array.isArray(topicsOfInterest) ? topicsOfInterest.length : 'N/A');
            return res.status(400).json({ 
              success: false, 
              error: '3 to 6 valid topics of interest are required' 
            });
          }

          // Save basic info
          const basicInfo = {
            userId: new db.ObjectId(userId),
            age,
            gender,
            topicsOfInterest,
            step: 1,
            completedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Upsert basic info
          await onboardingCollection.updateOne(
            { userId: new db.ObjectId(userId) },
            { 
              $set: { 
                ...basicInfo,
                updatedAt: new Date()
              },
              $setOnInsert: {
                createdAt: new Date()
              }
            },
            { upsert: true }
          );

          res.status(200).json({
            success: true,
            message: 'Basic information saved successfully',
            data: {
              step: 1,
              nextStep: 2,
              basicInfo: {
                age,
                gender,
                topicsOfInterest
              }
            }
          });

        } else if (step === 'vocabularyAssessment') {
          // Step 2: Vocabulary Assessment
          const { questionsAnswered, correctAnswers, proficiencyLevel, weakAreas, strongAreas } = data;
          
          if (!Number.isInteger(questionsAnswered) || questionsAnswered < 0) {
            return res.status(400).json({ 
              success: false, 
              error: 'Valid questions answered count is required' 
            });
          }

          if (!Number.isInteger(correctAnswers) || correctAnswers < 0 || correctAnswers > questionsAnswered) {
            return res.status(400).json({ 
              success: false, 
              error: 'Valid correct answers count is required' 
            });
          }

          if (!['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(proficiencyLevel)) {
            return res.status(400).json({ 
              success: false, 
              error: 'Valid proficiency level is required' 
            });
          }

          // Save vocabulary assessment
          const vocabularyAssessment = {
            questionsAnswered,
            correctAnswers,
            proficiencyLevel,
            weakAreas: weakAreas || [],
            strongAreas: strongAreas || [],
            step: 2,
            completedAt: new Date()
          };

          await onboardingCollection.updateOne(
            { userId: new db.ObjectId(userId) },
            { 
              $set: { 
                ...vocabularyAssessment,
                updatedAt: new Date()
              }
            }
          );

          // Update user level
          await usersCollection.updateOne(
            { _id: new db.ObjectId(userId) },
            { 
              $set: { 
                level: proficiencyLevel,
                updatedAt: new Date()
              }
            }
          );

          res.status(200).json({
            success: true,
            message: 'Vocabulary assessment saved successfully',
            data: {
              step: 2,
              nextStep: 3,
              assessment: vocabularyAssessment
            }
          });

        } else if (step === 'recommendations') {
          // Step 3: Personalized Recommendations
          const { recommendedTopics, difficultyLevel, learningGoals, estimatedStudyTime } = data;
          
          if (!Array.isArray(recommendedTopics) || recommendedTopics.length === 0) {
            return res.status(400).json({ 
              success: false, 
              error: 'Recommended topics are required' 
            });
          }

          if (!['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(difficultyLevel)) {
            return res.status(400).json({ 
              success: false, 
              error: 'Valid difficulty level is required' 
            });
          }

          if (!Array.isArray(learningGoals) || learningGoals.length === 0) {
            return res.status(400).json({ 
              success: false, 
              error: 'Learning goals are required' 
            });
          }

          if (!Number.isInteger(estimatedStudyTime) || estimatedStudyTime < 5) {
            return res.status(400).json({ 
              success: false, 
              error: 'Valid estimated study time is required (minimum 5 minutes)' 
            });
          }

          // Save recommendations
          const recommendations = {
            recommendedTopics,
            difficultyLevel,
            learningGoals,
            estimatedStudyTime,
            step: 3,
            completedAt: new Date()
          };

          await onboardingCollection.updateOne(
            { userId: new db.ObjectId(userId) },
            { 
              $set: { 
                ...recommendations,
                updatedAt: new Date(),
                onboardingComplete: true
              }
            }
          );

          res.status(200).json({
            success: true,
            message: 'Onboarding completed successfully',
            data: {
              step: 3,
              onboardingComplete: true,
              recommendations
            }
          });

        } else {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid step. Use: basicInfo, vocabularyAssessment, or recommendations' 
          });
        }
        break;

      case 'GET':
        // Get onboarding progress
        const onboardingData = await onboardingCollection.findOne({ 
          userId: new db.ObjectId(userId) 
        });
        
        if (!onboardingData) {
          return res.status(200).json({
            success: true,
            data: {
              currentStep: 1,
              onboardingComplete: false,
              progress: {}
            }
          });
        }

        res.status(200).json({
          success: true,
          data: {
            currentStep: onboardingData.step || 1,
            onboardingComplete: onboardingData.onboardingComplete || false,
            progress: {
              basicInfo: onboardingData.age ? {
                age: onboardingData.age,
                gender: onboardingData.gender,
                topicsOfInterest: onboardingData.topicsOfInterest
              } : null,
              vocabularyAssessment: onboardingData.questionsAnswered ? {
                questionsAnswered: onboardingData.questionsAnswered,
                correctAnswers: onboardingData.correctAnswers,
                proficiencyLevel: onboardingData.proficiencyLevel,
                weakAreas: onboardingData.weakAreas,
                strongAreas: onboardingData.strongAreas
              } : null,
              recommendations: onboardingData.recommendedTopics ? {
                recommendedTopics: onboardingData.recommendedTopics,
                difficultyLevel: onboardingData.difficultyLevel,
                learningGoals: onboardingData.learningGoals,
                estimatedStudyTime: onboardingData.estimatedStudyTime
              } : null
            }
          }
        });
        break;

      case 'DELETE':
        // Reset onboarding data
        await onboardingCollection.deleteOne({ 
          userId: new db.ObjectId(userId) 
        });

        // Reset user level
        await usersCollection.updateOne(
          { _id: new db.ObjectId(userId) },
          { 
            $set: { 
              level: null,
              updatedAt: new Date()
            }
          }
        );

        res.status(200).json({
          success: true,
          message: 'Onboarding data reset successfully'
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Onboarding API Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    });
  }
}
