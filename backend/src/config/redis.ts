/**
 * In-Memory Cache Manager (Redis removed - 100% Pure MongoDB Stack)
 */
class MemoryCacheManager {
  private memoryCache = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;
    if (cached.expiresAt && Date.now() > cached.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return cached.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryCache.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.memoryCache.delete(key);
  }

  async publish(_channel: string, _message: string): Promise<void> {
    // No-op: Redis removed, direct MongoDB & SSE architecture
  }
}

export const redisClient = new MemoryCacheManager();
export const cacheClient = redisClient;
export default redisClient;

