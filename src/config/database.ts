import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    console.log('Using existing database connection');
    return;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('Error: MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    const db = await mongoose.connect(uri);
    isConnected = db.connections[0].readyState === 1;
    console.log(`MongoDB connected: ${db.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
};
