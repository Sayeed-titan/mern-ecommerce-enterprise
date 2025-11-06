const Redis = require('ioredis');

// Create Redis client with better error handling
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    // Stop retrying after 3 attempts
    if (times > 3) {
      console.log('⚠️  Redis connection failed. Running without cache.');
      return null;
    }
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true, // Don't connect immediately
  enableOfflineQueue: false, // Don't queue commands when offline
});

// Track connection status
let isRedisConnected = false;

// Try to connect
redis.connect().catch(() => {
  console.log('⚠️  Redis unavailable. Running without cache.');
  isRedisConnected = false;
});

// Redis event handlers
redis.on('connect', () => {
  console.log('✅ Redis Connected');
  isRedisConnected = true;
});

redis.on('error', (err) => {
  // Only log first error, not repeated attempts
  if (isRedisConnected) {
    console.error('❌ Redis Error:', err.message);
    isRedisConnected = false;
  }
});

redis.on('close', () => {
  isRedisConnected = false;
});

// Cache helper functions
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cachedData = await redis.get(key);
      
      if (cachedData) {
        console.log(`🎯 Cache HIT: ${key}`);
        return res.json(JSON.parse(cachedData));
      }

      // Store original res.json function
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = (data) => {
        redis.setex(key, duration, JSON.stringify(data));
        console.log(`💾 Cache SET: ${key} (${duration}s)`);
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Clear cache by pattern
const clearCache = async (pattern = '*') => {
  try {
    const keys = await redis.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️  Cleared ${keys.length} cache keys matching: ${pattern}`);
    }
  } catch (error) {
    console.error('Clear cache error:', error);
  }
};

// Get cached data
const getCache = async (key) => {
  try {
    const data = await redis.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Get cache error:', error);
    return null;
  }
};

// Set cached data
const setCache = async (key, data, duration = 300) => {
  try {
    await redis.setex(`cache:${key}`, duration, JSON.stringify(data));
    console.log(`💾 Cache SET: ${key} (${duration}s)`);
  } catch (error) {
    console.error('Set cache error:', error);
  }
};

// Increment counter (for analytics)
const incrementCounter = async (key, amount = 1) => {
  try {
    return await redis.incrby(key, amount);
  } catch (error) {
    console.error('Increment counter error:', error);
    return 0;
  }
};

// Get counter value
const getCounter = async (key) => {
  try {
    const value = await redis.get(key);
    return value ? parseInt(value) : 0;
  } catch (error) {
    console.error('Get counter error:', error);
    return 0;
  }
};

module.exports = {
  redis,
  cacheMiddleware,
  clearCache,
  getCache,
  setCache,
  incrementCounter,
  getCounter,
};