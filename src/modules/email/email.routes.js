const express = require('express');
const emailController = require('./email.controller');
const { validateCreateEmail, validateUpdateEmail } = require('./email.validator');

const router = express.Router();

/**
 * @swagger
 * /api/emails:
 *   post:
 *     summary: Schedule a new email
 *     description: Create and schedule a new email to be sent at a future date and time
 *     tags: [Emails]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEmailRequest'
 *           example:
 *             to: recipient@example.com
 *             subject: Hello World
 *             body: This is the email body content
 *             scheduledAt: 2024-12-31T23:59:59.000Z
 *     responses:
 *       201:
 *         description: Email scheduled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: Email scheduled successfully
 *               data:
 *                 id: 550e8400-e29b-41d4-a716-446655440000
 *                 to: recipient@example.com
 *                 subject: Hello World
 *                 body: This is the email body content
 *                 scheduledAt: 2024-12-31T23:59:59.000Z
 *                 status: PENDING
 *                 failureReason: null
 *                 createdAt: 2024-01-01T12:00:00.000Z
 *                 updatedAt: 2024-01-01T12:00:00.000Z
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/', validateCreateEmail, emailController.createEmail);

/**
 * @swagger
 * /api/emails/failed:
 *   get:
 *     summary: Get all failed emails
 *     description: Retrieve a paginated list of all emails that failed to send
 *     tags: [Emails]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Failed emails retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: Failed emails retrieved successfully
 *               data:
 *                 emails:
 *                   - id: 550e8400-e29b-41d4-a716-446655440000
 *                     to: recipient@example.com
 *                     subject: Hello World
 *                     status: FAILED
 *                     failureReason: Invalid email address
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 5
 *                   totalPages: 1
 */
router.get('/failed', emailController.getFailedEmails);

/**
 * @swagger
 * /api/emails/{id}:
 *   get:
 *     summary: Get email by ID
 *     description: Retrieve a specific email by its unique identifier
 *     tags: [Emails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Email unique identifier
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Email retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: Email retrieved successfully
 *               data:
 *                 id: 550e8400-e29b-41d4-a716-446655440000
 *                 to: recipient@example.com
 *                 subject: Hello World
 *                 body: This is the email body content
 *                 scheduledAt: 2024-12-31T23:59:59.000Z
 *                 status: PENDING
 *                 failureReason: null
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', emailController.getEmailById);

/**
 * @swagger
 * /api/emails:
 *   get:
 *     summary: Get all emails
 *     description: Retrieve a paginated list of all emails
 *     tags: [Emails]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Emails retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: Emails retrieved successfully
 *               data:
 *                 emails:
 *                   - id: 550e8400-e29b-41d4-a716-446655440000
 *                     to: recipient@example.com
 *                     subject: Hello World
 *                     status: PENDING
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 25
 *                   totalPages: 3
 */
router.get('/', emailController.getAllEmails);

/**
 * @swagger
 * /api/emails/{id}:
 *   put:
 *     summary: Update an email
 *     description: Update an existing email. If scheduledAt is changed, the email will be rescheduled. Cannot update emails that have already been sent.
 *     tags: [Emails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Email unique identifier
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEmailRequest'
 *           example:
 *             subject: Updated Subject
 *             scheduledAt: 2025-01-01T00:00:00.000Z
 *     responses:
 *       200:
 *         description: Email updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: Email updated successfully
 *               data:
 *                 id: 550e8400-e29b-41d4-a716-446655440000
 *                 subject: Updated Subject
 *                 scheduledAt: 2025-01-01T00:00:00.000Z
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', validateUpdateEmail, emailController.updateEmail);

/**
 * @swagger
 * /api/emails/{id}:
 *   delete:
 *     summary: Delete an email
 *     description: Delete an email and cancel its scheduled job if it hasn't been sent yet
 *     tags: [Emails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Email unique identifier
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Email deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: Email deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', emailController.deleteEmail);

module.exports = router;

