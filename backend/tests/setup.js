// tests/setup.js
const mongoose = require('mongoose');

// Increase timeout
jest.setTimeout(30000);

// Mock Redis to avoid connection attempts during tests
jest.mock('../config/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue(null),
  getRedisClient: jest.fn().mockReturnValue(null),
  isRedisConnected: jest.fn().mockReturnValue(false),
  cache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    isUsingRedis: jest.fn().mockReturnValue(false)
  }
}));

// Mock external services
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendWelcome: jest.fn().mockResolvedValue({ success: true }),
  sendVerification: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordReset: jest.fn().mockResolvedValue({ success: true }),
  sendOTP: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../services/smsService', () => ({
  sendSMS: jest.fn().mockResolvedValue({ success: true }),
  sendOTP: jest.fn().mockResolvedValue({ success: true }),
  sendNotification: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../services/SMSService', () => ({
  sendSMS: jest.fn().mockResolvedValue({ success: true }),
  sendOTP: jest.fn().mockResolvedValue({ success: true })
}));

// Global after hook to close mongoose connection
afterAll(async () => {
  await mongoose.connection.close();
});