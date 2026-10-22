import Redis from 'ioredis';
import { env } from './env';

class RedisManager {
  private client: Redis | null = null;
  private isConnected = false;
  private memoryCache = new Map<string, { value: string; expiresAt?: number }>();

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.client = new Redis({
        host: env.REDIS.HOST,
        port: env.REDIS.PORT,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });

      this.client.connect().then(() => {
        this.isConnected = true;
        console.log('✅ Connected to Redis');
      }).catch((err) => {
        console.warn('⚠️ Redis connection failed, using in-memory caching fallback:', err.message);
        this.isConnected = false;
      });

      this.client.on('error', (err) => {
        if (this.isConnected) {
          console.warn('⚠️ Redis error:', err.message);
          this.isConnected = false;
        }
      });
    } catch (err: any) {
      console.warn('⚠️ Redis init error, using in-memory fallback:', err?.message);
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch {
        // Fallback to memory
      }
    }
    const cached = this.memoryCache.get(key);
    if (!cached) return null;
    if (cached.expiresAt && Date.now() > cached.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return cached.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch {
        // Fallback to memory
      }
    }
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryCache.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch {
        // Fallback
      }
    }
    this.memoryCache.delete(key);
  }

  async publish(channel: string, message: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.publish(channel, message);
      } catch {
        // Ignored fallback
      }
    }
  }
}

export const redisClient = new RedisManager();
export default redisClient;
