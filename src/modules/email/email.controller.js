const emailService = require('./email.service');
const { successResponse, errorResponse } = require('../../utils/response');
const logger = require('../../utils/logger');

const createEmail = async (req, res, next) => {
  try {
    const email = await emailService.createEmail(req.validatedData);
    return successResponse(res, 201, 'Email scheduled successfully', email);
  } catch (error) {
    next(error);
  }
};

const getEmailById = async (req, res, next) => {
  try {
    const email = await emailService.getEmailById(req.params.id);
    return successResponse(res, 200, 'Email retrieved successfully', email);
  } catch (error) {
    next(error);
  }
};

const getAllEmails = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await emailService.getAllEmails(page, limit);
    return successResponse(res, 200, 'Emails retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

const updateEmail = async (req, res, next) => {
  try {
    const email = await emailService.updateEmail(req.params.id, req.validatedData);
    return successResponse(res, 200, 'Email updated successfully', email);
  } catch (error) {
    next(error);
  }
};

const deleteEmail = async (req, res, next) => {
  try {
    await emailService.deleteEmail(req.params.id);
    return successResponse(res, 200, 'Email deleted successfully');
  } catch (error) {
    next(error);
  }
};

const getFailedEmails = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await emailService.getFailedEmails(page, limit);
    return successResponse(res, 200, 'Failed emails retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEmail,
  getEmailById,
  getAllEmails,
  updateEmail,
  deleteEmail,
  getFailedEmails,
};

