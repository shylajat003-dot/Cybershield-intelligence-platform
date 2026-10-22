import mongoose from 'mongoose';
import { env } from './env';

let mongoServer: any = null;

export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const uri = env.MONGODB_URI;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err: any) {
    console.warn(`MongoDB Atlas connection failed: ${err.message}`);
    console.log('Falling back to in-memory MongoDB (mongodb-memory-server)...');

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const memUri = mongoServer.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`MongoDB In-Memory Connected: ${conn.connection.host}`);
      return conn;
    } catch (memErr: any) {
      console.error(`In-memory MongoDB also failed: ${memErr.message}`);
      throw memErr;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

export default connectDB;
