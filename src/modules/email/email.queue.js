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

/**
 * Reschedule an existing email job to a new time
 * Updates the existing job instead of deleting and recreating it
 * @param {string} jobId - The existing job ID (should match emailId)
 * @param {string|Date} newScheduledAt - New scheduled time
 * @returns {string} The job ID (same as input, preserved)
 */
const rescheduleEmailJob = async (jobId, newScheduledAt) => {
  try {
    if (!config.redis.enabled) {
      // Reschedule in-memory job (preserves jobId)
      logger.info(`Rescheduling in-memory job: ${jobId}`, {
        jobId,
        newScheduledAt,
      });

      const { processEmail } = getEmailProcessor();
      // Use reschedule method which preserves jobId
      inMemoryScheduler.reschedule(
        jobId,
        newScheduledAt,
        async () => {
          await processEmail(jobId);
        },
        { emailId: jobId }
      );

      return jobId;
    }

    // Reschedule BullMQ job
    const queue = await getEmailQueue();
    const newDelay = new Date(newScheduledAt).getTime() - Date.now();

    if (newDelay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    // Get existing job
    const existingJob = await queue.getJob(jobId);

    if (!existingJob) {
      // Job doesn't exist, create new one with the jobId
      logger.warn(`Job ${jobId} not found in queue, creating new job`, { jobId });
      const newJob = await queue.add(
        'send-email',
        { emailId: jobId },
        {
          delay: newDelay,
          jobId: jobId,
        }
      );
      return newJob.id;
    }

    // Check job state - can't reschedule if already completed or active
    const state = await existingJob.getState();

    if (state === 'completed') {
      throw new Error('Cannot reschedule a job that has already been completed');
    }

    if (state === 'active') {
      throw new Error('Cannot reschedule a job that is currently being processed');
    }

    // For BullMQ, we need to remove and re-add with same jobId to effectively reschedule
    // This preserves the jobId while updating the delay
    // Note: BullMQ doesn't support changing delay on existing jobs directly
    await existingJob.remove();

    // Add new job with same jobId and new delay
    // This preserves jobId while updating execution time
    const rescheduledJob = await queue.add(
      'send-email',
      { emailId: jobId },
      {
        delay: newDelay,
        jobId: jobId, // Preserve the same jobId
      }
    );

    logger.info(`Job rescheduled successfully: ${jobId}`, {
      jobId,
      newScheduledAt,
      newDelay,
      previousState: state,
    });

    return rescheduledJob.id; // Should be same as jobId
  } catch (error) {
    logger.error('Failed to reschedule email job:', {
      jobId,
      error: error.message,
    });
    throw error;
  }
};

module.exports = { getEmailQueue, addEmailJob, removeEmailJob, rescheduleEmailJob };

