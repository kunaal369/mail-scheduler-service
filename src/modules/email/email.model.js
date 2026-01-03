const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../../config/database');
const { EMAIL_STATUS } = require('../../utils/constants');

const Email = sequelize.define(
  'Email',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    to: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(EMAIL_STATUS)),
      defaultValue: EMAIL_STATUS.PENDING,
      allowNull: false,
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    jobId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'emails',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Email;

