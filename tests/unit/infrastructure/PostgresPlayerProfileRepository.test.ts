import { PostgresPlayerProfileRepository } from '@infrastructure/persistence/PostgresPlayerProfileRepository';
import { Pool } from 'pg';

// Mock the pg module
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('PostgresPlayerProfileRepository', () => {
  let repository: PostgresPlayerProfileRepository;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const PoolConstructor = Pool as unknown as jest.Mock;
    mockPool = PoolConstructor();
  });

  describe('constructor and connection initialization', () => {
    it('should create a PostgresPlayerProfileRepository with connection string and pool size', () => {
      repository = new PostgresPlayerProfileRepository('postgresql://localhost:5432/test', 10);

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://localhost:5432/test',
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 30000,
      });
      expect(repository).toBeInstanceOf(PostgresPlayerProfileRepository);
    });

    it('should use default pool size of 10 when not specified', () => {
      repository = new PostgresPlayerProfileRepository('postgresql://localhost:5432/test');

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://localhost:5432/test',
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 30000,
      });
    });

    it('should set up error handler for the pool', () => {
      repository = new PostgresPlayerProfileRepository('postgresql://localhost:5432/test');

      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('create', () => {
    beforeEach(() => {
      repository = new PostgresPlayerProfileRepository('postgresql://localhost:5432/test');
    });

    it('should create a new player profile', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user_123',
            display_name: 'testuser',
            created_at: now,
            updated_at: now,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.create({
        userId: 'user_123',
        displayName: 'testuser',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO player_profiles'),
        ['user_123', 'testuser']
      );
      expect(result.userId).toBe('user_123');
      expect(result.displayName).toBe('testuser');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when profile already exists', async () => {
      const dbError = new Error('duplicate key value violates unique constraint');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(
        repository.create({
          userId: 'user_123',
          displayName: 'testuser',
        })
      ).rejects.toThrow();
    });

    it('should throw error when display name is already taken', async () => {
      const dbError = new Error('duplicate key value violates unique constraint');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(
        repository.create({
          userId: 'user_456',
          displayName: 'existinguser',
        })
      ).rejects.toThrow();
    });

    it('should handle database errors during create', async () => {
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(
        repository.create({
          userId: 'user_123',
          displayName: 'testuser',
        })
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('findByUserId', () => {
    beforeEach(() => {
      repository = new PostgresPlayerProfileRepository('postgresql://localhost:5432/test');
    });

    it('should return profile when found by user ID', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user_123',
            display_name: 'testuser',
            created_at: now,
            updated_at: now,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.findByUserId('user_123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM player_profiles WHERE user_id = $1'),
        ['user_123']
      );
      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user_123');
      expect(result?.displayName).toBe('testuser');
    });

    it('should return null when profile not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repository.findByUserId('non_existent');

      expect(result).toBeNull();
    });

    it('should handle database errors during findByUserId', async () => {
      const dbError = new Error('Query timeout');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(repository.findByUserId('user_123')).rejects.toThrow('Query timeout');
    });
  });

  describe('findByDisplayName', () => {
    beforeEach(() => {
      repository = new PostgresPlayerProfileRepository('postgresql://localhost:5432/test');
    });

    it('should return profile when found by display name', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user_123',
            display_name: 'testuser',
            created_at: now,
            updated_at: now,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.findByDisplayName('testuser');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM player_profiles WHERE display_name = $1'),
        ['testuser']
      );
      expect(result).not.toBeNull();
      expect(result?.displayName).toBe('testuser');
    });

    it('should return null when display name not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repository.findByDisplayName('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors during findByDisplayName', async () => {
      const dbError = new Error('Connection lost');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(repository.findByDisplayName('testuser')).rejects.toThrow('Connection lost');
    });
  });

  describe('update', () => {
    beforeEach(() => {
      repository = new PostgresPlayerProfileRepository('postgresql://localhost:5432/test');
    });

    it('should update display name successfully', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      const later = new Date('2025-01-02T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user_123',
            display_name: 'newname',
            created_at: now,
            updated_at: later,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.update('user_123', {
        displayName: 'newname',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE player_profiles'),
        expect.arrayContaining(['newname', 'user_123'])
      );
      expect(result.displayName).toBe('newname');
      expect(result.updatedAt).toEqual(later);
    });

    it('should throw error when user not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(
        repository.update('non_existent', {
          displayName: 'newname',
        })
      ).rejects.toThrow();
    });

    it('should throw error when display name is taken by another user', async () => {
      const dbError = new Error('duplicate key value violates unique constraint');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(
        repository.update('user_123', {
          displayName: 'takenname',
        })
      ).rejects.toThrow();
    });

    it('should handle database errors during update', async () => {
      const dbError = new Error('Database error');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(
        repository.update('user_123', {
          displayName: 'newname',
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      repository = new PostgresPlayerProfileRepository('postgresql://localhost:5432/test');
    });

    it('should delete a profile successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      await repository.delete('user_123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM player_profiles WHERE user_id = $1'),
        ['user_123']
      );
    });

    it('should not throw error when deleting non-existent profile', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(repository.delete('non_existent')).resolves.not.toThrow();
    });

    it('should handle database errors during delete', async () => {
      const dbError = new Error('Connection error');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(repository.delete('user_123')).rejects.toThrow('Connection error');
    });
  });

  describe('isDisplayNameAvailable', () => {
    beforeEach(() => {
      repository = new PostgresPlayerProfileRepository('postgresql://localhost:5432/test');
    });

    it('should return true when display name is available', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repository.isDisplayNameAvailable('availablename');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM player_profiles WHERE display_name = $1'),
        ['availablename']
      );
      expect(result).toBe(true);
    });

    it('should return false when display name is taken', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user_123',
            display_name: 'takenname',
            created_at: now,
            updated_at: now,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.isDisplayNameAvailable('takenname');

      expect(result).toBe(false);
    });

    it('should return true when display name is taken by the excluded user', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user_123',
            display_name: 'myname',
            created_at: now,
            updated_at: now,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.isDisplayNameAvailable('myname', 'user_123');

      expect(result).toBe(true);
    });

    it('should return false when display name is taken by a different user', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user_456',
            display_name: 'othername',
            created_at: now,
            updated_at: now,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.isDisplayNameAvailable('othername', 'user_123');

      expect(result).toBe(false);
    });

    it('should handle database errors during isDisplayNameAvailable', async () => {
      const dbError = new Error('Query failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(repository.isDisplayNameAvailable('testname')).rejects.toThrow('Query failed');
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      repository = new PostgresPlayerProfileRepository('postgresql://localhost:5432/test');
    });

    it('should return all player profiles', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user_123',
            display_name: 'user1',
            created_at: now,
            updated_at: now,
          },
          {
            user_id: 'user_456',
            display_name: 'user2',
            created_at: now,
            updated_at: now,
          },
        ],
        rowCount: 2,
      });

      const result = await repository.findAll();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM player_profiles')
      );
      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user_123');
      expect(result[1].userId).toBe('user_456');
    });

    it('should return empty array when no profiles exist', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repository.findAll();

      expect(result).toHaveLength(0);
    });

    it('should handle database errors during findAll', async () => {
      const dbError = new Error('Database error');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(repository.findAll()).rejects.toThrow('Database error');
    });
  });

  describe('healthCheck', () => {
    beforeEach(() => {
      repository = new PostgresPlayerProfileRepository('postgresql://localhost:5432/test');
    });

    it('should return true when database is healthy', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ result: 1 }],
        rowCount: 1,
      });

      const result = await repository.healthCheck();

      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
      expect(result).toBe(true);
    });

    it('should return false when database query fails', async () => {
      const dbError = new Error('Connection refused');
      mockPool.query.mockRejectedValueOnce(dbError);

      const result = await repository.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('close', () => {
    beforeEach(() => {
      repository = new PostgresPlayerProfileRepository('postgresql://localhost:5432/test');
    });

    it('should close all connections in the pool', async () => {
      mockPool.end.mockResolvedValueOnce(undefined);

      await repository.close();

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle errors during close gracefully', async () => {
      const closeError = new Error('Failed to close connections');
      mockPool.end.mockRejectedValueOnce(closeError);

      await expect(repository.close()).rejects.toThrow('Failed to close connections');
    });
  });
});
