const { Queue } = require('bullmq');
const { getRedisClient } = require('../../config/redis');
const config = require('../../config/env');
const { JOB_RETRY } = require('../../utils/constants');
const logger = require('../../utils/logger');
const inMemoryScheduler = require('../../utils/inMemoryScheduler');
// Use lazy import to avoid circular dependency
const getEmailProcessor = () => require('./email.processor');

let emailQueue = null;

const getEmailQueue = async () => {
  if (!config.redis.enabled) {
    logger.info('Using in-memory scheduler (Redis disabled)');
    return null; // Return null to indicate in-memory mode
  }

  if (!emailQueue) {
    try {
      const redisClient = await getRedisClient();
      emailQueue = new Queue('email-queue', {
        connection: redisClient,
        defaultJobOptions: {
          attempts: JOB_RETRY.ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: JOB_RETRY.DELAY,
          },
          removeOnComplete: {
            age: 3600,
            count: 1000,
          },
          removeOnFail: {
            age: 86400,
          },
        },
      });
      logger.info('Using BullMQ with Redis for email scheduling');
    } catch (error) {
      logger.error('Failed to create email queue:', error.message);
      throw new Error(
        `Redis connection failed: ${error.message}. Please ensure Redis is running or set REDIS_ENABLED=false in .env`
      );
    }
  }

  return emailQueue;
};

const addEmailJob = async (emailId, scheduledAt) => {
  try {
    if (!config.redis.enabled) {
      // Use in-memory scheduler
      logger.info(`Scheduling email with in-memory scheduler: ${emailId}`, {
        emailId,
        scheduledAt,
      });

      // Lazy load processor to avoid circular dependency
      const { processEmail } = getEmailProcessor();
      
      inMemoryScheduler.schedule(
        emailId,
        scheduledAt,
        async () => {
          await processEmail(emailId);
        },
        { emailId }
      );

      return emailId;
    }

    // Use BullMQ with Redis
    const queue = await getEmailQueue();
    const delay = new Date(scheduledAt).getTime() - Date.now();

    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    const job = await queue.add(
      'send-email',
      { emailId },
      {
        delay,
        jobId: emailId,
      }
    );

    return job.id;
  } catch (error) {
    logger.error('Failed to add email job:', error);
    throw error;
  }
};

const removeEmailJob = async (jobId) => {
  try {
    if (!config.redis.enabled) {
      // Cancel in-memory job
      inMemoryScheduler.cancel(jobId);
      return;
    }

    // Remove BullMQ job
    if (emailQueue) {
      const job = await emailQueue.getJob(jobId);
      if (job) {
        await job.remove();
      }
    }
  } catch (error) {
    logger.error('Failed to remove email job:', error);
    // Don't throw - this is a cleanup operation
  }
};

module.exports = { getEmailQueue, addEmailJob, removeEmailJob };

