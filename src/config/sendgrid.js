const sgMail = require('@sendgrid/mail');
const config = require('./env');

if (config.sendgrid.apiKey) {
  sgMail.setApiKey(config.sendgrid.apiKey);
}

const sendEmail = async ({ to, subject, body }) => {
  try {
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
      subject,
      text: body,
      html: body,
    };

    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.response?.body?.errors?.[0]?.message || error.message,
    };
  }
};

module.exports = { sendEmail };

