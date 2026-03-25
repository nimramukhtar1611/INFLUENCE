// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.js'],
  testTimeout: 30000,
  maxWorkers: 1,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true
};