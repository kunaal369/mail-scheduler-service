require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'mail_scheduler',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    enabled: process.env.REDIS_ENABLED !== 'false', // Default to true, can be disabled
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};

