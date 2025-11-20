import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import { GameState, GameLifecycle, Player } from '@domain/models';
import { ConcurrencyError } from '@domain/errors';

describe('InMemoryGameRepository', () => {
  let repository: InMemoryGameRepository;

  beforeEach(() => {
    repository = new InMemoryGameRepository();
  });

  const createTestPlayer = (id: string, name: string): Player => ({
    id,
    name,
    joinedAt: new Date(),
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
    version,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('save', () => {
    it('should save a new game state', async () => {
      const gameState = createTestGameState('game-1');

      await repository.save(gameState);

      const retrieved = await repository.findById('game-1');
      expect(retrieved).toEqual(gameState);
    });

    it('should save multiple game states', async () => {
      const game1 = createTestGameState('game-1');
      const game2 = createTestGameState('game-2');

      await repository.save(game1);
      await repository.save(game2);

      const retrieved1 = await repository.findById('game-1');
      const retrieved2 = await repository.findById('game-2');

      expect(retrieved1).toEqual(game1);
      expect(retrieved2).toEqual(game2);
    });
  });

  describe('findById', () => {
    it('should return game state when found', async () => {
      const gameState = createTestGameState('game-1');
      await repository.save(gameState);

      const result = await repository.findById('game-1');

      expect(result).toEqual(gameState);
    });

    it('should return null when game not found', async () => {
      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByPlayer', () => {
    beforeEach(async () => {
      // Create games with different players
      const game1 = createTestGameState('game-1');
      const game2 = createTestGameState('game-2');
      const game3: GameState = {
        ...createTestGameState('game-3'),
        players: [createTestPlayer('player1', 'Alice'), createTestPlayer('player3', 'Charlie')],
      };
      const game4: GameState = {
        ...createTestGameState('game-4'),
        players: [createTestPlayer('player3', 'Charlie')],
      };

      await repository.save(game1);
      await repository.save(game2);
      await repository.save(game3);
      await repository.save(game4);
    });

    it('should return games where player is a participant', async () => {
      const result = await repository.findByPlayer('player1', {});

      expect(result.items).toHaveLength(3);
      expect(result.items.map((g: GameState) => g.gameId).sort()).toEqual([
        'game-1',
        'game-2',
        'game-3',
      ]);
    });

    it('should return empty result when player has no games', async () => {
      const result = await repository.findByPlayer('non-existent-player', {});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should support pagination', async () => {
      const page1 = await repository.findByPlayer('player1', {
        page: 1,
        pageSize: 2,
      });

      expect(page1.items).toHaveLength(2);
      expect(page1.page).toBe(1);
      expect(page1.pageSize).toBe(2);
      expect(page1.total).toBe(3);
      expect(page1.totalPages).toBe(2);

      const page2 = await repository.findByPlayer('player1', {
        page: 2,
        pageSize: 2,
      });

      expect(page2.items).toHaveLength(1);
      expect(page2.page).toBe(2);
      expect(page2.totalPages).toBe(2);
    });

    it('should filter by lifecycle', async () => {
      const completedGame: GameState = {
        ...createTestGameState('game-5'),
        lifecycle: GameLifecycle.COMPLETED,
      };
      await repository.save(completedGame);

      const result = await repository.findByPlayer('player1', {
        lifecycle: GameLifecycle.COMPLETED,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].gameId).toBe('game-5');
    });

    it('should filter by game type', async () => {
      const chessGame: GameState = {
        ...createTestGameState('game-6', 'chess'),
      };
      await repository.save(chessGame);

      const result = await repository.findByPlayer('player1', {
        gameType: 'chess',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].gameId).toBe('game-6');
    });

    it('should use default pagination when not specified', async () => {
      const result = await repository.findByPlayer('player1', {});

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('update', () => {
    it('should update game state with correct version', async () => {
      const gameState = createTestGameState('game-1', 'test-game', 1);
      await repository.save(gameState);

      const updatedState: GameState = {
        ...gameState,
        version: 2,
        phase: 'updated',
        updatedAt: new Date(),
      };

      const result = await repository.update('game-1', updatedState, 1);

      expect(result.version).toBe(2);
      expect(result.phase).toBe('updated');

      const retrieved = await repository.findById('game-1');
      expect(retrieved?.version).toBe(2);
      expect(retrieved?.phase).toBe('updated');
    });

    it('should throw ConcurrencyError when version mismatch', async () => {
      const gameState = createTestGameState('game-1', 'test-game', 5);
      await repository.save(gameState);

      const updatedState: GameState = {
        ...gameState,
        version: 6,
        phase: 'updated',
      };

      await expect(repository.update('game-1', updatedState, 3)).rejects.toThrow(ConcurrencyError);
    });

    it('should throw error when game not found', async () => {
      const gameState = createTestGameState('non-existent', 'test-game', 1);

      await expect(repository.update('non-existent', gameState, 1)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete an existing game', async () => {
      const gameState = createTestGameState('game-1');
      await repository.save(gameState);

      await repository.delete('game-1');

      const result = await repository.findById('game-1');
      expect(result).toBeNull();
    });

    it('should not throw error when deleting non-existent game', async () => {
      await expect(repository.delete('non-existent')).resolves.not.toThrow();
    });

    it('should remove game from player queries after deletion', async () => {
      const gameState = createTestGameState('game-1');
      await repository.save(gameState);

      await repository.delete('game-1');

      const result = await repository.findByPlayer('player1', {});
      expect(result.items).toHaveLength(0);
    });
  });
});
