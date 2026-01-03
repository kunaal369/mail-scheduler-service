const app = require('./app');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');
const config = require('./config/env');

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Sync database models (create tables if they don't exist)
    const Email = require('./modules/email/email.model');
    await Email.sync({ alter: config.nodeEnv === 'development' });

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`, {
        port: config.port,
        environment: config.nodeEnv,
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

