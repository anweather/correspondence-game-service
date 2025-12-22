/**
 * Tests for configuration service
 */

import { loadConfig, validateAndLogConfig } from '../../../src/config';

describe('Configuration Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load configuration with all environment variables set', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.DB_POOL_SIZE = '20';
      process.env.LOG_LEVEL = 'debug';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      const config = loadConfig();

      expect(config.port).toBe(8080);
      expect(config.nodeEnv).toBe('production');
      expect(config.database.url).toBe('postgresql://user:pass@localhost:5432/db');
      expect(config.database.poolSize).toBe(20);
      expect(config.logging.level).toBe('debug');
      expect(config.logging.format).toBe('json'); // production mode
    });

    it('should use default values when optional environment variables are not set', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';
      delete process.env.NODE_ENV;
      delete process.env.PORT;
      delete process.env.DB_POOL_SIZE;
      delete process.env.LOG_LEVEL;

      const config = loadConfig();

      expect(config.port).toBe(3000);
      expect(config.nodeEnv).toBe('development');
      expect(config.database.poolSize).toBe(10);
      expect(config.logging.level).toBe('info');
      expect(config.logging.format).toBe('pretty'); // development mode
    });

    it('should allow missing DATABASE_URL (falls back to in-memory storage)', () => {
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';
      delete process.env.DATABASE_URL;

      const config = loadConfig();

      expect(config.database.url).toBeNull();
    });

    it('should throw error when DATABASE_URL has invalid format', () => {
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      expect(() => loadConfig()).toThrow('Invalid DATABASE_URL format');
    });

    it('should accept postgres:// prefix for DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      const config = loadConfig();

      expect(config.database.url).toBe('postgres://user:pass@localhost:5432/db');
    });

    it('should throw error when PORT is invalid', () => {
      process.env.PORT = 'invalid';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      expect(() => loadConfig()).toThrow('Invalid PORT');
    });

    it('should throw error when PORT is out of range', () => {
      process.env.PORT = '70000';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      expect(() => loadConfig()).toThrow('Invalid PORT');
    });

    it('should throw error when NODE_ENV is invalid', () => {
      process.env.NODE_ENV = 'staging';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      expect(() => loadConfig()).toThrow('Invalid NODE_ENV');
    });

    it('should throw error when DB_POOL_SIZE is invalid', () => {
      process.env.DB_POOL_SIZE = 'invalid';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      expect(() => loadConfig()).toThrow('Invalid DB_POOL_SIZE');
    });

    it('should throw error when DB_POOL_SIZE is out of range', () => {
      process.env.DB_POOL_SIZE = '150';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      expect(() => loadConfig()).toThrow('Invalid DB_POOL_SIZE');
    });

    it('should throw error when LOG_LEVEL is invalid', () => {
      process.env.LOG_LEVEL = 'trace';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      expect(() => loadConfig()).toThrow('Invalid LOG_LEVEL');
    });

    it('should set log format to json in production mode', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      const config = loadConfig();

      expect(config.logging.format).toBe('json');
    });

    it('should set log format to pretty in development mode', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      const config = loadConfig();

      expect(config.logging.format).toBe('pretty');
    });

    it('should set log format to pretty in test mode', () => {
      process.env.NODE_ENV = 'test';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      const config = loadConfig();

      expect(config.logging.format).toBe('pretty');
    });
  });

  describe('Clerk Authentication Configuration', () => {
    it('should load configuration with valid Clerk keys', () => {
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      const config = loadConfig();

      expect(config.auth.clerk.publishableKey).toBe('pk_test_valid_key_12345');
      expect(config.auth.clerk.secretKey).toBe('sk_test_valid_secret_12345');
    });

    it('should throw error when CLERK_PUBLISHABLE_KEY is missing', () => {
      delete process.env.CLERK_PUBLISHABLE_KEY;
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      expect(() => loadConfig()).toThrow('CLERK_PUBLISHABLE_KEY is required');
    });

    it('should throw error when CLERK_SECRET_KEY is missing', () => {
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      delete process.env.CLERK_SECRET_KEY;

      expect(() => loadConfig()).toThrow('CLERK_SECRET_KEY is required');
    });

    it('should throw error when both Clerk keys are missing', () => {
      delete process.env.CLERK_PUBLISHABLE_KEY;
      delete process.env.CLERK_SECRET_KEY;

      expect(() => loadConfig()).toThrow('CLERK_PUBLISHABLE_KEY is required');
    });
  });

  describe('validateAndLogConfig', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let processExitSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit called');
      }) as any);
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should load configuration successfully without verbose logging', () => {
      process.env.DATABASE_URL = 'postgresql://user:secretpass@localhost:5432/db';
      process.env.PORT = '3000';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      const config = validateAndLogConfig();

      expect(config).toBeDefined();
      expect(config.database.url).toBe('postgresql://user:secretpass@localhost:5432/db');
      expect(config.port).toBe(3000);
      // Verbose logging has been removed for performance
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Configuration loaded successfully')
      );
    });

    it('should exit process when configuration is invalid', () => {
      process.env.PORT = 'invalid';
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      expect(() => validateAndLogConfig()).toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Configuration Error:',
        expect.stringContaining('Invalid PORT')
      );
    });

    it('should load auth configuration without verbose logging', () => {
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_valid_secret_12345';

      const config = validateAndLogConfig();

      expect(config).toBeDefined();
      expect(config.auth.clerk.publishableKey).toBe('pk_test_valid_key_12345');
      expect(config.auth.clerk.secretKey).toBe('sk_test_valid_secret_12345');
      // Verbose logging has been removed for performance
    });

    it('should load configuration without exposing secrets', () => {
      process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_12345';
      process.env.CLERK_SECRET_KEY = 'sk_test_secret_should_be_masked';

      const config = validateAndLogConfig();

      expect(config).toBeDefined();
      expect(config.auth.clerk.secretKey).toBe('sk_test_secret_should_be_masked');
      // Secrets are not logged anymore for security
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('sk_test_secret_should_be_masked')
      );
    });
  });
});
