const emailService = require('./email.service');
const { sendEmail } = require('../../config/sendgrid');
const logger = require('../../utils/logger');

/**
 * Process an email job - sends the email and updates status
 * This is separated from email.queue.js to avoid circular dependencies
 */
const processEmail = async (emailId) => {
  logger.info(`Processing email job: ${emailId}`, { emailId });

  try {
    const email = await emailService.getEmailById(emailId);

    // Only process if still pending
    if (email.status !== 'PENDING') {
      logger.info(`Email ${emailId} is no longer pending, skipping`, {
        emailId,
        status: email.status,
      });
      return;
    }

    // Send email via SendGrid
    const result = await sendEmail({
      to: email.to,
      subject: email.subject,
      body: email.body,
    });

    if (result.success) {
      await emailService.markEmailAsSent(emailId);
      logger.info(`Email sent successfully: ${emailId}`, { emailId });
    } else {
      const failureReason = result.error || 'Unknown error';
      await emailService.markEmailAsFailed(emailId, failureReason);
      logger.error(`Email sending failed: ${emailId}`, {
        emailId,
        error: failureReason,
      });
    }
  } catch (error) {
    logger.error(`Error processing email job: ${emailId}`, {
      emailId,
      error: error.message,
    });

    try {
      await emailService.markEmailAsFailed(emailId, error.message);
    } catch (markError) {
      logger.error(`Error marking email as failed: ${emailId}`, markError);
    }
  }
};

module.exports = { processEmail };

