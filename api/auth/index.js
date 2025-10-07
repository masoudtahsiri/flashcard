import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
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

// Helper function to verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Helper function to validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate password
function isValidPassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
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

    switch (method) {
      case 'POST':
        const { action, email, password, name } = req.body;
        
        if (action === 'register') {
          // User Registration
          if (!email || !password || !name) {
            return res.status(400).json({ 
              success: false, 
              error: 'Email, password, and name are required' 
            });
          }

          if (!isValidEmail(email)) {
            return res.status(400).json({ 
              success: false, 
              error: 'Invalid email format' 
            });
          }

          if (!isValidPassword(password)) {
            return res.status(400).json({ 
              success: false, 
              error: 'Password must be at least 8 characters with uppercase, lowercase, and number' 
            });
          }

          // Check if user already exists
          const existingUser = await usersCollection.findOne({ 
            email: email.toLowerCase() 
          });
          
          if (existingUser) {
            return res.status(400).json({ 
              success: false, 
              error: 'User with this email already exists' 
            });
          }

          // Hash password
          const saltRounds = 12;
          const hashedPassword = await bcrypt.hash(password, saltRounds);

          // Create user
          const newUser = {
            email: email.toLowerCase(),
            password: hashedPassword,
            name: name.trim(),
            level: null, // Will be set after assessment
            subscriptionStatus: 'free',
            googleId: null,
            appleId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLogin: null
          };

          const result = await usersCollection.insertOne(newUser);
          const userId = result.insertedId.toString();

          // Generate tokens
          const { accessToken, refreshToken } = generateTokens(userId);

          // Update last login
          await usersCollection.updateOne(
            { _id: result.insertedId },
            { $set: { lastLogin: new Date() } }
          );

          res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
              id: userId,
              email: newUser.email,
              name: newUser.name,
              level: newUser.level,
              subscriptionStatus: newUser.subscriptionStatus
            },
            tokens: {
              accessToken,
              refreshToken
            }
          });

        } else if (action === 'login') {
          // User Login
          if (!email || !password) {
            return res.status(400).json({ 
              success: false, 
              error: 'Email and password are required' 
            });
          }

          // Find user
          const user = await usersCollection.findOne({ 
            email: email.toLowerCase() 
          });
          
          if (!user) {
            return res.status(401).json({ 
              success: false, 
              error: 'Invalid email or password' 
            });
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(password, user.password);
          
          if (!isValidPassword) {
            return res.status(401).json({ 
              success: false, 
              error: 'Invalid email or password' 
            });
          }

          // Generate tokens
          const { accessToken, refreshToken } = generateTokens(user._id.toString());

          // Update last login
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
          );

          res.status(200).json({
            success: true,
            message: 'Login successful',
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

        } else if (action === 'refresh') {
          // Token Refresh
          const { refreshToken } = req.body;
          
          if (!refreshToken) {
            return res.status(400).json({ 
              success: false, 
              error: 'Refresh token is required' 
            });
          }

          const decoded = verifyToken(refreshToken);
          
          if (!decoded || decoded.type !== 'refresh') {
            return res.status(401).json({ 
              success: false, 
              error: 'Invalid refresh token' 
            });
          }

          // Generate new tokens
          const { accessToken, newRefreshToken } = generateTokens(decoded.userId);

          res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            tokens: {
              accessToken,
              refreshToken: newRefreshToken
            }
          });

        } else {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid action. Use: register, login, or refresh' 
          });
        }
        break;

      case 'GET':
        // Verify token and get user profile
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

        // Get user profile
        const user = await usersCollection.findOne({ 
          _id: new ObjectId(decoded.userId) 
        });
        
        if (!user) {
          return res.status(404).json({ 
            success: false, 
            error: 'User not found' 
          });
        }

        res.status(200).json({
          success: true,
          user: {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            level: user.level,
            subscriptionStatus: user.subscriptionStatus,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
          }
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Auth API Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    });
  }
}
