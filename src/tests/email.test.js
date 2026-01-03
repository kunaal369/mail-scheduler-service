const request = require('supertest');
const app = require('../app');
const Email = require('../modules/email/email.model');
const { sendEmail } = require('../config/sendgrid');
const { EMAIL_STATUS } = require('../utils/constants');

// Mock SendGrid
jest.mock('../config/sendgrid', () => ({
  sendEmail: jest.fn(),
}));

describe('Email API', () => {
  const validEmailData = {
    to: 'test@example.com',
    subject: 'Test Email',
    body: 'This is a test email body',
    scheduledAt: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
  };

  describe('POST /api/emails', () => {
    it('should create a new email successfully', async () => {
      const response = await request(app).post('/api/emails').send(validEmailData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.to).toBe(validEmailData.to);
      expect(response.body.data.subject).toBe(validEmailData.subject);
      expect(response.body.data.status).toBe(EMAIL_STATUS.PENDING);
    });

    it('should return validation error for invalid email', async () => {
      const invalidData = { ...validEmailData, to: 'invalid-email' };
      const response = await request(app).post('/api/emails').send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return validation error for past scheduled date', async () => {
      const invalidData = {
        ...validEmailData,
        scheduledAt: new Date(Date.now() - 60000).toISOString(),
      };
      const response = await request(app).post('/api/emails').send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return validation error for missing required fields', async () => {
      const response = await request(app).post('/api/emails').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/emails/:id', () => {
    it('should get email by id', async () => {
      const email = await Email.create(validEmailData);
      const response = await request(app).get(`/api/emails/${email.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(email.id);
    });

    it('should return 404 for non-existent email', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).get(`/api/emails/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/emails', () => {
    it('should get all emails with pagination', async () => {
      // Create multiple emails
      await Email.create(validEmailData);
      await Email.create({ ...validEmailData, to: 'test2@example.com' });

      const response = await request(app).get('/api/emails?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.emails).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should handle pagination correctly', async () => {
      // Create 5 emails
      for (let i = 0; i < 5; i++) {
        await Email.create({ ...validEmailData, to: `test${i}@example.com` });
      }

      const response = await request(app).get('/api/emails?page=1&limit=2');

      expect(response.status).toBe(200);
      expect(response.body.data.emails).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.total).toBe(5);
    });
  });

  describe('PUT /api/emails/:id', () => {
    it('should update email successfully', async () => {
      const email = await Email.create(validEmailData);
      const updateData = {
        subject: 'Updated Subject',
        scheduledAt: new Date(Date.now() + 120000).toISOString(),
      };

      const response = await request(app).put(`/api/emails/${email.id}`).send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.subject).toBe(updateData.subject);
    });

    it('should return 404 for non-existent email', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).put(`/api/emails/${fakeId}`).send({ subject: 'New' });

      expect(response.status).toBe(404);
    });

    it('should not allow updating sent emails', async () => {
      const email = await Email.create({
        ...validEmailData,
        status: EMAIL_STATUS.SENT,
      });

      const response = await request(app).put(`/api/emails/${email.id}`).send({
        subject: 'New Subject',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/emails/:id', () => {
    it('should delete email successfully', async () => {
      const email = await Email.create(validEmailData);
      const response = await request(app).delete(`/api/emails/${email.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify email is deleted
      const deletedEmail = await Email.findByPk(email.id);
      expect(deletedEmail).toBeNull();
    });

    it('should return 404 for non-existent email', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).delete(`/api/emails/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/emails/failed', () => {
    it('should get only failed emails', async () => {
      // Create emails with different statuses
      await Email.create({ ...validEmailData, status: EMAIL_STATUS.PENDING });
      await Email.create({
        ...validEmailData,
        to: 'failed1@example.com',
        status: EMAIL_STATUS.FAILED,
        failureReason: 'Test failure',
      });
      await Email.create({
        ...validEmailData,
        to: 'failed2@example.com',
        status: EMAIL_STATUS.FAILED,
        failureReason: 'Another failure',
      });

      const response = await request(app).get('/api/emails/failed');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.emails).toHaveLength(2);
      response.body.data.emails.forEach((email) => {
        expect(email.status).toBe(EMAIL_STATUS.FAILED);
      });
    });
  });
});

