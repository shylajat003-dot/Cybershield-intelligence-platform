import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env';

let mongoMemoryServer: MongoMemoryServer | null = null;
let isConnected = false;
let isInMemory = false;

export async function connectDB(): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const uri = env.MONGODB_URI;

  try {
    // Attempt connecting to live MongoDB URI with 3 second timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    });
    isConnected = true;
    isInMemory = false;
    console.log(`✅ Connected to MongoDB at ${uri}`);
    return mongoose;
  } catch (err: any) {
    console.warn(`⚠️ Standard MongoDB connection to ${uri} failed (${err.message}). Falling back to MongoMemoryServer...`);

    try {
      if (!mongoMemoryServer) {
        mongoMemoryServer = await MongoMemoryServer.create();
      }
      const memoryUri = mongoMemoryServer.getUri();
      await mongoose.connect(memoryUri);
      isConnected = true;
      isInMemory = true;
      console.log(`⚡ Connected to In-Memory MongoDB Engine at ${memoryUri}`);
      return mongoose;
    } catch (memErr: any) {
      console.error('❌ Failed to connect to MongoMemoryServer:', memErr);
      throw memErr;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }
}

export { isConnected, isInMemory };
export default connectDB;
