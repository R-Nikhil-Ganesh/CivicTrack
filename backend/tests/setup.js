import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Issue from '../models/Issue.js';

const TEST_DB_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/civictrack_test';
const JWT_SECRET = process.env.JWT_SECRET || 'civictrack_production_jwt_secret_key_2026_secured';

export const connectTestDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_DB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
  }
};

export const clearTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
};

export const disconnectTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
};

export const generateTestToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1d' });
};

export const createTestUser = async (overrides = {}) => {
  const unique = Date.now() + Math.floor(Math.random() * 100000);
  const userData = {
    name: 'Test Citizen',
    email: `citizen_${unique}@civictrack.org`,
    password: 'password123',
    role: 'citizen',
    department: 'None',
    phone: '9876543210',
    ...overrides,
  };
  const user = await User.create(userData);
  const token = generateTestToken(user._id);
  return { user, token };
};

export const createTestIssue = async (userId, overrides = {}) => {
  const issueData = {
    title: 'Severe road crater on 5th cross',
    description: 'Deep pothole causing recurring vehicle tire punctures',
    category: 'Roads',
    location: {
      address: '5th Cross, Indiranagar, Bengaluru',
      latitude: 12.9716,
      longitude: 77.5946,
    },
    reportedBy: userId,
    status: 'Pending',
    priority: 'High',
    ...overrides,
  };
  return await Issue.create(issueData);
};
