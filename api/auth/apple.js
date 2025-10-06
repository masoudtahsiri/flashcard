import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';

// Load environment variables for local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'flashcard';
const USERS_COLLECTION_NAME = 'users';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '1h';
const JWT_REFRESH_EXPIRES_IN = '7d';

// Apple Sign-In Configuration (to be set in environment variables)
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY;

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

// Helper function to generate JWT tokens
function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
  
  return { accessToken, refreshToken };
}

// Helper function to verify Apple identity token
async function verifyAppleToken(identityToken) {
  try {
    // In production, you would verify the token with Apple's API
    // For now, we'll return a mock response
    // You'll need to implement proper Apple token verification
    
    // Mock response - replace with actual Apple API call
    const mockUserInfo = {
      sub: 'apple_user_id',
      email: 'user@privaterelay.appleid.com',
      name: 'Apple User'
    };
    
    return mockUserInfo;
  } catch (error) {
    console.error('Apple token verification error:', error);
    return null;
  }
}

export default async function handler(req, res) {
  const { method } = req;

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection(USERS_COLLECTION_NAME);

    switch (method) {
      case 'POST':
        const { identityToken, authorizationCode, user } = req.body;
        
        if (!identityToken) {
          return res.status(400).json({ 
            success: false, 
            error: 'Apple identity token is required' 
          });
        }

        // Verify the identity token
        const userInfo = await verifyAppleToken(identityToken);
        
        if (!userInfo) {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid Apple token' 
          });
        }

        // Check if user exists
        let existingUser = await usersCollection.findOne({ 
          appleId: userInfo.sub 
        });

        if (!existingUser) {
          // Check if user exists with same email (if email is provided)
          if (userInfo.email) {
            existingUser = await usersCollection.findOne({ 
              email: userInfo.email.toLowerCase() 
            });
            
            if (existingUser) {
              // Link Apple account to existing user
              await usersCollection.updateOne(
                { _id: existingUser._id },
                { $set: { appleId: userInfo.sub } }
              );
            }
          }
        }

        if (!existingUser) {
          // Create new user
          const newUser = {
            email: userInfo.email ? userInfo.email.toLowerCase() : null,
            name: user?.name || userInfo.name || 'Apple User',
            appleId: userInfo.sub,
            level: null,
            subscriptionStatus: 'free',
            password: null, // No password for social auth
            googleId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLogin: new Date()
          };

          const result = await usersCollection.insertOne(newUser);
          existingUser = { ...newUser, _id: result.insertedId };
        } else {
          // Update last login
          await usersCollection.updateOne(
            { _id: existingUser._id },
            { $set: { lastLogin: new Date() } }
          );
        }

        // Generate JWT tokens
        const { accessToken, refreshToken } = generateTokens(existingUser._id.toString());

        res.status(200).json({
          success: true,
          message: 'Apple authentication successful',
          user: {
            id: existingUser._id.toString(),
            email: existingUser.email,
            name: existingUser.name,
            level: existingUser.level,
            subscriptionStatus: existingUser.subscriptionStatus
          },
          tokens: {
            accessToken,
            refreshToken
          }
        });
        break;

      default:
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Apple Auth API Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    });
  }
}
