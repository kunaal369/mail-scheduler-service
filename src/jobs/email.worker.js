const { Worker } = require('bullmq');
const { getRedisClient } = require('../config/redis');
const config = require('../config/env');
const { processEmail } = require('../modules/email/email.processor');
const logger = require('../utils/logger');

let worker = null;

const startWorker = async () => {
  if (!config.redis.enabled) {
    logger.info('Redis is disabled. Using in-memory scheduler.');
    logger.info('Email processing happens automatically via in-memory scheduler - no separate worker needed.');
    logger.info('To use Redis/BullMQ worker, set REDIS_ENABLED=true in .env and ensure Redis is running.');
    return null;
  }

  try {
    const redisClient = await getRedisClient();
    worker = new Worker(
      'email-queue',
      async (job) => {
        const { emailId } = job.data;
        logger.info(`Processing email job: ${emailId}`, { emailId, jobId: job.id });

        try {
          await processEmail(emailId);
          return { success: true, emailId };
        } catch (error) {
          logger.error(`Error processing email job: ${emailId}`, {
            emailId,
            error: error.message,
            stack: error.stack,
          });
          throw error;
        }
      },
      {
        connection: redisClient,
        concurrency: 5, // Process up to 5 emails concurrently
      }
    );

    worker.on('completed', (job) => {
      logger.info(`Email job completed: ${job.id}`, { jobId: job.id, emailId: job.data.emailId });
    });

    worker.on('failed', (job, err) => {
      logger.error(`Email job failed: ${job?.id}`, {
        jobId: job?.id,
        emailId: job?.data?.emailId,
        error: err.message,
      });
    });

    worker.on('error', (err) => {
      logger.error('Worker error:', err);
    });

    logger.info('✅ Email worker started and listening for jobs...');
    return worker;
  } catch (error) {
    logger.error('Failed to start email worker:', error.message);
    logger.error('Please ensure Redis is running or set REDIS_ENABLED=false in .env');
    process.exit(1);
  }
};

// Start worker if this file is run directly
if (require.main === module) {
  startWorker().catch((error) => {
    logger.error('Fatal error starting worker:', error);
    process.exit(1);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down worker gracefully...');
  if (worker) {
    await worker.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down worker gracefully...');
  if (worker) {
    await worker.close();
  }
  process.exit(0);
});

module.exports = { startWorker, worker };
