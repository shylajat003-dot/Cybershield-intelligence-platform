import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/cybershield',
  REDIS: {
    HOST: process.env.REDIS_HOST || 'localhost',
    PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    URL: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  JWT: {
    SECRET: process.env.JWT_SECRET || 'cybershield_super_secret_jwt_key_2026_soc_prod',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h'
  }
};
