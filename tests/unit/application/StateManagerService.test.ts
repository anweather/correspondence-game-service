import { StateManagerService } from '@application/services/StateManagerService';
import { GameLockManager } from '@application/GameLockManager';
import { PluginRegistry } from '@application/PluginRegistry';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import {
  GameEnginePlugin,
  ValidationResult,
  GameConfig,
  BoardRenderData,
} from '@domain/interfaces';
import {
  GameState,
  GameLifecycle,
  Player,
  Move,
  Board,
} from '@domain/models';
import {
  GameNotFoundError,
  InvalidMoveError,
  UnauthorizedMoveError,
  ConcurrencyError,
} from '@domain/errors';

// Mock game engine for testing
class MockGameEngine implements GameEnginePlugin {
  public beforeApplyMoveCalled = false;
  public afterApplyMoveCalled = false;
  public isGameOverResult = false;
  public getWinnerResult: string | null = null;

  getGameType(): string {
    return 'mock-game';
  }

  getMinPlayers(): number {
    return 2;
  }

  getMaxPlayers(): number {
    return 4;
  }

  getDescription(): string {
    return 'Mock game for testing';
  }

  onGameCreated(_state: GameState, _config: GameConfig): void {}
  onPlayerJoined(_state: GameState, _playerId: string): void {}
  onGameStarted(_state: GameState): void {}
  onGameEnded(_state: GameState): void {}

  initializeGame(players: Player[], _config: GameConfig): GameState {
    return createMockGameState(players);
  }

  validateMove(
    _state: GameState,
    _playerId: string,
    move: Move
  ): ValidationResult {
    // Return invalid if move action is 'invalid'
    if (move.action === 'invalid') {
      return { valid: false, reason: 'Invalid move action' };
    }
    return { valid: true };
  }

  beforeApplyMove(_state: GameState, _playerId: string, _move: Move): void {
    this.beforeApplyMoveCalled = true;
  }

  applyMove(state: GameState, _playerId: string, move: Move): GameState {
    return {
      ...state,
      moveHistory: [...state.moveHistory, move],
      version: state.version + 1,
      updatedAt: new Date(),
    };
  }

  afterApplyMove(_oldState: GameState, _newState: GameState, _move: Move): void {
    this.afterApplyMoveCalled = true;
  }

  isGameOver(_state: GameState): boolean {
    return this.isGameOverResult;
  }

  getWinner(_state: GameState): string | null {
    return this.getWinnerResult;
  }

  getCurrentPlayer(state: GameState): string {
    return state.players[state.currentPlayerIndex].id;
  }

  getNextPlayer(state: GameState): string {
    const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    return state.players[nextIndex].id;
  }

  advanceTurn(state: GameState): GameState {
    const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    return {
      ...state,
      currentPlayerIndex: nextIndex,
    };
  }

  renderBoard(_state: GameState): BoardRenderData {
    return {
      viewBox: { width: 100, height: 100 },
      spaces: [],
      layers: [],
    };
  }
}

// Helper function to create mock game state
function createMockGameState(players: Player[]): GameState {
  return {
    gameId: 'test-game-1',
    gameType: 'mock-game',
    lifecycle: GameLifecycle.ACTIVE,
    players,
    currentPlayerIndex: 0,
    phase: 'main',
    board: { spaces: [], metadata: {} } as Board,
    moveHistory: [],
    metadata: {},
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper function to create mock players
function createMockPlayers(): Player[] {
  return [
    {
      id: 'player1',
      name: 'Player 1',
      joinedAt: new Date(),
    },
    {
      id: 'player2',
      name: 'Player 2',
      joinedAt: new Date(),
    },
  ];
}

describe('StateManagerService', () => {
  let stateManager: StateManagerService;
  let repository: InMemoryGameRepository;
  let pluginRegistry: PluginRegistry;
  let lockManager: GameLockManager;
  let mockEngine: MockGameEngine;

  beforeEach(() => {
    repository = new InMemoryGameRepository();
    pluginRegistry = new PluginRegistry();
    lockManager = new GameLockManager();
    mockEngine = new MockGameEngine();
    pluginRegistry.register(mockEngine);

    stateManager = new StateManagerService(
      repository,
      pluginRegistry,
      lockManager
    );
  });

  describe('validateMove', () => {
    it('should delegate validation to the game engine plugin', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'test-action',
        parameters: {},
      };

      // Act
      const result = await stateManager.validateMove(
        'test-game-1',
        'player1',
        move
      );

      // Assert
      expect(result.valid).toBe(true);
    });

    it('should return invalid result when plugin validation fails', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'invalid',
        parameters: {},
      };

      // Act
      const result = await stateManager.validateMove(
        'test-game-1',
        'player1',
        move
      );

      // Assert
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid move action');
    });

    it('should throw GameNotFoundError when game does not exist', async () => {
      // Arrange
      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'test-action',
        parameters: {},
      };

      // Act & Assert
      await expect(
        stateManager.validateMove('non-existent-game', 'player1', move)
      ).rejects.toThrow(GameNotFoundError);
    });
  });

  describe('applyMove', () => {
    it('should apply a valid move and update game state', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'test-action',
        parameters: {},
      };

      // Act
      const updatedState = await stateManager.applyMove(
        'test-game-1',
        'player1',
        move,
        1
      );

      // Assert
      expect(updatedState.moveHistory).toHaveLength(1);
      expect(updatedState.moveHistory[0]).toEqual(move);
      expect(updatedState.version).toBe(2);
    });

    it('should throw UnauthorizedMoveError when player is not in the game', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      const move: Move = {
        playerId: 'non-existent-player',
        timestamp: new Date(),
        action: 'test-action',
        parameters: {},
      };

      // Act & Assert
      await expect(
        stateManager.applyMove('test-game-1', 'non-existent-player', move, 1)
      ).rejects.toThrow(UnauthorizedMoveError);
    });

    it('should throw UnauthorizedMoveError when it is not the player\'s turn', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      const move: Move = {
        playerId: 'player2',
        timestamp: new Date(),
        action: 'test-action',
        parameters: {},
      };

      // Act & Assert
      await expect(
        stateManager.applyMove('test-game-1', 'player2', move, 1)
      ).rejects.toThrow(UnauthorizedMoveError);
    });

    it('should throw InvalidMoveError when move validation fails', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'invalid',
        parameters: {},
      };

      // Act & Assert
      await expect(
        stateManager.applyMove('test-game-1', 'player1', move, 1)
      ).rejects.toThrow(InvalidMoveError);
    });

    it('should throw ConcurrencyError when version mismatch occurs', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'test-action',
        parameters: {},
      };

      // Act & Assert
      await expect(
        stateManager.applyMove('test-game-1', 'player1', move, 999)
      ).rejects.toThrow(ConcurrencyError);
    });

    it('should track move history correctly', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      const move1: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'move1',
        parameters: {},
      };

      const move2: Move = {
        playerId: 'player2', // Changed to player2 since turn advances
        timestamp: new Date(),
        action: 'move2',
        parameters: {},
      };

      // Act
      await stateManager.applyMove(
        'test-game-1',
        'player1',
        move1,
        1
      );
      const state2 = await stateManager.applyMove(
        'test-game-1',
        'player2', // Changed to player2 since turn advances
        move2,
        2
      );

      // Assert
      expect(state2.moveHistory).toHaveLength(2);
      expect(state2.moveHistory[0]).toEqual(move1);
      expect(state2.moveHistory[1]).toEqual(move2);
    });

    it('should detect game over and transition to COMPLETED lifecycle', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      mockEngine.isGameOverResult = true;
      mockEngine.getWinnerResult = 'player1';

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'winning-move',
        parameters: {},
      };

      // Act
      const updatedState = await stateManager.applyMove(
        'test-game-1',
        'player1',
        move,
        1
      );

      // Assert
      expect(updatedState.lifecycle).toBe(GameLifecycle.COMPLETED);
    });

    it('should invoke beforeApplyMove hook', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'test-action',
        parameters: {},
      };

      // Act
      await stateManager.applyMove('test-game-1', 'player1', move, 1);

      // Assert
      expect(mockEngine.beforeApplyMoveCalled).toBe(true);
    });

    it('should invoke afterApplyMove hook', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'test-action',
        parameters: {},
      };

      // Act
      await stateManager.applyMove('test-game-1', 'player1', move, 1);

      // Assert
      expect(mockEngine.afterApplyMoveCalled).toBe(true);
    });

    it('should use GameLockManager for concurrency control', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      const move1: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'move1',
        parameters: {},
      };

      const move2: Move = {
        playerId: 'player2', // Changed to player2 to match turn order
        timestamp: new Date(),
        action: 'move2',
        parameters: {},
      };

      // Act - Submit two moves concurrently with same expected version
      // Both expect version 1, but only one should succeed
      const promise1 = stateManager.applyMove('test-game-1', 'player1', move1, 1);
      const promise2 = stateManager.applyMove('test-game-1', 'player2', move2, 1);

      // Assert - One should succeed, one should fail due to version mismatch
      const results = await Promise.allSettled([promise1, promise2]);
      
      // One should be fulfilled, one should be rejected
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');
      
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      
      // The rejected one should be a ConcurrencyError
      const rejectedResult = rejected[0] as PromiseRejectedResult;
      expect(rejectedResult.reason).toBeInstanceOf(ConcurrencyError);
    });
  });
});
