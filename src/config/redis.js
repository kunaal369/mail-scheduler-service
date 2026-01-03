const Redis = require('ioredis');
const config = require('./env');

let redisClient = null;

const createRedisClient = () => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true, // Don't connect immediately
    enableOfflineQueue: false, // Don't queue commands when offline
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connection established successfully.');
  });

  redisClient.on('error', (error) => {
    // Only log error if it's not a connection refused (Redis not running)
    if (error.code !== 'ECONNREFUSED') {
      console.error('❌ Redis connection error:', error.message);
    }
  });

  return redisClient;
};

const getRedisClient = async () => {
  const client = createRedisClient();
  
  // Try to connect if not already connected
  if (client.status !== 'ready' && client.status !== 'connecting') {
    try {
      await client.connect();
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          'Redis is not running. Please start Redis server or set REDIS_ENABLED=false in .env to disable Redis (email scheduling will not work).'
        );
      }
      throw error;
    }
  }
  
  return client;
};

module.exports = { getRedisClient, createRedisClient };

