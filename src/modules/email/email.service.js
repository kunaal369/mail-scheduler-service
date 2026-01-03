const Email = require('./email.model');
const { addEmailJob, removeEmailJob } = require('./email.queue');
const { EMAIL_STATUS, PAGINATION } = require('../../utils/constants');
const logger = require('../../utils/logger');

const createEmail = async (emailData) => {
  try {
    const email = await Email.create(emailData);

    // Add job to queue
    const jobId = await addEmailJob(email.id, email.scheduledAt);
    await email.update({ jobId });

    logger.info(`Email scheduled: ${email.id}`, { emailId: email.id, jobId });
    return email;
  } catch (error) {
    logger.error('Error creating email:', error);
    throw error;
  }
};

const getEmailById = async (id) => {
  try {
    const email = await Email.findByPk(id);
    if (!email) {
      const error = new Error('Email not found');
      error.statusCode = 404;
      throw error;
    }
    return email;
  } catch (error) {
    logger.error('Error getting email:', error);
    throw error;
  }
};

const getAllEmails = async (page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT) => {
  try {
    const offset = (page - 1) * limit;
    const actualLimit = Math.min(limit, PAGINATION.MAX_LIMIT);

    const { count, rows } = await Email.findAndCountAll({
      limit: actualLimit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      emails: rows,
      pagination: {
        page,
        limit: actualLimit,
        total: count,
        totalPages: Math.ceil(count / actualLimit),
      },
    };
  } catch (error) {
    logger.error('Error getting emails:', error);
    throw error;
  }
};

const updateEmail = async (id, updateData) => {
  try {
    const email = await Email.findByPk(id);
    if (!email) {
      const error = new Error('Email not found');
      error.statusCode = 404;
      throw error;
    }

    // If email is already sent, don't allow updates
    if (email.status === EMAIL_STATUS.SENT) {
      const error = new Error('Cannot update email that has already been sent');
      error.statusCode = 400;
      throw error;
    }

    // If scheduledAt is being updated, reschedule the job
    if (updateData.scheduledAt && updateData.scheduledAt !== email.scheduledAt) {
      // Remove old job if exists
      if (email.jobId) {
        await removeEmailJob(email.jobId);
      }

      // Add new job with new scheduled time
      const newJobId = await addEmailJob(id, updateData.scheduledAt);
      updateData.jobId = newJobId;
    }

    await email.update(updateData);
    logger.info(`Email updated: ${id}`, { emailId: id });
    return email;
  } catch (error) {
    logger.error('Error updating email:', error);
    throw error;
  }
};

const deleteEmail = async (id) => {
  try {
    const email = await Email.findByPk(id);
    if (!email) {
      const error = new Error('Email not found');
      error.statusCode = 404;
      throw error;
    }

    // Remove job from queue if exists
    if (email.jobId) {
      await removeEmailJob(email.jobId);
    }

    await email.destroy();
    logger.info(`Email deleted: ${id}`, { emailId: id });
    return true;
  } catch (error) {
    logger.error('Error deleting email:', error);
    throw error;
  }
};

const getFailedEmails = async (page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT) => {
  try {
    const offset = (page - 1) * limit;
    const actualLimit = Math.min(limit, PAGINATION.MAX_LIMIT);

    const { count, rows } = await Email.findAndCountAll({
      where: {
        status: EMAIL_STATUS.FAILED,
      },
      limit: actualLimit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      emails: rows,
      pagination: {
        page,
        limit: actualLimit,
        total: count,
        totalPages: Math.ceil(count / actualLimit),
      },
    };
  } catch (error) {
    logger.error('Error getting failed emails:', error);
    throw error;
  }
};

const markEmailAsSent = async (id) => {
  try {
    const email = await Email.findByPk(id);
    if (email) {
      await email.update({
        status: EMAIL_STATUS.SENT,
        failureReason: null,
      });
      logger.info(`Email marked as sent: ${id}`, { emailId: id });
    }
  } catch (error) {
    logger.error('Error marking email as sent:', error);
    throw error;
  }
};

const markEmailAsFailed = async (id, failureReason) => {
  try {
    const email = await Email.findByPk(id);
    if (email) {
      await email.update({
        status: EMAIL_STATUS.FAILED,
        failureReason,
      });
      logger.error(`Email marked as failed: ${id}`, { emailId: id, failureReason });
    }
  } catch (error) {
    logger.error('Error marking email as failed:', error);
    throw error;
  }
};

module.exports = {
  createEmail,
  getEmailById,
  getAllEmails,
  updateEmail,
  deleteEmail,
  getFailedEmails,
  markEmailAsSent,
  markEmailAsFailed,
};

