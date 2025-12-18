/**
 * Jest configuration for database integration tests
 * These tests use real PostgreSQL containers and run serially
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/tests/database/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Database tests must run serially to avoid container conflicts
  maxWorkers: 1,
  
  // Longer timeouts for container startup
  testTimeout: 120000,
  
  // Module name mapping
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@adapters/(.*)$': '<rootDir>/src/adapters/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@games/tic-tac-toe/shared$': '<rootDir>/games/tic-tac-toe/shared',
    '^@games/tic-tac-toe/engine$': '<rootDir>/games/tic-tac-toe/engine',
    '^@games/tic-tac-toe/ui$': '<rootDir>/games/tic-tac-toe/ui',
    '^@games/(.*)$': '<rootDir>/games/$1'
  },
  
  verbose: true,
  
  // Don't collect coverage for database tests (they're integration tests)
  collectCoverage: false
};