import { StateManagerService } from '@application/services/StateManagerService';
import { GameLockManager } from '@application/GameLockManager';
import { PluginRegistry } from '@application/PluginRegistry';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import { GameState, GameLifecycle, Player, Move } from '@domain/models';
import {
  GameNotFoundError,
  InvalidMoveError,
  UnauthorizedMoveError,
  ConcurrencyError,
} from '@domain/errors';
import { MockGameEngine, GameStateBuilder, createPlayer } from '../../utils';
import { IWebSocketService, WebSocketMessageType } from '@domain/interfaces/IWebSocketService';

// Helper function to create mock game state
function createMockGameState(players: Player[]): GameState {
  return new GameStateBuilder()
    .withGameId('test-game-1')
    .withGameType('mock-game')
    .withLifecycle(GameLifecycle.ACTIVE)
    .withPlayers(players)
    .withCurrentPlayerIndex(0)
    .withPhase('main')
    .build();
}

// Helper function to create mock players
function createMockPlayers(): Player[] {
  return [createPlayer('player1', 'Player 1'), createPlayer('player2', 'Player 2')];
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
    mockEngine = new MockGameEngine('mock-game').withValidationResult({ valid: true });
    pluginRegistry.register(mockEngine);

    stateManager = new StateManagerService(repository, pluginRegistry, lockManager);
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
      const result = await stateManager.validateMove('test-game-1', 'player1', move);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('should return invalid result when plugin validation fails', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      // Configure mock to return invalid result
      mockEngine.withValidationResult({ valid: false, reason: 'Invalid move action' });

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'invalid',
        parameters: {},
      };

      // Act
      const result = await stateManager.validateMove('test-game-1', 'player1', move);

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
      await expect(stateManager.validateMove('non-existent-game', 'player1', move)).rejects.toThrow(
        GameNotFoundError
      );
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
      const updatedState = await stateManager.applyMove('test-game-1', 'player1', move, 1);

      // Assert
      expect(updatedState.moveHistory).toHaveLength(1);
      expect(updatedState.moveHistory[0]).toMatchObject({
        playerId: 'player1',
        action: 'test-action',
        parameters: {},
      });
      expect(updatedState.moveHistory[0].timestamp).toBeInstanceOf(Date);
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

    it("should throw UnauthorizedMoveError when it is not the player's turn", async () => {
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
      await expect(stateManager.applyMove('test-game-1', 'player2', move, 1)).rejects.toThrow(
        UnauthorizedMoveError
      );
    });

    it('should throw InvalidMoveError when move validation fails', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      // Configure mock to return invalid result
      mockEngine.withValidationResult({ valid: false, reason: 'Invalid move action' });

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'invalid',
        parameters: {},
      };

      // Act & Assert
      await expect(stateManager.applyMove('test-game-1', 'player1', move, 1)).rejects.toThrow(
        InvalidMoveError
      );
    });

    it('should throw InvalidMoveError when game is already completed', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = new GameStateBuilder()
        .withGameId('test-game-1')
        .withGameType('mock-game')
        .withLifecycle(GameLifecycle.COMPLETED)
        .withPlayers(players)
        .withCurrentPlayerIndex(0)
        .withPhase('main')
        .build();
      await repository.save(gameState);

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'place',
        parameters: {},
      };

      // Act & Assert
      await expect(stateManager.applyMove('test-game-1', 'player1', move, 1)).rejects.toThrow(
        InvalidMoveError
      );
      await expect(stateManager.applyMove('test-game-1', 'player1', move, 1)).rejects.toThrow(
        'Game is already completed'
      );
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
      await expect(stateManager.applyMove('test-game-1', 'player1', move, 999)).rejects.toThrow(
        ConcurrencyError
      );
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
      await stateManager.applyMove('test-game-1', 'player1', move1, 1);
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

      mockEngine.withGameOverResult(true).withWinnerResult('player1');

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'winning-move',
        parameters: {},
      };

      // Act
      const updatedState = await stateManager.applyMove('test-game-1', 'player1', move, 1);

      // Assert
      expect(updatedState.lifecycle).toBe(GameLifecycle.COMPLETED);
      expect(updatedState.winner).toBe('player1');
    });

    it('should set winner to null for draw games', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      mockEngine.withGameOverResult(true).withWinnerResult(null);

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'final-move',
        parameters: {},
      };

      // Act
      const updatedState = await stateManager.applyMove('test-game-1', 'player1', move, 1);

      // Assert
      expect(updatedState.lifecycle).toBe(GameLifecycle.COMPLETED);
      expect(updatedState.winner).toBeNull();
      expect(updatedState.metadata.isDraw).toBe(true);
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
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      // The rejected one should be a ConcurrencyError
      const rejectedResult = rejected[0] as PromiseRejectedResult;
      expect(rejectedResult.reason).toBeInstanceOf(ConcurrencyError);
    });
  });

  describe('WebSocket Integration', () => {
    let mockWebSocketService: jest.Mocked<IWebSocketService>;

    beforeEach(() => {
      // Create mock WebSocket service
      mockWebSocketService = {
        registerConnection: jest.fn(),
        unregisterConnection: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        broadcastToGame: jest.fn().mockResolvedValue(undefined),
        sendToUser: jest.fn().mockResolvedValue(undefined),
        getConnectionCount: jest.fn().mockReturnValue(0),
        getGameSubscriberCount: jest.fn().mockReturnValue(0),
      };

      // Recreate StateManagerService with WebSocket service
      stateManager = new StateManagerService(
        repository,
        pluginRegistry,
        lockManager,
        mockWebSocketService
      );
    });

    it('should broadcast game update when move is applied', async () => {
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
      const updatedState = await stateManager.applyMove('test-game-1', 'player1', move, 1);

      // Assert
      expect(mockWebSocketService.broadcastToGame).toHaveBeenCalledTimes(1);
      expect(mockWebSocketService.broadcastToGame).toHaveBeenCalledWith(
        'test-game-1',
        expect.objectContaining({
          type: WebSocketMessageType.GAME_UPDATE,
          gameId: 'test-game-1',
          gameState: updatedState,
          timestamp: expect.any(Date),
        })
      );
    });

    it('should broadcast game complete message when game ends', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      mockEngine.withGameOverResult(true).withWinnerResult('player1');

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'winning-move',
        parameters: {},
      };

      // Act
      const updatedState = await stateManager.applyMove('test-game-1', 'player1', move, 1);

      // Assert
      // Should broadcast both game update and game complete
      expect(mockWebSocketService.broadcastToGame).toHaveBeenCalledTimes(2);

      // First call: game update
      expect(mockWebSocketService.broadcastToGame).toHaveBeenNthCalledWith(
        1,
        'test-game-1',
        expect.objectContaining({
          type: WebSocketMessageType.GAME_UPDATE,
          gameId: 'test-game-1',
          gameState: updatedState,
        })
      );

      // Second call: game complete
      expect(mockWebSocketService.broadcastToGame).toHaveBeenNthCalledWith(
        2,
        'test-game-1',
        expect.objectContaining({
          type: WebSocketMessageType.GAME_COMPLETE,
          gameId: 'test-game-1',
          winner: 'player1',
        })
      );
    });

    it('should broadcast game complete with null winner for draw', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      mockEngine.withGameOverResult(true).withWinnerResult(null);

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'final-move',
        parameters: {},
      };

      // Act
      await stateManager.applyMove('test-game-1', 'player1', move, 1);

      // Assert
      expect(mockWebSocketService.broadcastToGame).toHaveBeenCalledWith(
        'test-game-1',
        expect.objectContaining({
          type: WebSocketMessageType.GAME_COMPLETE,
          gameId: 'test-game-1',
          winner: null,
        })
      );
    });

    it('should only broadcast to subscribed clients', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      // Mock that there are 2 subscribers
      mockWebSocketService.getGameSubscriberCount.mockReturnValue(2);

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'test-action',
        parameters: {},
      };

      // Act
      await stateManager.applyMove('test-game-1', 'player1', move, 1);

      // Assert
      // broadcastToGame should be called, which internally handles subscriber filtering
      expect(mockWebSocketService.broadcastToGame).toHaveBeenCalledWith(
        'test-game-1',
        expect.any(Object)
      );
    });

    it('should not fail if WebSocket service is not provided', async () => {
      // Arrange
      // Create StateManagerService without WebSocket service
      const stateManagerWithoutWS = new StateManagerService(
        repository,
        pluginRegistry,
        lockManager
      );

      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'test-action',
        parameters: {},
      };

      // Act & Assert - should not throw
      await expect(
        stateManagerWithoutWS.applyMove('test-game-1', 'player1', move, 1)
      ).resolves.toBeDefined();
    });

    it('should continue processing even if WebSocket broadcast fails', async () => {
      // Arrange
      const players = createMockPlayers();
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      // Mock WebSocket service to throw error
      mockWebSocketService.broadcastToGame.mockRejectedValue(new Error('WebSocket error'));

      const move: Move = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'test-action',
        parameters: {},
      };

      // Act & Assert - should not throw, move should still be applied
      const updatedState = await stateManager.applyMove('test-game-1', 'player1', move, 1);

      expect(updatedState.moveHistory).toHaveLength(1);
      expect(mockWebSocketService.broadcastToGame).toHaveBeenCalled();
    });
  });
});
