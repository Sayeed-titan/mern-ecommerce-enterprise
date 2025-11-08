const Redis = require('ioredis');

let redis = null;
let redisAvailable = false;

console.log('🔍 Connecting to Redis...');
console.log('Host:', process.env.REDIS_HOST || 'localhost');
console.log('Port:', process.env.REDIS_PORT || 6379);

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      if (times > 3) {
        console.log('❌ Redis: Max retries reached');
        return null;
      }
      console.log(`🔄 Redis: Retry attempt ${times}/3`);
      return Math.min(times * 500, 2000);
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  redis.on('connect', () => {
    redisAvailable = true;
    console.log('✅ Redis: Connected');
  });

  redis.on('ready', () => {
    redisAvailable = true;
    console.log('✅ Redis: Ready');
  });

  redis.on('error', (err) => {
    redisAvailable = false;
    console.log('❌ Redis Error:', err.message);
  });

  redis.on('close', () => {
    redisAvailable = false;
    console.log('⚠️  Redis: Connection closed');
  });

  // Connect
  redis.connect()
    .then(() => {
      console.log('✅ Redis: Connection established');
      return redis.ping();
    })
    .then((result) => {
      console.log('✅ Redis: PING successful ->', result);
      redisAvailable = true;
    })
    .catch((error) => {
      console.log('❌ Redis: Failed to connect ->', error.message);
      redisAvailable = false;
    });
    
} catch (error) {
  console.log('❌ Redis: Initialization error ->', error.message);
  redisAvailable = false;
}

// Cache middleware
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    if (!redisAvailable || req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cachedData = await redis.get(key);
      
      if (cachedData) {
        console.log(`🎯 Cache HIT: ${key}`);
        return res.json(JSON.parse(cachedData));
      }

      const originalJson = res.json.bind(res);

      res.json = (data) => {
        if (redisAvailable) {
          redis.setex(key, duration, JSON.stringify(data))
            .catch(() => {});
          console.log(`💾 Cache SET: ${key} (${duration}s)`);
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache error:', error.message);
      next();
    }
  };
};

// Clear cache
const clearCache = async (pattern = '*') => {
  if (!redisAvailable) return;
  
  try {
    const keys = await redis.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️  Cleared ${keys.length} cache keys`);
    }
  } catch (error) {
    console.error('Clear cache error:', error.message);
  }
};

// Get cached data
const getCache = async (key) => {
  if (!redisAvailable) return null;
  
  try {
    const data = await redis.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
};

// Set cached data
const setCache = async (key, data, duration = 300) => {
  if (!redisAvailable) return;
  
  try {
    await redis.setex(`cache:${key}`, duration, JSON.stringify(data));
  } catch (error) {
    console.error('Set cache error:', error.message);
  }
};

// Increment counter
const incrementCounter = async (key, amount = 1) => {
  if (!redisAvailable) return 0;
  
  try {
    return await redis.incrby(key, amount);
  } catch (error) {
    return 0;
  }
};

// Get counter
const getCounter = async (key) => {
  if (!redisAvailable) return 0;
  
  try {
    const value = await redis.get(key);
    return value ? parseInt(value) : 0;
  } catch (error) {
    return 0;
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (redis && redisAvailable) {
    await redis.quit();
  }
});

module.exports = {
  redis,
  cacheMiddleware,
  clearCache,
  getCache,
  setCache,
  incrementCounter,
  getCounter,
};