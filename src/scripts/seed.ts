import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User';

const SEED_USERS = [
  {
    name: 'Alex Johnson',
    email: 'alex@ajaia.dev',
  },
  {
    name: 'Priya Sharma',
    email: 'priya@ajaia.dev',
  },
  {
    name: 'Rahul Mehta',
    email: 'rahul@ajaia.dev',
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('Error: MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log(`Connected to MongoDB: ${mongoose.connection.host}`);

    console.log('Seeding users...');
    for (const userData of SEED_USERS) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`Created user: ${userData.email}`);
      } else {
        console.log(`User already exists: ${userData.email}`);
      }
    }

    console.log('Seed completed successfully.');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seed();
