const logger = require('./logger');

/**
 * In-memory job scheduler as an alternative to Redis/BullMQ
 * This allows the application to work without Redis for development/testing
 */
class InMemoryScheduler {
  constructor() {
    this.jobs = new Map(); // Map of jobId -> { timeout, jobData, callback }
    this.isRunning = false;
  }

  /**
   * Schedule a job to run at a specific time
   * @param {string} jobId - Unique job identifier
   * @param {Date|string} scheduledAt - When to execute the job
   * @param {Function} callback - Function to execute when job runs
   * @param {Object} jobData - Data to pass to the callback
   * @returns {string} jobId
   */
  schedule(jobId, scheduledAt, callback, jobData = {}) {
    // Cancel existing job if it exists
    this.cancel(jobId);

    const scheduledTime = new Date(scheduledAt).getTime();
    const now = Date.now();
    const delay = scheduledTime - now;

    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    logger.info(`Scheduling in-memory job: ${jobId}`, {
      jobId,
      scheduledAt: new Date(scheduledAt).toISOString(),
      delayMs: delay,
    });

    const timeout = setTimeout(() => {
      logger.info(`Executing in-memory job: ${jobId}`, { jobId });
      try {
        callback(jobData);
      } catch (error) {
        logger.error(`Error executing in-memory job: ${jobId}`, {
          jobId,
          error: error.message,
        });
      }
      this.jobs.delete(jobId);
    }, delay);

    this.jobs.set(jobId, {
      timeout,
      jobData,
      callback,
      scheduledAt: new Date(scheduledAt),
    });

    return jobId;
  }

  /**
   * Cancel a scheduled job
   * @param {string} jobId - Job identifier to cancel
   */
  cancel(jobId) {
    const job = this.jobs.get(jobId);
    if (job) {
      clearTimeout(job.timeout);
      this.jobs.delete(jobId);
      logger.info(`Cancelled in-memory job: ${jobId}`, { jobId });
      return true;
    }
    return false;
  }

  /**
   * Reschedule an existing job to a new time
   * Updates the existing job instead of cancelling and creating new one
   * @param {string} jobId - Job identifier to reschedule
   * @param {Date|string} newScheduledAt - New scheduled time
   * @param {Function} callback - Function to execute (can be same or new)
   * @param {Object} jobData - Data to pass to callback
   * @returns {string} jobId (same as input, preserved)
   */
  reschedule(jobId, newScheduledAt, callback, jobData = {}) {
    // Cancel existing job if it exists
    this.cancel(jobId);

    // Schedule with new time (same jobId) - preserves jobId
    return this.schedule(jobId, newScheduledAt, callback, jobData);
  }

  /**
   * Get all scheduled jobs
   * @returns {Array} Array of job information
   */
  getJobs() {
    return Array.from(this.jobs.entries()).map(([jobId, job]) => ({
      jobId,
      scheduledAt: job.scheduledAt,
      jobData: job.jobData,
    }));
  }

  /**
   * Clear all scheduled jobs
   */
  clear() {
    this.jobs.forEach((job, jobId) => {
      clearTimeout(job.timeout);
    });
    this.jobs.clear();
    logger.info('Cleared all in-memory jobs');
  }

  /**
   * Get the number of scheduled jobs
   * @returns {number}
   */
  size() {
    return this.jobs.size;
  }
}

// Singleton instance
const scheduler = new InMemoryScheduler();

module.exports = scheduler;

