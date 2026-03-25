// config/redis.js - COMPLETE PRODUCTION-READY VERSION
const redis = require('redis');

let redisClient = null;
let isConnected = false;

/**
 * Create Redis client with retry strategy
 */
const createRedisClient = () => {
  const client = redis.createClient({
    url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
    password: process.env.REDIS_PASSWORD,
    socket: {
      reconnectStrategy: (retries) => {
        // Exponential backoff with max delay of 30 seconds
        const delay = Math.min(Math.pow(2, retries) * 1000, 30000);
        console.log(`🔄 Redis reconnect attempt ${retries} in ${delay}ms`);
        return delay;
      },
      connectTimeout: 10000,
      keepAlive: 5000,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    },
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  });

  // Event handlers
  client.on('connect', () => {
    console.log('📦 Redis: Connecting...');
  });

  client.on('ready', () => {
    isConnected = true;
    console.log('✅ Redis connected and ready');
  });

  client.on('error', (err) => {
    isConnected = false;
    console.error('❌ Redis error:', err.message);
  });

  client.on('end', () => {
    isConnected = false;
    console.log('📦 Redis connection closed');
  });

  client.on('reconnecting', () => {
    console.log('📦 Redis reconnecting...');
  });

  return client;
};

/**
 * Initialize Redis connection
 */
const connectRedis = async () => {
  try {
    // Skip Redis if explicitly disabled or not configured
    if (process.env.REDIS_DISABLED === 'true') {
      console.log('⚠️ Redis disabled by configuration, using in-memory fallback');
      return null;
    }

    if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
      console.log('⚠️ Redis not configured, using in-memory fallback');
      return null;
    }

    redisClient = createRedisClient();
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.log('⚠️ Using in-memory fallback');
    return null;
  }
};

/**
 * Get Redis client
 */
const getRedisClient = () => redisClient;

/**
 * Check Redis connection status
 */
const isRedisConnected = () => isConnected && redisClient?.isReady;

/**
 * Redis cache service with fallback
 */
class RedisCache {
  constructor() {
    this.memoryCache = new Map();
    this.fallbackMode = !isRedisConnected();
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (isRedisConnected()) {
      try {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.error('Redis get error:', error);
        this.fallbackMode = true;
        return this.memoryGet(key);
      }
    }
    return this.memoryGet(key);
  }

  /**
   * Memory cache get
   */
  memoryGet(key) {
    const data = this.memoryCache.get(key);
    if (data && data.expiry > Date.now()) {
      return data.value;
    }
    if (data) this.memoryCache.delete(key);
    return null;
  }

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttlSeconds = 3600) {
    if (isRedisConnected()) {
      try {
        await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('Redis set error:', error);
        this.fallbackMode = true;
        return this.memorySet(key, value, ttlSeconds);
      }
    }
    return this.memorySet(key, value, ttlSeconds);
  }

  /**
   * Memory cache set
   */
  memorySet(key, value, ttlSeconds) {
    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
    return true;
  }

  /**
   * Delete key from cache
   */
  async del(key) {
    if (isRedisConnected()) {
      try {
        await redisClient.del(key);
        return true;
      } catch (error) {
        console.error('Redis del error:', error);
        return false;
      }
    }
    return this.memoryCache.delete(key);
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern) {
    if (isRedisConnected()) {
      try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
        return keys.length;
      } catch (error) {
        console.error('Redis delPattern error:', error);
        return 0;
      }
    }
    // Memory cache pattern deletion
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    let deleted = 0;
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (isRedisConnected()) {
      try {
        return await redisClient.exists(key);
      } catch (error) {
        console.error('Redis exists error:', error);
        return false;
      }
    }
    const data = this.memoryCache.get(key);
    return !!(data && data.expiry > Date.now());
  }

  /**
   * Increment counter
   */
  async incr(key) {
    if (isRedisConnected()) {
      try {
        return await redisClient.incr(key);
      } catch (error) {
        console.error('Redis incr error:', error);
        return null;
      }
    }
    // Memory cache increment
    const current = (await this.get(key)) || 0;
    await this.set(key, current + 1);
    return current + 1;
  }

  /**
   * Set expiry on key
   */
  async expire(key, ttlSeconds) {
    if (isRedisConnected()) {
      try {
        return await redisClient.expire(key, ttlSeconds);
      } catch (error) {
        console.error('Redis expire error:', error);
        return false;
      }
    }
    // Memory cache update expiry
    const data = this.memoryCache.get(key);
    if (data) {
      data.expiry = Date.now() + ttlSeconds * 1000;
      this.memoryCache.set(key, data);
    }
    return true;
  }

  /**
   * Get TTL of key
   */
  async ttl(key) {
    if (isRedisConnected()) {
      try {
        return await redisClient.ttl(key);
      } catch (error) {
        console.error('Redis ttl error:', error);
        return -2;
      }
    }
    const data = this.memoryCache.get(key);
    if (!data) return -2;
    const ttl = Math.floor((data.expiry - Date.now()) / 1000);
    return ttl > 0 ? ttl : -1;
  }

  /**
   * Get multiple keys
   */
  async mget(keys) {
    if (isRedisConnected()) {
      try {
        const values = await redisClient.mGet(keys);
        return values.map((v) => (v ? JSON.parse(v) : null));
      } catch (error) {
        console.error('Redis mget error:', error);
        return keys.map((k) => this.memoryGet(k));
      }
    }
    return keys.map((k) => this.memoryGet(k));
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs, ttlSeconds = 3600) {
    if (isRedisConnected()) {
      try {
        const pipeline = redisClient.multi();
        for (const [key, value] of Object.entries(keyValuePairs)) {
          pipeline.setEx(key, ttlSeconds, JSON.stringify(value));
        }
        await pipeline.exec();
        return true;
      } catch (error) {
        console.error('Redis mset error:', error);
        // Fallback to individual sets
        for (const [key, value] of Object.entries(keyValuePairs)) {
          await this.set(key, value, ttlSeconds);
        }
        return true;
      }
    }
    for (const [key, value] of Object.entries(keyValuePairs)) {
      await this.memorySet(key, value, ttlSeconds);
    }
    return true;
  }

  /**
   * Get cache stats
   */
  async getStats() {
    if (isRedisConnected()) {
      try {
        const info = await redisClient.info();
        const memory = await redisClient.info('memory');
        const memoryMatch = memory.match(/used_memory_human:(.+)/);
        const usedMemory = memoryMatch ? memoryMatch[1].trim() : 'unknown';

        return {
          connected: true,
          mode: 'redis',
          usedMemory,
          totalKeys: await redisClient.dbSize(),
          uptime: await redisClient.info('server').then((i) => {
            const match = i.match(/uptime_in_seconds:(\d+)/);
            return match ? parseInt(match[1]) : 0;
          }),
        };
      } catch (error) {
        console.error('Redis stats error:', error);
        return {
          connected: false,
          mode: 'fallback',
          totalKeys: this.memoryCache.size,
        };
      }
    }
    return {
      connected: false,
      mode: 'memory-fallback',
      totalKeys: this.memoryCache.size,
    };
  }

  /**
   * Flush all cache
   */
  async flush() {
    if (isRedisConnected()) {
      try {
        await redisClient.flushDb();
        return true;
      } catch (error) {
        console.error('Redis flush error:', error);
        return false;
      }
    }
    this.memoryCache.clear();
    return true;
  }

  /**
   * Check if using Redis or fallback
   */
  isUsingRedis() {
    return isRedisConnected();
  }

  /**
   * Get Redis client for advanced operations
   */
  getClient() {
    return redisClient;
  }
}

// Create singleton instance
const cache = new RedisCache();

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisConnected,
  cache,
};