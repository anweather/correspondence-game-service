/**
 * Tests for DatabaseConnection
 */

import { DatabaseConnection } from '../../../src/infrastructure/persistence/DatabaseConnection';

// Mock pg module
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockConnect = jest.fn();
  const mockEnd = jest.fn();
  const mockOn = jest.fn();
  const mockRelease = jest.fn();

  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockQuery,
      connect: mockConnect,
      end: mockEnd,
      on: mockOn,
    })),
    __mockQuery: mockQuery,
    __mockConnect: mockConnect,
    __mockEnd: mockEnd,
    __mockOn: mockOn,
    __mockRelease: mockRelease,
  };
});

describe('DatabaseConnection', () => {
  let dbConnection: DatabaseConnection;
  let mockPool: any;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const pg = require('pg');
    mockPool = {
      query: pg.__mockQuery,
      connect: pg.__mockConnect,
      end: pg.__mockEnd,
      on: pg.__mockOn,
    };

    dbConnection = new DatabaseConnection({
      connectionString: 'postgresql://user:pass@localhost:5432/testdb',
      poolSize: 10,
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create a Pool with correct configuration', () => {
      const Pool = require('pg').Pool;

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://user:pass@localhost:5432/testdb',
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 30000,
      });
    });

    it('should set up error handler for the pool', () => {
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('connect', () => {
    it('should connect successfully on first attempt', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);

      await dbConnection.connect();

      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockClient.release).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Database connection established successfully');
    });

    it('should retry connection on failure and succeed', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      };

      mockPool.connect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(mockClient);

      await dbConnection.connect(5, 100);

      expect(mockPool.connect).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledWith('Database connection established successfully');
    });

    it('should throw error after max retries', async () => {
      mockPool.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(dbConnection.connect(3, 100)).rejects.toThrow(
        'Failed to connect to database after 3 attempts'
      );

      expect(mockPool.connect).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff for retries', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      };

      mockPool.connect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(mockClient);

      const startTime = Date.now();
      await dbConnection.connect(5, 100);
      const duration = Date.now() - startTime;

      // Should wait at least 100ms + 200ms = 300ms for two retries
      expect(duration).toBeGreaterThanOrEqual(300);
    });
  });

  describe('healthCheck', () => {
    it('should return false if not connected', async () => {
      const result = await dbConnection.healthCheck();

      expect(result).toBe(false);
    });

    it('should return true if database is healthy', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);

      // First connect
      await dbConnection.connect();

      // Then health check
      const result = await dbConnection.healthCheck();

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Database health check passed')
      );
    });

    it('should return false if health check query fails', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);

      // First connect
      await dbConnection.connect();

      // Make health check fail
      mockClient.query.mockRejectedValueOnce(new Error('Query failed'));

      const result = await dbConnection.healthCheck();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Database health check failed:',
        expect.any(Error)
      );
    });
  });

  describe('getClient', () => {
    it('should return a client from the pool', async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockClient);

      const client = await dbConnection.getClient();

      expect(client).toBe(mockClient);
      expect(mockPool.connect).toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should execute a query using the pool', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await dbConnection.query('SELECT * FROM games WHERE id = $1', ['game-1']);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM games WHERE id = $1', ['game-1']);
      expect(result).toBe(mockResult);
    });
  });

  describe('getPool', () => {
    it('should return the underlying pool instance', () => {
      const pool = dbConnection.getPool();

      expect(pool).toBeDefined();
      expect(pool.query).toBeDefined();
      expect(pool.connect).toBeDefined();
    });
  });

  describe('close', () => {
    it('should close all connections in the pool', async () => {
      mockPool.end.mockResolvedValue(undefined);

      await dbConnection.close();

      expect(mockPool.end).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Closing database connections...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Database connections closed');
    });

    it('should set isHealthy to false after closing', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);
      mockPool.end.mockResolvedValue(undefined);

      // Connect first
      await dbConnection.connect();
      expect(dbConnection.isHealthy()).toBe(true);

      // Close connection
      await dbConnection.close();
      expect(dbConnection.isHealthy()).toBe(false);
    });
  });

  describe('isHealthy', () => {
    it('should return false initially', () => {
      expect(dbConnection.isHealthy()).toBe(false);
    });

    it('should return true after successful connection', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);

      await dbConnection.connect();

      expect(dbConnection.isHealthy()).toBe(true);
    });
  });
});
