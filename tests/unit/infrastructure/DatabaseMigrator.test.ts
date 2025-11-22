/**
 * Unit tests for DatabaseMigrator
 */

import { DatabaseMigrator } from '../../../src/infrastructure/persistence/DatabaseMigrator';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');

describe('DatabaseMigrator', () => {
  let mockPool: any;
  let mockClient: any;
  let migrator: DatabaseMigrator;
  let mockMigrationsDir: string;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Create mock pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    mockMigrationsDir = '/test/migrations';
    migrator = new DatabaseMigrator(mockPool, mockMigrationsDir);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create migrator with provided pool and migrations directory', () => {
      expect(migrator).toBeDefined();
    });

    it('should use default migrations directory if not provided', () => {
      const defaultMigrator = new DatabaseMigrator(mockPool);
      expect(defaultMigrator).toBeDefined();
    });
  });

  describe('getCurrentVersion', () => {
    it('should return the highest applied migration version', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ version: 5 }],
      } as any);

      const version = await migrator.getCurrentVersion();

      expect(version).toBe(5);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT MAX(version) as version FROM schema_migrations'
      );
    });

    it('should return 0 if no migrations have been applied', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ version: null }],
      } as any);

      const version = await migrator.getCurrentVersion();

      expect(version).toBe(0);
    });

    it('should return 0 if schema_migrations table does not exist', async () => {
      mockPool.query.mockRejectedValue(new Error('Table does not exist'));

      const version = await migrator.getCurrentVersion();

      expect(version).toBe(0);
    });
  });

  describe('isMigrationApplied', () => {
    it('should return true if migration is applied', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ version: 1 }],
      } as any);

      const isApplied = await migrator.isMigrationApplied(1);

      expect(isApplied).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [1]
      );
    });

    it('should return false if migration is not applied', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
      } as any);

      const isApplied = await migrator.isMigrationApplied(1);

      expect(isApplied).toBe(false);
    });

    it('should return false if schema_migrations table does not exist', async () => {
      mockPool.query.mockRejectedValue(new Error('Table does not exist'));

      const isApplied = await migrator.isMigrationApplied(1);

      expect(isApplied).toBe(false);
    });
  });

  describe('applyMigrations', () => {
    beforeEach(() => {
      // Mock fs.existsSync to return true
      (fs.existsSync as jest.Mock).mockReturnValue(true);
    });

    it('should apply all pending migrations in order', async () => {
      // Mock migration files
      (fs.readdirSync as jest.Mock).mockReturnValue(['001_initial.sql', '002_add_indexes.sql']);

      // Mock file contents
      (fs.readFileSync as jest.Mock)
        .mockReturnValueOnce('CREATE TABLE test1;')
        .mockReturnValueOnce('CREATE INDEX idx_test;');

      // Mock pool.query for ensuring migrations table
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      // Mock isMigrationApplied to return false (not applied)
      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any) // ensureMigrationsTable
        .mockResolvedValueOnce({ rows: [] } as any) // isMigrationApplied(1)
        .mockResolvedValueOnce({ rows: [] } as any); // isMigrationApplied(2)

      // Mock client queries for transactions
      mockClient.query.mockResolvedValue({ rows: [] } as any);

      await migrator.applyMigrations();

      // Verify migrations were applied
      expect(mockPool.connect).toHaveBeenCalledTimes(2); // Once per migration
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalledTimes(2);
    });

    it('should skip already applied migrations', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue(['001_initial.sql']);
      (fs.readFileSync as jest.Mock).mockReturnValue('CREATE TABLE test;');

      // Mock pool.query for ensuring migrations table
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      // Mock isMigrationApplied to return true (already applied)
      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any) // ensureMigrationsTable
        .mockResolvedValueOnce({ rows: [{ version: 1 }] } as any); // isMigrationApplied(1)

      await migrator.applyMigrations();

      // Verify no migration was applied
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should handle empty migrations directory', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      await migrator.applyMigrations();

      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should handle non-existent migrations directory', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      await migrator.applyMigrations();

      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should rollback transaction on migration failure', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue(['001_initial.sql']);
      (fs.readFileSync as jest.Mock).mockReturnValue('INVALID SQL;');

      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any) // ensureMigrationsTable
        .mockResolvedValueOnce({ rows: [] } as any); // isMigrationApplied(1)

      // Mock client query to fail
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockRejectedValueOnce(new Error('SQL syntax error')); // Migration query fails

      await expect(migrator.applyMigrations()).rejects.toThrow('SQL syntax error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error for invalid migration filename format', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue(['invalid_name.sql']);
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      await expect(migrator.applyMigrations()).rejects.toThrow('Invalid migration filename format');
    });

    it('should sort migrations by version number', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([
        '003_third.sql',
        '001_first.sql',
        '002_second.sql',
      ]);

      (fs.readFileSync as jest.Mock).mockReturnValue('SELECT 1;');

      mockPool.query.mockResolvedValue({ rows: [] } as any);
      mockClient.query.mockResolvedValue({ rows: [] } as any);

      await migrator.applyMigrations();

      // Verify migrations were applied in order by checking readFileSync calls
      const readCalls = (fs.readFileSync as jest.Mock).mock.calls;
      expect(readCalls[0][0]).toContain('001_first.sql');
      expect(readCalls[1][0]).toContain('002_second.sql');
      expect(readCalls[2][0]).toContain('003_third.sql');
    });

    it('should filter out non-SQL files', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([
        '001_migration.sql',
        'README.md',
        'script.js',
      ]);

      (fs.readFileSync as jest.Mock).mockReturnValue('SELECT 1;');

      mockPool.query.mockResolvedValue({ rows: [] } as any);
      mockClient.query.mockResolvedValue({ rows: [] } as any);

      await migrator.applyMigrations();

      // Only one SQL file should be processed
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });
  });
});
