import { PostgresInvitationRepository } from '@infrastructure/persistence/PostgresInvitationRepository';
import { InvitationStatus } from '@domain/models/GameInvitation';
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

describe('PostgresInvitationRepository', () => {
  let repository: PostgresInvitationRepository;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const PoolConstructor = Pool as unknown as jest.Mock;
    mockPool = PoolConstructor();
  });

  describe('constructor and connection initialization', () => {
    it('should create a PostgresInvitationRepository with connection string and pool size', () => {
      repository = new PostgresInvitationRepository('postgresql://localhost:5432/test', 10);

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://localhost:5432/test',
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 30000,
      });
      expect(repository).toBeInstanceOf(PostgresInvitationRepository);
    });

    it('should use default pool size of 10 when not specified', () => {
      repository = new PostgresInvitationRepository('postgresql://localhost:5432/test');

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://localhost:5432/test',
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 30000,
      });
    });

    it('should set up error handler for the pool', () => {
      repository = new PostgresInvitationRepository('postgresql://localhost:5432/test');

      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('create', () => {
    beforeEach(() => {
      repository = new PostgresInvitationRepository('postgresql://localhost:5432/test');
    });

    it('should create a new invitation', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            invitation_id: 'inv_123',
            game_id: 'game_456',
            inviter_id: 'user_789',
            invitee_id: 'user_012',
            status: 'pending',
            created_at: now,
            responded_at: null,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.create({
        gameId: 'game_456',
        inviterId: 'user_789',
        inviteeId: 'user_012',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO game_invitations'),
        ['game_456', 'user_789', 'user_012']
      );
      expect(result.invitationId).toBe('inv_123');
      expect(result.gameId).toBe('game_456');
      expect(result.inviterId).toBe('user_789');
      expect(result.inviteeId).toBe('user_012');
      expect(result.status).toBe(InvitationStatus.PENDING);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.respondedAt).toBeUndefined();
    });

    it('should throw error when foreign key constraint fails (invalid game)', async () => {
      const dbError = new Error('violates foreign key constraint "game_invitations_game_id_fkey"');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(
        repository.create({
          gameId: 'invalid_game',
          inviterId: 'user_789',
          inviteeId: 'user_012',
        })
      ).rejects.toThrow();
    });

    it('should throw error when foreign key constraint fails (invalid inviter)', async () => {
      const dbError = new Error('violates foreign key constraint "fk_inviter"');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(
        repository.create({
          gameId: 'game_456',
          inviterId: 'invalid_user',
          inviteeId: 'user_012',
        })
      ).rejects.toThrow();
    });

    it('should throw error when foreign key constraint fails (invalid invitee)', async () => {
      const dbError = new Error('violates foreign key constraint "fk_invitee"');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(
        repository.create({
          gameId: 'game_456',
          inviterId: 'user_789',
          inviteeId: 'invalid_user',
        })
      ).rejects.toThrow();
    });

    it('should handle database errors during create', async () => {
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(
        repository.create({
          gameId: 'game_456',
          inviterId: 'user_789',
          inviteeId: 'user_012',
        })
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('findById', () => {
    beforeEach(() => {
      repository = new PostgresInvitationRepository('postgresql://localhost:5432/test');
    });

    it('should return invitation when found by ID', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            invitation_id: 'inv_123',
            game_id: 'game_456',
            inviter_id: 'user_789',
            invitee_id: 'user_012',
            status: 'pending',
            created_at: now,
            responded_at: null,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.findById('inv_123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM game_invitations WHERE invitation_id = $1'),
        ['inv_123']
      );
      expect(result).not.toBeNull();
      expect(result?.invitationId).toBe('inv_123');
      expect(result?.status).toBe(InvitationStatus.PENDING);
    });

    it('should return null when invitation not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repository.findById('non_existent');

      expect(result).toBeNull();
    });

    it('should handle database errors during findById', async () => {
      const dbError = new Error('Query timeout');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(repository.findById('inv_123')).rejects.toThrow('Query timeout');
    });
  });

  describe('findByInvitee', () => {
    beforeEach(() => {
      repository = new PostgresInvitationRepository('postgresql://localhost:5432/test');
    });

    it('should return all invitations for an invitee', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            invitation_id: 'inv_123',
            game_id: 'game_456',
            inviter_id: 'user_789',
            invitee_id: 'user_012',
            status: 'pending',
            created_at: now,
            responded_at: null,
          },
          {
            invitation_id: 'inv_124',
            game_id: 'game_457',
            inviter_id: 'user_790',
            invitee_id: 'user_012',
            status: 'accepted',
            created_at: now,
            responded_at: now,
          },
        ],
        rowCount: 2,
      });

      const result = await repository.findByInvitee('user_012');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM game_invitations.*WHERE invitee_id = \$1/s),
        ['user_012']
      );
      expect(result).toHaveLength(2);
      expect(result[0].inviteeId).toBe('user_012');
      expect(result[1].inviteeId).toBe('user_012');
    });

    it('should filter invitations by status', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            invitation_id: 'inv_123',
            game_id: 'game_456',
            inviter_id: 'user_789',
            invitee_id: 'user_012',
            status: 'pending',
            created_at: now,
            responded_at: null,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.findByInvitee('user_012', {
        status: InvitationStatus.PENDING,
      });

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('AND status = $2'), [
        'user_012',
        'pending',
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(InvitationStatus.PENDING);
    });

    it('should filter invitations by game ID', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            invitation_id: 'inv_123',
            game_id: 'game_456',
            inviter_id: 'user_789',
            invitee_id: 'user_012',
            status: 'pending',
            created_at: now,
            responded_at: null,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.findByInvitee('user_012', {
        gameId: 'game_456',
      });

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('AND game_id = $2'), [
        'user_012',
        'game_456',
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].gameId).toBe('game_456');
    });

    it('should return empty array when no invitations found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repository.findByInvitee('user_012');

      expect(result).toHaveLength(0);
    });

    it('should handle database errors during findByInvitee', async () => {
      const dbError = new Error('Connection lost');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(repository.findByInvitee('user_012')).rejects.toThrow('Connection lost');
    });
  });

  describe('findByInviter', () => {
    beforeEach(() => {
      repository = new PostgresInvitationRepository('postgresql://localhost:5432/test');
    });

    it('should return all invitations sent by an inviter', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            invitation_id: 'inv_123',
            game_id: 'game_456',
            inviter_id: 'user_789',
            invitee_id: 'user_012',
            status: 'pending',
            created_at: now,
            responded_at: null,
          },
          {
            invitation_id: 'inv_124',
            game_id: 'game_457',
            inviter_id: 'user_789',
            invitee_id: 'user_013',
            status: 'declined',
            created_at: now,
            responded_at: now,
          },
        ],
        rowCount: 2,
      });

      const result = await repository.findByInviter('user_789');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM game_invitations.*WHERE inviter_id = \$1/s),
        ['user_789']
      );
      expect(result).toHaveLength(2);
      expect(result[0].inviterId).toBe('user_789');
      expect(result[1].inviterId).toBe('user_789');
    });

    it('should filter invitations by status', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            invitation_id: 'inv_124',
            game_id: 'game_457',
            inviter_id: 'user_789',
            invitee_id: 'user_013',
            status: 'declined',
            created_at: now,
            responded_at: now,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.findByInviter('user_789', {
        status: InvitationStatus.DECLINED,
      });

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('AND status = $2'), [
        'user_789',
        'declined',
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(InvitationStatus.DECLINED);
    });

    it('should return empty array when no invitations found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repository.findByInviter('user_789');

      expect(result).toHaveLength(0);
    });

    it('should handle database errors during findByInviter', async () => {
      const dbError = new Error('Query failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(repository.findByInviter('user_789')).rejects.toThrow('Query failed');
    });
  });

  describe('findByGame', () => {
    beforeEach(() => {
      repository = new PostgresInvitationRepository('postgresql://localhost:5432/test');
    });

    it('should return all invitations for a game', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            invitation_id: 'inv_123',
            game_id: 'game_456',
            inviter_id: 'user_789',
            invitee_id: 'user_012',
            status: 'pending',
            created_at: now,
            responded_at: null,
          },
          {
            invitation_id: 'inv_125',
            game_id: 'game_456',
            inviter_id: 'user_789',
            invitee_id: 'user_014',
            status: 'accepted',
            created_at: now,
            responded_at: now,
          },
        ],
        rowCount: 2,
      });

      const result = await repository.findByGame('game_456');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM game_invitations.*WHERE game_id = \$1/s),
        ['game_456']
      );
      expect(result).toHaveLength(2);
      expect(result[0].gameId).toBe('game_456');
      expect(result[1].gameId).toBe('game_456');
    });

    it('should filter invitations by status', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            invitation_id: 'inv_125',
            game_id: 'game_456',
            inviter_id: 'user_789',
            invitee_id: 'user_014',
            status: 'accepted',
            created_at: now,
            responded_at: now,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.findByGame('game_456', {
        status: InvitationStatus.ACCEPTED,
      });

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('AND status = $2'), [
        'game_456',
        'accepted',
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(InvitationStatus.ACCEPTED);
    });

    it('should return empty array when no invitations found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repository.findByGame('game_456');

      expect(result).toHaveLength(0);
    });

    it('should handle database errors during findByGame', async () => {
      const dbError = new Error('Database error');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(repository.findByGame('game_456')).rejects.toThrow('Database error');
    });
  });

  describe('updateStatus', () => {
    beforeEach(() => {
      repository = new PostgresInvitationRepository('postgresql://localhost:5432/test');
    });

    it('should update invitation status to accepted', async () => {
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      const respondedAt = new Date('2025-01-02T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            invitation_id: 'inv_123',
            game_id: 'game_456',
            inviter_id: 'user_789',
            invitee_id: 'user_012',
            status: 'accepted',
            created_at: createdAt,
            responded_at: respondedAt,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.updateStatus(
        'inv_123',
        InvitationStatus.ACCEPTED,
        respondedAt
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE game_invitations'),
        expect.arrayContaining(['accepted', respondedAt, 'inv_123'])
      );
      expect(result.status).toBe(InvitationStatus.ACCEPTED);
      expect(result.respondedAt).toEqual(respondedAt);
    });

    it('should update invitation status to declined', async () => {
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      const respondedAt = new Date('2025-01-02T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            invitation_id: 'inv_123',
            game_id: 'game_456',
            inviter_id: 'user_789',
            invitee_id: 'user_012',
            status: 'declined',
            created_at: createdAt,
            responded_at: respondedAt,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.updateStatus(
        'inv_123',
        InvitationStatus.DECLINED,
        respondedAt
      );

      expect(result.status).toBe(InvitationStatus.DECLINED);
      expect(result.respondedAt).toEqual(respondedAt);
    });

    it('should update invitation status to expired', async () => {
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            invitation_id: 'inv_123',
            game_id: 'game_456',
            inviter_id: 'user_789',
            invitee_id: 'user_012',
            status: 'expired',
            created_at: createdAt,
            responded_at: null,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.updateStatus('inv_123', InvitationStatus.EXPIRED);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE game_invitations'),
        expect.arrayContaining(['expired', undefined, 'inv_123'])
      );
      expect(result.status).toBe(InvitationStatus.EXPIRED);
      expect(result.respondedAt).toBeUndefined();
    });

    it('should throw error when invitation not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(
        repository.updateStatus('non_existent', InvitationStatus.ACCEPTED)
      ).rejects.toThrow();
    });

    it('should handle database errors during updateStatus', async () => {
      const dbError = new Error('Update failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(repository.updateStatus('inv_123', InvitationStatus.ACCEPTED)).rejects.toThrow(
        'Update failed'
      );
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      repository = new PostgresInvitationRepository('postgresql://localhost:5432/test');
    });

    it('should delete an invitation successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      await repository.delete('inv_123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM game_invitations WHERE invitation_id = $1'),
        ['inv_123']
      );
    });

    it('should not throw error when deleting non-existent invitation', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(repository.delete('non_existent')).resolves.not.toThrow();
    });

    it('should handle database errors during delete', async () => {
      const dbError = new Error('Connection error');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(repository.delete('inv_123')).rejects.toThrow('Connection error');
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      repository = new PostgresInvitationRepository('postgresql://localhost:5432/test');
    });

    it('should return all invitations', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            invitation_id: 'inv_123',
            game_id: 'game_456',
            inviter_id: 'user_789',
            invitee_id: 'user_012',
            status: 'pending',
            created_at: now,
            responded_at: null,
          },
          {
            invitation_id: 'inv_124',
            game_id: 'game_457',
            inviter_id: 'user_790',
            invitee_id: 'user_013',
            status: 'accepted',
            created_at: now,
            responded_at: now,
          },
        ],
        rowCount: 2,
      });

      const result = await repository.findAll();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM game_invitations/s),
        []
      );
      expect(result).toHaveLength(2);
    });

    it('should filter invitations by status', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            invitation_id: 'inv_123',
            game_id: 'game_456',
            inviter_id: 'user_789',
            invitee_id: 'user_012',
            status: 'pending',
            created_at: now,
            responded_at: null,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.findAll({ status: InvitationStatus.PENDING });

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE status = $1'), [
        'pending',
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(InvitationStatus.PENDING);
    });

    it('should filter invitations by multiple criteria', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            invitation_id: 'inv_123',
            game_id: 'game_456',
            inviter_id: 'user_789',
            invitee_id: 'user_012',
            status: 'pending',
            created_at: now,
            responded_at: null,
          },
        ],
        rowCount: 1,
      });

      const result = await repository.findAll({
        status: InvitationStatus.PENDING,
        gameId: 'game_456',
        inviterId: 'user_789',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $1 AND game_id = $2 AND inviter_id = $3'),
        ['pending', 'game_456', 'user_789']
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no invitations exist', async () => {
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
      repository = new PostgresInvitationRepository('postgresql://localhost:5432/test');
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
      repository = new PostgresInvitationRepository('postgresql://localhost:5432/test');
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
