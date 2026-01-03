const Joi = require('joi');

const createEmailSchema = Joi.object({
  to: Joi.string().email().required().messages({
    'string.email': 'Invalid email address',
    'any.required': 'Email address is required',
  }),
  subject: Joi.string().min(1).max(500).required().messages({
    'string.min': 'Subject must be at least 1 character',
    'string.max': 'Subject must not exceed 500 characters',
    'any.required': 'Subject is required',
  }),
  body: Joi.string().min(1).required().messages({
    'string.min': 'Body must be at least 1 character',
    'any.required': 'Body is required',
  }),
  scheduledAt: Joi.date()
    .iso()
    .required()
    .custom((value, helpers) => {
      if (new Date(value) <= new Date()) {
        return helpers.message('Scheduled date must be in the future');
      }
      return value;
    })
    .messages({
      'date.base': 'Invalid date format',
      'any.required': 'Scheduled date is required',
    }),
});

const updateEmailSchema = Joi.object({
  to: Joi.string().email().optional().messages({
    'string.email': 'Invalid email address',
  }),
  subject: Joi.string().min(1).max(500).optional().messages({
    'string.min': 'Subject must be at least 1 character',
    'string.max': 'Subject must not exceed 500 characters',
  }),
  body: Joi.string().min(1).optional().messages({
    'string.min': 'Body must be at least 1 character',
  }),
  scheduledAt: Joi.date()
    .iso()
    .optional()
    .custom((value, helpers) => {
      if (value && new Date(value) <= new Date()) {
        return helpers.message('Scheduled date must be in the future');
      }
      return value;
    })
    .messages({
      'date.base': 'Invalid date format',
    }),
});

const validateCreateEmail = (req, res, next) => {
  const { error, value } = createEmailSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
    });
  }

  req.validatedData = value;
  next();
};

const validateUpdateEmail = (req, res, next) => {
  const { error, value } = updateEmailSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
    });
  }

  req.validatedData = value;
  next();
};

module.exports = { validateCreateEmail, validateUpdateEmail };

