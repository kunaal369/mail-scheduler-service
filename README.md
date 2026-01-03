# Mail Scheduler Service

A production-ready Email Scheduling API built with Node.js, Express, PostgreSQL, Redis, and BullMQ. This service allows you to schedule emails to be sent at specific times in the future, with automatic retry mechanisms and comprehensive error handling.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
  - [Swagger UI](#swagger-ui)
  - [Manual API Documentation](#manual-api-documentation)
- [Testing](#testing)
- [Linting & Formatting](#linting--formatting)
- [Design Decisions](#design-decisions)

## 🎯 Overview

The Mail Scheduler Service is a robust backend API that enables scheduling emails to be sent at future dates and times. It supports both Redis (BullMQ) and in-memory scheduling, making it perfect for both development and production. The service includes:

- **Email Scheduling**: Schedule emails with future timestamps
- **Flexible Job Queue**: Works with Redis (BullMQ) or in-memory scheduler (no Redis needed!)
- **Automatic Retries**: Failed email jobs are automatically retried (with Redis mode)
- **Status Tracking**: Track email status (PENDING, SENT, FAILED)
- **Rescheduling**: Update scheduled emails and automatically reschedule jobs
- **Error Handling**: Comprehensive error handling with detailed failure reasons
- **Pagination**: Efficient pagination for listing endpoints
- **Logging**: Structured logging with Winston
- **Zero Dependencies Mode**: Run without Redis for easy development/testing

## 🏗️ Architecture

The application follows a modular architecture with clear separation of concerns:

```
┌─────────────────┐
│   Express API   │
│   (REST Routes) │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Service │
    │  Layer  │
    └────┬────┘
         │
    ┌────▼──────────────┐
    │                   │
┌───▼────┐        ┌─────▼─────┐
│  DB    │        │   BullMQ  │
│(PostgreSQL)     │   Queue   │
└────────┘        └─────┬─────┘
                        │
                   ┌────▼─────┐
                   │  Worker  │
                   │ (SendGrid)│
                   └──────────┘
```

### Key Components:

1. **API Layer**: Express.js REST API with validation and error handling
2. **Service Layer**: Business logic for email operations
3. **Queue Layer**: BullMQ for reliable job scheduling
4. **Worker Process**: Background worker that processes email jobs
5. **Database**: PostgreSQL for persistent email storage
6. **Cache/Queue**: Redis for BullMQ job storage

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Job Queue**: BullMQ with Redis
- **Email Service**: SendGrid
- **Validation**: Joi
- **Logging**: Winston
- **Testing**: Jest + Supertest
- **Code Quality**: ESLint + Prettier
- **API Documentation**: Swagger/OpenAPI 3.0

## 📦 Prerequisites

Before running this application, ensure you have:

- **Node.js** 18.0.0 or higher
- **PostgreSQL** 12+ installed and running
- **Redis** (Optional - only needed if `REDIS_ENABLED=true`)
- **SendGrid API Key** (sign up at [sendgrid.com](https://sendgrid.com))
- **npm** or **yarn** package manager

> **💡 Tip**: For the easiest setup, just set `REDIS_ENABLED=false` in `.env` and you won't need Redis at all!

## 🚀 Installation

1. **Clone the repository** (or navigate to the project directory):
   ```bash
   cd mail-scheduler-service
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your configuration values.

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mail_scheduler
DB_USER=postgres
DB_PASSWORD=postgres

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com  # Optional: Default sender email

# Logging
LOG_LEVEL=info
```

### Environment Variables Explained:

- `PORT`: Port number for the Express server (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `DB_*`: PostgreSQL connection parameters
- `REDIS_*`: Redis connection parameters
- `SENDGRID_API_KEY`: Your SendGrid API key for sending emails (required for sending emails)
- `SENDGRID_FROM_EMAIL`: Default sender email address (optional, defaults to 'noreply@example.com')
- `LOG_LEVEL`: Logging level (error, warn, info, debug)

## 🗄️ Database Setup

1. **Create PostgreSQL database**:
   ```sql
   CREATE DATABASE mail_scheduler;
   ```

2. **The application will automatically create tables** when you start the server (using Sequelize sync in development mode).

   For production, use migrations:
   ```bash
   # You can add sequelize-cli for migrations if needed
   npx sequelize-cli db:migrate
   ```

## 📧 SendGrid Setup

SendGrid is used to send emails. You need a SendGrid account and API key.

### Getting Your SendGrid API Key

1. **Sign up for SendGrid** (if you don't have an account):
   - Go to [https://sendgrid.com](https://sendgrid.com)
   - Click "Start for Free" and create an account
   - Free tier includes 100 emails per day

2. **Create an API Key**:
   - Log in to SendGrid dashboard
   - Go to **Settings** → **API Keys**
   - Click **Create API Key**
   - Give it a name (e.g., "Mail Scheduler Service")
   - Select **Full Access** or **Restricted Access** (with Mail Send permissions)
   - Click **Create & View**
   - **Copy the API key immediately** (you won't be able to see it again!)

3. **Add API Key to `.env`**:
   ```env
   SENDGRID_API_KEY=SG.your_actual_api_key_here
   ```

4. **Verify Sender Email (Important!)**:
   - Go to **Settings** → **Sender Authentication**
   - Verify a Single Sender or authenticate your domain
   - Use the verified email in `SENDGRID_FROM_EMAIL` in your `.env`:
   ```env
   SENDGRID_FROM_EMAIL=your-verified-email@yourdomain.com
   ```

### SendGrid Requirements

- **API Key**: Required - without it, emails will fail to send
- **Verified Sender**: Required - SendGrid requires sender verification
- **Free Tier**: 100 emails/day (perfect for testing)
- **Paid Plans**: Start at $19.95/month for 50,000 emails

### Testing Without SendGrid

If you want to test the API without actually sending emails:
- The API will still work (you can create, update, delete emails)
- Emails will be marked as `FAILED` when the scheduled time arrives
- Check the `failureReason` field to see the error

### SendGrid Error Codes

Common SendGrid errors you might see:
- **401 Unauthorized**: Invalid API key
- **403 Forbidden**: API key doesn't have Mail Send permission
- **400 Bad Request**: Invalid sender email (not verified)
- **413 Payload Too Large**: Email body too large

**Note**: Make sure your API key has **Mail Send** permissions enabled!

## 🔴 Redis Setup (Optional)

**Good News!** Redis is now **optional**. The application includes an **in-memory scheduler** that works without Redis, perfect for development and testing.

### Two Modes of Operation

1. **With Redis (Production Recommended)**: Uses BullMQ for reliable, persistent job scheduling
2. **Without Redis (Development/Testing)**: Uses in-memory scheduler - simpler setup, no external dependencies

### Running Without Redis (Easiest Setup)

Simply add this to your `.env` file:

```env
REDIS_ENABLED=false
```

That's it! The application will use an in-memory scheduler. **No Redis installation needed!**

**Note:** 
- In-memory scheduler works great for development and testing
- Jobs are lost if the server restarts (they're only in memory)
- For production with high reliability, use Redis mode

### Running With Redis (Production Recommended)

If you want to use Redis for production-grade reliability:

#### Installing Redis

**Windows:**
1. Download Redis from [Memurai](https://www.memurai.com/) (Redis-compatible for Windows)
   OR
2. Use WSL2 (Windows Subsystem for Linux) and install Redis there:
   ```bash
   wsl
   sudo apt-get update
   sudo apt-get install redis-server
   sudo service redis-server start
   ```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### Verify Redis is Running

```bash
redis-cli ping
```

Should return: `PONG`

### Troubleshooting Redis Connection Issues

**Error: `ECONNREFUSED ::1:6379` or `ECONNREFUSED 127.0.0.1:6379`**

This means Redis is not running, but you have `REDIS_ENABLED=true` (or not set, which defaults to true).

**Solutions:**

1. **Easiest: Disable Redis (Recommended for Development)**
   Add to your `.env` file:
   ```env
   REDIS_ENABLED=false
   ```
   The application will automatically use the in-memory scheduler. No Redis needed!

2. **Or Start Redis:**
   - Windows (Memurai): Start the Memurai service
   - macOS: `brew services start redis`
   - Linux: `sudo systemctl start redis`

3. **Check Redis Configuration:**
   Verify Redis is listening on the correct port (default: 6379):
   ```bash
   redis-cli -h localhost -p 6379 ping
   ```

### Redis Environment Variables

```env
REDIS_HOST=localhost      # Redis host (default: localhost)
REDIS_PORT=6379           # Redis port (default: 6379)
REDIS_PASSWORD=           # Redis password (optional)
REDIS_ENABLED=false       # Set to false to use in-memory scheduler (default: true)
```

**Quick Start Without Redis:**
```env
REDIS_ENABLED=false
```

That's all you need! The app will work perfectly without Redis using the built-in in-memory scheduler.

## 🏃 Running the Application

### Start the API Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

### Start the Email Worker (Only if using Redis)

**If `REDIS_ENABLED=true`** (using Redis/BullMQ):

In a **separate terminal**, start the worker process:

```bash
npm run worker
```

The worker listens for email jobs and processes them when their scheduled time arrives.

**If `REDIS_ENABLED=false`** (using in-memory scheduler):

**No separate worker needed!** The in-memory scheduler automatically processes emails when their scheduled time arrives. Just run the API server:

```bash
npm run dev
```

> **Note**: 
> - **With Redis**: Both API server and worker must be running
> - **Without Redis**: Only the API server is needed (in-memory scheduler handles everything)

### Health Check

Verify the server is running:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 📚 API Documentation

### Swagger UI

The API includes interactive Swagger documentation that you can use to test all endpoints directly from your browser.

**Access Swagger UI:**
```
http://localhost:3000/api-docs
```

The Swagger UI provides:
- **Interactive API Testing**: Test all endpoints directly from the browser
- **Request/Response Examples**: See example requests and responses for each endpoint
- **Schema Definitions**: View detailed data models and validation rules
- **Try It Out**: Execute API calls and see real responses

**Swagger JSON Specification:**
```
http://localhost:3000/api-docs.json
```

You can import this JSON into tools like Postman, Insomnia, or any OpenAPI-compatible client.

### Manual API Documentation

Below is the detailed API reference. For interactive testing, use the Swagger UI at `/api-docs`.

### Base URL

```
http://localhost:3000/api
```

### Endpoints

#### 1. Create Email

Schedule a new email to be sent in the future.

**POST** `/api/emails`

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Hello World",
  "body": "This is the email body content",
  "scheduledAt": "2024-12-31T23:59:59.000Z"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Email scheduled successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "to": "recipient@example.com",
    "subject": "Hello World",
    "body": "This is the email body content",
    "scheduledAt": "2024-12-31T23:59:59.000Z",
    "status": "PENDING",
    "failureReason": null,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### 2. Get Email by ID

Retrieve a specific email by its ID.

**GET** `/api/emails/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "to": "recipient@example.com",
    "subject": "Hello World",
    "body": "This is the email body content",
    "scheduledAt": "2024-12-31T23:59:59.000Z",
    "status": "PENDING",
    "failureReason": null,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### 3. List All Emails

Get a paginated list of all emails.

**GET** `/api/emails?page=1&limit=10`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Emails retrieved successfully",
  "data": {
    "emails": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "to": "recipient@example.com",
        "subject": "Hello World",
        "status": "PENDING",
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

#### 4. Update Email

Update an existing email (reschedules if `scheduledAt` is changed).

**PUT** `/api/emails/:id`

**Request Body:**
```json
{
  "subject": "Updated Subject",
  "scheduledAt": "2025-01-01T00:00:00.000Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "subject": "Updated Subject",
    "scheduledAt": "2025-01-01T00:00:00.000Z",
    ...
  }
}
```

**Rescheduling Behavior:**

When you update the `scheduledAt` field, the system **updates the existing BullMQ job** instead of deleting and recreating it:

- ✅ **Job ID is preserved** - The same `jobId` is maintained in the database
- ✅ **Efficient operation** - Updates the job's execution time without creating duplicates
- ✅ **Idempotent** - Safe to call multiple times with the same parameters
- ✅ **State preservation** - Job retry count and other metadata are maintained (when using Redis/BullMQ)

**Edge Cases:**
- Cannot reschedule jobs that are already **completed** or **actively being processed**
- If the job doesn't exist in the queue (e.g., was already processed), a new job is created
- Cannot update emails that have already been sent (status: SENT)

> **Note**: Cannot update emails that have already been sent (status: SENT).

#### 5. Delete Email

Delete an email and cancel its scheduled job.

**DELETE** `/api/emails/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email deleted successfully"
}
```

#### 6. Get Failed Emails

Retrieve all emails that failed to send.

**GET** `/api/emails/failed?page=1&limit=10`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Failed emails retrieved successfully",
  "data": {
    "emails": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "to": "recipient@example.com",
        "subject": "Hello World",
        "status": "FAILED",
        "failureReason": "Invalid email address",
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "to",
      "message": "Invalid email address"
    }
  ]
}
```

**Common HTTP Status Codes:**
- `400`: Bad Request (validation errors)
- `404`: Not Found (resource doesn't exist)
- `409`: Conflict (duplicate resource)
- `500`: Internal Server Error

## 🧪 Testing

### Automated Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

### Test Coverage

The test suite includes:
- Creating emails with validation
- Retrieving emails by ID
- Listing emails with pagination
- Updating emails (including rescheduling)
- Deleting emails
- Retrieving failed emails
- Error handling scenarios

**Note**: SendGrid is mocked in tests, so no actual emails are sent during testing.

### Manual Testing with Swagger UI

For manual API testing, use the interactive Swagger UI:

1. Start the server: `npm run dev`
2. Open your browser and navigate to: `http://localhost:3000/api-docs`
3. Use the "Try it out" feature on any endpoint to:
   - Test API calls directly from the browser
   - See request/response examples
   - Validate request payloads
   - View detailed error messages

This is especially useful for:
- Testing email scheduling with different dates
- Verifying validation rules
- Testing pagination
- Exploring API behavior before integration

## 🎨 Linting & Formatting

### Linting

Check for linting errors:

```bash
npm run lint
```

Auto-fix linting errors:

```bash
npm run lint:fix
```

### Formatting

Format code with Prettier:

```bash
npm run format
```

## 💡 Design Decisions

### 1. **UUID as Primary Key**
- Uses UUID instead of auto-incrementing integers for better distributed system support and security (no ID enumeration).

### 2. **BullMQ for Job Scheduling**
- Reliable job queue with Redis backend
- Built-in retry mechanisms
- Job persistence and recovery
- Better than cron for dynamic scheduling

### 3. **Separate Worker Process**
- Decouples API server from email processing
- Allows horizontal scaling of workers
- Prevents API server from being blocked by email sending

### 4. **Automatic Rescheduling**
- When `scheduledAt` is updated, the old BullMQ job is removed and a new one is created
- Ensures emails are sent at the correct time after updates

### 5. **Retry Mechanism**
- Failed email jobs are automatically retried up to 3 times with exponential backoff
- Reduces transient failures

### 6. **Status Tracking**
- Three statuses: PENDING, SENT, FAILED
- Failure reasons are stored for debugging and monitoring

### 7. **Pagination**
- All list endpoints support pagination to handle large datasets efficiently
- Default limit of 10, maximum of 100

### 8. **Centralized Error Handling**
- Error middleware handles all errors consistently
- Proper HTTP status codes
- Detailed error messages for debugging

### 9. **Structured Logging**
- Winston logger with different log levels
- Logs to both console (development) and files (production)
- Includes request/response logging

### 10. **Validation with Joi**
- Request validation before processing
- Clear validation error messages
- Prevents invalid data from entering the system

## 📝 License

ISC

## 🤝 Contributing

This is a production-ready template. Feel free to extend it with additional features like:
- Email templates
- Batch email scheduling
- Email attachments
- Webhooks for status updates
- Rate limiting
- Authentication/Authorization
- Database migrations with Sequelize CLI

---

**Built with ❤️ for reliable email scheduling**

# mail-scheduler-service
