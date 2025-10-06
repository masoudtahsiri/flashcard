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

// Google OAuth Configuration (to be set in environment variables)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

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

// Helper function to verify Google token
async function verifyGoogleToken(idToken) {
  try {
    // In production, you would verify the token with Google's API
    // For now, we'll return a mock response
    // You'll need to implement proper Google token verification
    
    // Mock response - replace with actual Google API call
    const mockUserInfo = {
      sub: 'google_user_id',
      email: 'user@example.com',
      name: 'Google User',
      picture: 'https://example.com/avatar.jpg'
    };
    
    return mockUserInfo;
  } catch (error) {
    console.error('Google token verification error:', error);
    return null;
  }
}

export default async function handler(req, res) {
  const { method } = req;

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection(USERS_COLLECTION_NAME);

    switch (method) {
      case 'GET':
        // Google OAuth callback - redirect URL
        const { code, state } = req.query;
        
        if (!code) {
          return res.status(400).json({ 
            success: false, 
            error: 'Authorization code is required' 
          });
        }

        // Exchange authorization code for access token
        // This is a simplified version - in production you'd make actual API calls
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: GOOGLE_REDIRECT_URI,
          }),
        });

        if (!tokenResponse.ok) {
          return res.status(400).json({ 
            success: false, 
            error: 'Failed to exchange authorization code' 
          });
        }

        const tokenData = await tokenResponse.json();
        const { access_token, id_token } = tokenData;

        // Verify the ID token and get user info
        const userInfo = await verifyGoogleToken(id_token);
        
        if (!userInfo) {
          return res.status(400).json({ 
            success: false, 
            error: 'Failed to verify Google token' 
          });
        }

        // Check if user exists
        let user = await usersCollection.findOne({ 
          googleId: userInfo.sub 
        });

        if (!user) {
          // Check if user exists with same email
          const existingUser = await usersCollection.findOne({ 
            email: userInfo.email.toLowerCase() 
          });
          
          if (existingUser) {
            // Link Google account to existing user
            await usersCollection.updateOne(
              { _id: existingUser._id },
              { $set: { googleId: userInfo.sub } }
            );
            user = existingUser;
          } else {
            // Create new user
            const newUser = {
              email: userInfo.email.toLowerCase(),
              name: userInfo.name,
              googleId: userInfo.sub,
              level: null,
              subscriptionStatus: 'free',
              password: null, // No password for social auth
              appleId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastLogin: new Date()
            };

            const result = await usersCollection.insertOne(newUser);
            user = { ...newUser, _id: result.insertedId };
          }
        } else {
          // Update last login
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
          );
        }

        // Generate JWT tokens
        const { accessToken, refreshToken } = generateTokens(user._id.toString());

        // Redirect to app with tokens (in production, you'd redirect to your app)
        res.status(200).json({
          success: true,
          message: 'Google authentication successful',
          user: {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            level: user.level,
            subscriptionStatus: user.subscriptionStatus
          },
          tokens: {
            accessToken,
            refreshToken
          }
        });
        break;

      case 'POST':
        // Direct Google authentication with ID token
        const { idToken } = req.body;
        
        if (!idToken) {
          return res.status(400).json({ 
            success: false, 
            error: 'Google ID token is required' 
          });
        }

        // Verify the ID token
        const userInfo = await verifyGoogleToken(idToken);
        
        if (!userInfo) {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid Google token' 
          });
        }

        // Check if user exists
        let user = await usersCollection.findOne({ 
          googleId: userInfo.sub 
        });

        if (!user) {
          // Check if user exists with same email
          const existingUser = await usersCollection.findOne({ 
            email: userInfo.email.toLowerCase() 
          });
          
          if (existingUser) {
            // Link Google account to existing user
            await usersCollection.updateOne(
              { _id: existingUser._id },
              { $set: { googleId: userInfo.sub } }
            );
            user = existingUser;
          } else {
            // Create new user
            const newUser = {
              email: userInfo.email.toLowerCase(),
              name: userInfo.name,
              googleId: userInfo.sub,
              level: null,
              subscriptionStatus: 'free',
              password: null,
              appleId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastLogin: new Date()
            };

            const result = await usersCollection.insertOne(newUser);
            user = { ...newUser, _id: result.insertedId };
          }
        } else {
          // Update last login
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
          );
        }

        // Generate JWT tokens
        const { accessToken, refreshToken } = generateTokens(user._id.toString());

        res.status(200).json({
          success: true,
          message: 'Google authentication successful',
          user: {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            level: user.level,
            subscriptionStatus: user.subscriptionStatus
          },
          tokens: {
            accessToken,
            refreshToken
          }
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Google Auth API Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    });
  }
}
