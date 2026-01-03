const { sequelize } = require('../config/database');

beforeAll(async () => {
  // Connect to test database
  await sequelize.authenticate();
});

afterAll(async () => {
  // Close database connection
  await sequelize.close();
});

beforeEach(async () => {
  // Clear all tables before each test
  const Email = require('../modules/email/email.model');
  await Email.destroy({ where: {}, truncate: true, cascade: true });
});

