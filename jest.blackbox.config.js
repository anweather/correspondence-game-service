module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/blackbox'],
  testMatch: ['**/*.blackbox.test.ts'],
  testTimeout: 10000,
};