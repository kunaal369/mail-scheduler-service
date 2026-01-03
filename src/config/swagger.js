const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mail Scheduler Service API',
      version: '1.0.0',
      description:
        'A production-ready Email Scheduling API built with Node.js, Express, PostgreSQL, Redis, and BullMQ. This API allows you to schedule emails to be sent at specific times in the future.',
      contact: {
        name: 'API Support',
      },
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        Email: {
          type: 'object',
          required: ['to', 'subject', 'body', 'scheduledAt'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the email',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            to: {
              type: 'string',
              format: 'email',
              description: 'Recipient email address',
              example: 'recipient@example.com',
            },
            subject: {
              type: 'string',
              description: 'Email subject line',
              maxLength: 500,
              example: 'Hello World',
            },
            body: {
              type: 'string',
              description: 'Email body content',
              example: 'This is the email body content',
            },
            scheduledAt: {
              type: 'string',
              format: 'date-time',
              description: 'ISO 8601 timestamp when the email should be sent',
              example: '2024-12-31T23:59:59.000Z',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'SENT', 'FAILED'],
              description: 'Current status of the email',
              example: 'PENDING',
            },
            failureReason: {
              type: 'string',
              nullable: true,
              description: 'Reason for failure if status is FAILED',
              example: null,
            },
            jobId: {
              type: 'string',
              nullable: true,
              description: 'BullMQ job identifier',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the email was created',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the email was last updated',
            },
          },
        },
        CreateEmailRequest: {
          type: 'object',
          required: ['to', 'subject', 'body', 'scheduledAt'],
          properties: {
            to: {
              type: 'string',
              format: 'email',
              description: 'Recipient email address',
              example: 'recipient@example.com',
            },
            subject: {
              type: 'string',
              description: 'Email subject line',
              minLength: 1,
              maxLength: 500,
              example: 'Hello World',
            },
            body: {
              type: 'string',
              description: 'Email body content',
              minLength: 1,
              example: 'This is the email body content',
            },
            scheduledAt: {
              type: 'string',
              format: 'date-time',
              description: 'ISO 8601 timestamp when the email should be sent (must be in the future)',
              example: '2024-12-31T23:59:59.000Z',
            },
          },
        },
        UpdateEmailRequest: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              format: 'email',
              description: 'Recipient email address',
              example: 'recipient@example.com',
            },
            subject: {
              type: 'string',
              description: 'Email subject line',
              minLength: 1,
              maxLength: 500,
              example: 'Updated Subject',
            },
            body: {
              type: 'string',
              description: 'Email body content',
              minLength: 1,
              example: 'Updated email body content',
            },
            scheduledAt: {
              type: 'string',
              format: 'date-time',
              description: 'ISO 8601 timestamp when the email should be sent (must be in the future)',
              example: '2025-01-01T00:00:00.000Z',
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully',
            },
            data: {
              oneOf: [
                { $ref: '#/components/schemas/Email' },
                {
                  type: 'object',
                  properties: {
                    emails: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Email' },
                    },
                    pagination: {
                      $ref: '#/components/schemas/Pagination',
                    },
                  },
                },
              ],
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'to',
                  },
                  message: {
                    type: 'string',
                    example: 'Invalid email address',
                  },
                },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number',
              example: 1,
            },
            limit: {
              type: 'integer',
              description: 'Number of items per page',
              example: 10,
            },
            total: {
              type: 'integer',
              description: 'Total number of items',
              example: 25,
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages',
              example: 3,
            },
          },
        },
      },
      responses: {
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                message: 'Email not found',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                message: 'Validation error',
                errors: [
                  {
                    field: 'to',
                    message: 'Invalid email address',
                  },
                ],
              },
            },
          },
        },
        BadRequest: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Emails',
        description: 'Email scheduling and management endpoints',
      },
      {
        name: 'Health',
        description: 'Health check endpoint',
      },
    ],
  },
  apis: ['./src/modules/**/*.routes.js', './src/app.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

