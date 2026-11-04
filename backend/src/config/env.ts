import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try loading .env from backend directory first, then root directory
const backendEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvPath = path.resolve(__dirname, '../../../.env');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

let rawMongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cybershield';
if (rawMongoUri.startsWith('mongodb+srv://') || rawMongoUri.startsWith('mongodb://')) {
  try {
    const parsed = new URL(rawMongoUri);
    const dbName = parsed.pathname.replace(/^\//, '');
    if (!dbName) {
      parsed.pathname = '/cybershield';
    }
    if (!parsed.search) {
      parsed.search = '?retryWrites=true&w=majority';
    }
    rawMongoUri = parsed.toString();
  } catch {
    // If URL parsing fails, keep original
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  MONGODB_URI: rawMongoUri,
  JWT: {
    SECRET: process.env.JWT_SECRET || 'cybershield_super_secret_jwt_key_2026_soc_prod',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h'
  }
};


