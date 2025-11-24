import { PostgresGameRepository } from '@infrastructure/persistence/PostgresGameRepository';
import { GameState, GameLifecycle, Player } from '@domain/models';
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

describe('PostgresGameRepository - Basic Structure', () => {
  let repository: PostgresGameRepository;
  let mockPool: any;

  const createTestPlayer = (id: string, name: string): Player => ({
    id,
    name,
    joinedAt: new Date('2025-01-01T00:00:00.000Z'),
  });

  const createTestGameState = (
    gameId: string,
    gameType: string = 'test-game',
    version: number = 1
  ): GameState => ({
    gameId,
    gameType,
    lifecycle: GameLifecycle.ACTIVE,
    players: [createTestPlayer('player1', 'Alice'), createTestPlayer('player2', 'Bob')],
    currentPlayerIndex: 0,
    phase: 'main',
    board: {
      spaces: [],
      metadata: {},
    },
    moveHistory: [],
    metadata: {},
    winner: null,
    version,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const PoolConstructor = Pool as unknown as jest.Mock;
    mockPool = PoolConstructor();
  });

  describe('constructor and connection initialization', () => {
    it('should create a PostgresGameRepository with connection string and pool size', () => {
      repository = new PostgresGameRepository('postgresql://localhost:5432/test', 10);

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://localhost:5432/test',
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 30000,
      });
      expect(repository).toBeInstanceOf(PostgresGameRepository);
    });

    it('should use default pool size of 10 when not specified', () => {
      repository = new PostgresGameRepository('postgresql://localhost:5432/test');

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://localhost:5432/test',
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 30000,
      });
    });

    it('should set up error handler for the pool', () => {
      repository = new PostgresGameRepository('postgresql://localhost:5432/test');

      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('serialization and deserialization', () => {
    beforeEach(() => {
      repository = new PostgresGameRepository('postgresql://localhost:5432/test');
    });

    it('should serialize GameState to database row format', () => {
      const gameState = createTestGameState('game-1', 'tic-tac-toe', 1);

      const serialized = repository['serializeGameState'](gameState);

      expect(serialized).toEqual({
        game_id: 'game-1',
        game_type: 'tic-tac-toe',
        lifecycle: 'active',
        winner: null,
        state: gameState, // PostgreSQL JSONB handles objects directly
        version: 1,
        created_at: new Date('2025-01-01T00:00:00.000Z'),
        updated_at: new Date('2025-01-01T00:00:00.000Z'),
      });

      // Verify the state object has correct properties
      expect((serialized.state as GameState).gameId).toBe('game-1');
      expect((serialized.state as GameState).gameType).toBe('tic-tac-toe');
    });

    it('should deserialize database row to GameState', () => {
      const gameState = createTestGameState('game-1', 'tic-tac-toe', 1);
      const serialized = repository['serializeGameState'](gameState);

      const deserialized = repository['deserializeGameState'](serialized);

      expect(deserialized.gameId).toBe('game-1');
      expect(deserialized.gameType).toBe('tic-tac-toe');
      expect(deserialized.lifecycle).toBe(GameLifecycle.ACTIVE);
      expect(deserialized.version).toBe(1);
      expect(deserialized.players).toHaveLength(2);
      expect(deserialized.players[0].id).toBe('player1');
    });

    it('should correctly handle Date objects in serialization', () => {
      const gameState = createTestGameState('game-1');
      const testDate = new Date('2025-11-22T10:30:00.000Z');
      gameState.createdAt = testDate;
      gameState.updatedAt = testDate;
      gameState.players[0].joinedAt = testDate;

      const serialized = repository['serializeGameState'](gameState);
      const deserialized = repository['deserializeGameState'](serialized);

      expect(deserialized.createdAt).toBeInstanceOf(Date);
      expect(deserialized.createdAt.toISOString()).toBe(testDate.toISOString());
      expect(deserialized.updatedAt).toBeInstanceOf(Date);
      expect(deserialized.updatedAt.toISOString()).toBe(testDate.toISOString());
      expect(deserialized.players[0].joinedAt).toBeInstanceOf(Date);
      expect(deserialized.players[0].joinedAt.toISOString()).toBe(testDate.toISOString());
    });

    it('should correctly handle Date objects in moveHistory during serialization', () => {
      const gameState = createTestGameState('game-1');
      const moveDate = new Date('2025-11-22T11:00:00.000Z');
      gameState.moveHistory = [
        {
          playerId: 'player1',
          timestamp: moveDate,
          action: 'place',
          parameters: { position: 0 },
        },
      ];

      const serialized = repository['serializeGameState'](gameState);
      const deserialized = repository['deserializeGameState'](serialized);

      expect(deserialized.moveHistory).toHaveLength(1);
      expect(deserialized.moveHistory[0].timestamp).toBeInstanceOf(Date);
      expect(deserialized.moveHistory[0].timestamp.toISOString()).toBe(moveDate.toISOString());
    });

    it('should preserve all GameState fields during round-trip serialization', () => {
      const gameState = createTestGameState('game-1', 'chess', 5);
      gameState.metadata = { customField: 'value', nested: { data: 123 } };
      gameState.board.metadata = { boardSize: 8 };

      const serialized = repository['serializeGameState'](gameState);
      const deserialized = repository['deserializeGameState'](serialized);

      expect(deserialized).toEqual(gameState);
    });
  });

  describe('save', () => {
    beforeEach(() => {
      repository = new PostgresGameRepository('postgresql://localhost:5432/test');
    });

    it('should insert a new game into the database', async () => {
      const gameState = createTestGameState('game-1', 'tic-tac-toe', 1);
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await repository.save(gameState);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO games'),
        expect.arrayContaining([
          'game-1',
          'tic-tac-toe',
          'active',
          expect.any(String),
          1,
          expect.any(Date),
          expect.any(Date),
        ])
      );
    });

    it('should handle database errors during save', async () => {
      const gameState = createTestGameState('game-1');
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(repository.save(gameState)).rejects.toThrow('Database connection failed');
    });
  });

  describe('findById', () => {
    beforeEach(() => {
      repository = new PostgresGameRepository('postgresql://localhost:5432/test');
    });

    it('should return game state when found', async () => {
      const gameState = createTestGameState('game-1', 'tic-tac-toe', 1);
      const serialized = repository['serializeGameState'](gameState);

      mockPool.query.mockResolvedValueOnce({
        rows: [serialized],
        rowCount: 1,
      } as any);

      const result = await repository.findById('game-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM games WHERE game_id = $1'),
        ['game-1']
      );
      expect(result).not.toBeNull();
      expect(result?.gameId).toBe('game-1');
      expect(result?.gameType).toBe('tic-tac-toe');
    });

    it('should return null when game not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.findById('non-existent');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM games WHERE game_id = $1'),
        ['non-existent']
      );
      expect(result).toBeNull();
    });

    it('should handle database errors during findById', async () => {
      const dbError = new Error('Query timeout');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(repository.findById('game-1')).rejects.toThrow('Query timeout');
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      repository = new PostgresGameRepository('postgresql://localhost:5432/test');
    });

    it('should delete a game from the database', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await repository.delete('game-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM games WHERE game_id = $1'),
        ['game-1']
      );
    });

    it('should not throw error when deleting non-existent game', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(repository.delete('non-existent')).resolves.not.toThrow();
    });

    it('should handle database errors during delete', async () => {
      const dbError = new Error('Connection lost');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(repository.delete('game-1')).rejects.toThrow('Connection lost');
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      repository = new PostgresGameRepository('postgresql://localhost:5432/test');
    });

    it('should return all games with no filters', async () => {
      const game1 = createTestGameState('game-1', 'tic-tac-toe', 1);
      const game2 = createTestGameState('game-2', 'chess', 1);
      const serialized1 = repository['serializeGameState'](game1);
      const serialized2 = repository['serializeGameState'](game2);

      // Mock count query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '2' }],
        rowCount: 1,
      } as any);

      // Mock data query
      mockPool.query.mockResolvedValueOnce({
        rows: [serialized1, serialized2],
        rowCount: 2,
      } as any);

      const result = await repository.findAll({});

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by lifecycle', async () => {
      const game1 = createTestGameState('game-1');
      game1.lifecycle = GameLifecycle.COMPLETED;
      const serialized1 = repository['serializeGameState'](game1);

      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        rowCount: 1,
      } as any);

      mockPool.query.mockResolvedValueOnce({
        rows: [serialized1],
        rowCount: 1,
      } as any);

      const result = await repository.findAll({ lifecycle: 'completed' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE lifecycle = $1'),
        expect.arrayContaining(['completed'])
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].lifecycle).toBe(GameLifecycle.COMPLETED);
    });

    it('should filter by game type', async () => {
      const game1 = createTestGameState('game-1', 'chess', 1);
      const serialized1 = repository['serializeGameState'](game1);

      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        rowCount: 1,
      } as any);

      mockPool.query.mockResolvedValueOnce({
        rows: [serialized1],
        rowCount: 1,
      } as any);

      const result = await repository.findAll({ gameType: 'chess' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE game_type = $1'),
        expect.arrayContaining(['chess'])
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].gameType).toBe('chess');
    });

    it('should support pagination', async () => {
      const game1 = createTestGameState('game-1');
      const serialized1 = repository['serializeGameState'](game1);

      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '10' }],
        rowCount: 1,
      } as any);

      mockPool.query.mockResolvedValueOnce({
        rows: [serialized1],
        rowCount: 1,
      } as any);

      const result = await repository.findAll({ page: 2, pageSize: 5 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        expect.arrayContaining([5, 5])
      );
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(5);
      expect(result.total).toBe(10);
      expect(result.totalPages).toBe(2);
    });

    it('should use default pagination when not specified', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
      } as any);

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.findAll({});

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('findByPlayer', () => {
    beforeEach(() => {
      repository = new PostgresGameRepository('postgresql://localhost:5432/test');
    });

    it('should return games where player is a participant', async () => {
      const game1 = createTestGameState('game-1');
      const serialized1 = repository['serializeGameState'](game1);

      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        rowCount: 1,
      } as any);

      mockPool.query.mockResolvedValueOnce({
        rows: [serialized1],
        rowCount: 1,
      } as any);

      const result = await repository.findByPlayer('player1', {});

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("state->'players' @> $1"),
        expect.arrayContaining([JSON.stringify([{ id: 'player1' }])])
      );
      expect(result.items).toHaveLength(1);
    });

    it('should filter by lifecycle when finding by player', async () => {
      const game1 = createTestGameState('game-1');
      game1.lifecycle = GameLifecycle.ACTIVE;
      const serialized1 = repository['serializeGameState'](game1);

      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        rowCount: 1,
      } as any);

      mockPool.query.mockResolvedValueOnce({
        rows: [serialized1],
        rowCount: 1,
      } as any);

      const result = await repository.findByPlayer('player1', { lifecycle: 'active' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("state->'players' @> $1"),
        expect.arrayContaining([JSON.stringify([{ id: 'player1' }]), 'active'])
      );
      expect(result.items[0].lifecycle).toBe(GameLifecycle.ACTIVE);
    });

    it('should filter by game type when finding by player', async () => {
      const game1 = createTestGameState('game-1', 'chess');
      const serialized1 = repository['serializeGameState'](game1);

      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        rowCount: 1,
      } as any);

      mockPool.query.mockResolvedValueOnce({
        rows: [serialized1],
        rowCount: 1,
      } as any);

      const result = await repository.findByPlayer('player1', { gameType: 'chess' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("state->'players' @> $1"),
        expect.arrayContaining([JSON.stringify([{ id: 'player1' }]), 'chess'])
      );
      expect(result.items[0].gameType).toBe('chess');
    });

    it('should support pagination when finding by player', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '15' }],
        rowCount: 1,
      } as any);

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.findByPlayer('player1', { page: 3, pageSize: 5 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        expect.arrayContaining([JSON.stringify([{ id: 'player1' }]), 5, 10])
      );
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(5);
      expect(result.total).toBe(15);
      expect(result.totalPages).toBe(3);
    });

    it('should return empty result when player has no games', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
      } as any);

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.findByPlayer('non-existent-player', {});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      repository = new PostgresGameRepository('postgresql://localhost:5432/test');
    });

    it('should update game state with correct version', async () => {
      const gameState = createTestGameState('game-1', 'tic-tac-toe', 2);
      const serialized = repository['serializeGameState'](gameState);

      mockPool.query.mockResolvedValueOnce({
        rows: [serialized],
        rowCount: 1,
      } as any);

      const result = await repository.update('game-1', gameState, 1);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE games'),
        expect.arrayContaining(['tic-tac-toe', 'active', 'game-1', 1])
      );
      expect(result.version).toBe(2);
    });

    it('should throw ConcurrencyError when version mismatch', async () => {
      const gameState = createTestGameState('game-1', 'tic-tac-toe', 5);

      // Mock UPDATE query returning no rows (version mismatch)
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock SELECT query to check if game exists (it does)
      mockPool.query.mockResolvedValueOnce({
        rows: [{ version: 4 }],
        rowCount: 1,
      } as any);

      await expect(repository.update('game-1', gameState, 3)).rejects.toThrow(
        'was modified by another request'
      );
    });

    it('should throw GameNotFoundError when game does not exist', async () => {
      const gameState = createTestGameState('non-existent', 'tic-tac-toe', 1);

      // Mock UPDATE query returning no rows
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock SELECT query to check if game exists (it doesn't)
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(repository.update('non-existent', gameState, 1)).rejects.toThrow('not found');
    });

    it('should increment version on successful update', async () => {
      const gameState = createTestGameState('game-1', 'tic-tac-toe', 1);
      gameState.version = 2;
      gameState.phase = 'updated';
      const serialized = repository['serializeGameState'](gameState);

      mockPool.query.mockResolvedValueOnce({
        rows: [serialized],
        rowCount: 1,
      } as any);

      const result = await repository.update('game-1', gameState, 1);

      expect(result.version).toBe(2);
      expect(result.phase).toBe('updated');
    });

    it('should handle database errors during update', async () => {
      const gameState = createTestGameState('game-1');
      const dbError = new Error('Connection timeout');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(repository.update('game-1', gameState, 1)).rejects.toThrow('Connection timeout');
    });
  });

  describe('healthCheck', () => {
    beforeEach(() => {
      repository = new PostgresGameRepository('postgresql://localhost:5432/test');
    });

    it('should return true when database is healthy', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ result: 1 }],
        rowCount: 1,
      } as any);

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

    it('should handle timeout errors gracefully', async () => {
      const timeoutError = new Error('Query timeout');
      mockPool.query.mockRejectedValueOnce(timeoutError);

      const result = await repository.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('close', () => {
    beforeEach(() => {
      repository = new PostgresGameRepository('postgresql://localhost:5432/test');
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
