import { StateManagerService } from '@application/services/StateManagerService';
import { AIPlayerService } from '@application/services/AIPlayerService';
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

      const testStartTime = new Date();
      const move1: Move = {
        playerId: 'player1',
        timestamp: new Date(), // This will be overridden by the service
        action: 'move1',
        parameters: {},
      };

      const move2: Move = {
        playerId: 'player2', // Changed to player2 since turn advances
        timestamp: new Date(), // This will be overridden by the service
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
      expect(state2.moveHistory[0]).toMatchObject({
        playerId: 'player1',
        action: 'move1',
        parameters: {},
      });
      expect(state2.moveHistory[1]).toMatchObject({
        playerId: 'player2',
        action: 'move2',
        parameters: {},
      });
      // Verify timestamps are recent (within 1 second of test start)
      const testEndTime = new Date();
      expect(state2.moveHistory[0].timestamp.getTime()).toBeGreaterThanOrEqual(
        testStartTime.getTime()
      );
      expect(state2.moveHistory[0].timestamp.getTime()).toBeLessThanOrEqual(testEndTime.getTime());
      expect(state2.moveHistory[1].timestamp.getTime()).toBeGreaterThanOrEqual(
        testStartTime.getTime()
      );
      expect(state2.moveHistory[1].timestamp.getTime()).toBeLessThanOrEqual(testEndTime.getTime());
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
          gameState: expect.objectContaining({
            ...updatedState,
            metadata: expect.objectContaining({
              ...updatedState.metadata,
              hasAIPlayers: false,
              aiPlayerCount: 0,
            }),
          }),
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
          gameState: expect.objectContaining({
            ...updatedState,
            metadata: expect.objectContaining({
              ...updatedState.metadata,
              hasAIPlayers: false,
              aiPlayerCount: 0,
            }),
          }),
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

  describe('AI Turn Processing', () => {
    let mockAIPlayerService: jest.Mocked<AIPlayerService>;

    beforeEach(() => {
      // Create mock AI player service
      mockAIPlayerService = {
        createAIPlayers: jest.fn(),
        isAIPlayer: jest.fn(),
        getAvailableStrategies: jest.fn(),
        processAITurn: jest.fn(),
      } as unknown as jest.Mocked<AIPlayerService>;

      // Recreate StateManagerService with AI service
      stateManager = new StateManagerService(
        repository,
        pluginRegistry,
        lockManager,
        undefined, // No WebSocket for these tests
        mockAIPlayerService
      );
    });

    it('should detect AI turn after human move and process AI move', async () => {
      // Arrange
      const humanPlayer = createPlayer('human1', 'Human Player');
      const aiPlayer = createPlayer('ai1', 'AI Player');
      const players = [humanPlayer, aiPlayer];
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      // Mock AI service responses
      mockAIPlayerService.isAIPlayer.mockImplementation(async (playerId) => {
        return playerId === 'ai1';
      });

      // Mock AI turn processing to return updated state
      mockAIPlayerService.processAITurn.mockImplementation(async (gameId) => {
        const baseState = await repository.findById(gameId);
        if (!baseState) throw new Error('Game not found');

        const updatedState = {
          ...baseState,
          moveHistory: [
            ...baseState.moveHistory,
            {
              playerId: 'ai1',
              timestamp: new Date(),
              action: 'ai-move',
              parameters: {},
            },
          ],
          currentPlayerIndex: 0, // Back to human player
          version: baseState.version + 1,
          updatedAt: new Date(),
        };

        // Update repository to simulate real behavior
        await repository.update(gameId, updatedState, baseState.version);
        return updatedState;
      });

      // Configure mock engine to return correct current player
      mockEngine.getCurrentPlayer = jest.fn().mockImplementation((state) => {
        // During authorization: human1's turn
        if (state.moveHistory.length === 0) {
          return 'human1';
        }
        // After human move: AI's turn
        if (state.moveHistory.length === 1) {
          return 'ai1';
        }
        // After AI move: back to human
        return 'human1';
      });

      const humanMove: Move = {
        playerId: 'human1',
        timestamp: new Date(),
        action: 'human-move',
        parameters: {},
      };

      // Act
      const finalState = await stateManager.applyMove('test-game-1', 'human1', humanMove, 1);

      // Assert
      expect(mockAIPlayerService.isAIPlayer).toHaveBeenCalledWith('ai1');
      expect(mockAIPlayerService.processAITurn).toHaveBeenCalledWith('test-game-1', 'ai1');
      expect(finalState.moveHistory).toHaveLength(2);
      expect(finalState.moveHistory[1].playerId).toBe('ai1');
    });

    it('should process consecutive AI turns until human player turn', async () => {
      // Arrange
      const humanPlayer = createPlayer('human1', 'Human Player');
      const ai1Player = createPlayer('ai1', 'AI Player 1');
      const ai2Player = createPlayer('ai2', 'AI Player 2');
      const players = [humanPlayer, ai1Player, ai2Player];
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      // Mock AI service responses
      mockAIPlayerService.isAIPlayer.mockImplementation(async (playerId) => {
        return playerId === 'ai1' || playerId === 'ai2';
      });

      // Track AI processing calls
      let aiCallCount = 0;
      mockAIPlayerService.processAITurn.mockImplementation(async (gameId, aiPlayerId) => {
        aiCallCount++;
        const baseState = await repository.findById(gameId);
        if (!baseState) throw new Error('Game not found');

        // Create updated state with proper player advancement
        const nextPlayerIndex = aiCallCount >= 2 ? 0 : aiCallCount; // After 2 AI moves, back to human
        const updatedState = {
          ...baseState,
          moveHistory: [
            ...baseState.moveHistory,
            {
              playerId: aiPlayerId,
              timestamp: new Date(),
              action: `ai-move-${aiCallCount}`,
              parameters: {},
            },
          ],
          currentPlayerIndex: nextPlayerIndex,
          version: baseState.version + 1,
          updatedAt: new Date(),
        };

        // Update repository to simulate real behavior
        await repository.update(gameId, updatedState, baseState.version);
        return updatedState;
      });

      // Configure mock engine to return correct current player
      mockEngine.getCurrentPlayer = jest.fn().mockImplementation((state) => {
        return state.players[state.currentPlayerIndex].id;
      });

      const humanMove: Move = {
        playerId: 'human1',
        timestamp: new Date(),
        action: 'human-move',
        parameters: {},
      };

      // Act
      const finalState = await stateManager.applyMove('test-game-1', 'human1', humanMove, 1);

      // Assert
      expect(mockAIPlayerService.processAITurn).toHaveBeenCalledTimes(2);
      expect(finalState.moveHistory.length).toBe(3); // Human + 2 AI moves
      expect(finalState.currentPlayerIndex).toBe(0); // Back to human player
    });

    it('should stop processing AI turns when game ends', async () => {
      // Arrange
      const humanPlayer = createPlayer('human1', 'Human Player');
      const aiPlayer = createPlayer('ai1', 'AI Player');
      const players = [humanPlayer, aiPlayer];

      // Create initial game state with human player's turn
      const gameState = new GameStateBuilder()
        .withGameId('test-game-1')
        .withGameType('mock-game')
        .withLifecycle(GameLifecycle.ACTIVE)
        .withPlayers(players)
        .withCurrentPlayerIndex(0) // Human player's turn
        .withPhase('main')
        .build();

      await repository.save(gameState);

      // Mock AI service responses
      mockAIPlayerService.isAIPlayer.mockImplementation(async (playerId) => {
        return playerId === 'ai1';
      });

      // Mock AI turn that ends the game
      mockAIPlayerService.processAITurn.mockImplementation(async (gameId) => {
        const baseState = await repository.findById(gameId);
        if (!baseState) throw new Error('Game not found');

        const gameEndingState = {
          ...baseState,
          moveHistory: [
            ...baseState.moveHistory,
            {
              playerId: 'ai1',
              timestamp: new Date(),
              action: 'winning-ai-move',
              parameters: {},
            },
          ],
          currentPlayerIndex: 0,
          version: baseState.version + 1,
          updatedAt: new Date(),
        };

        await repository.update(gameId, gameEndingState, baseState.version);
        return gameEndingState;
      });

      // Configure mock engine to advance turn to AI after human move
      mockEngine.getCurrentPlayer = jest.fn().mockImplementation((state) => {
        return state.players[state.currentPlayerIndex].id;
      });

      // Configure mock engine to detect game over after AI move
      mockEngine.withGameOverResult(false); // Game not over initially

      // Override isGameOver to return true only after AI move
      mockEngine.isGameOver = jest.fn().mockImplementation((state) => {
        return state.moveHistory.some((move: Move) => move.playerId === 'ai1');
      });

      mockEngine.withWinnerResult('ai1');

      const humanMove: Move = {
        playerId: 'human1',
        timestamp: new Date(),
        action: 'human-move',
        parameters: {},
      };

      // Act
      const finalState = await stateManager.applyMove('test-game-1', 'human1', humanMove, 1);

      // Assert
      expect(mockAIPlayerService.processAITurn).toHaveBeenCalledTimes(1);
      expect(finalState.lifecycle).toBe(GameLifecycle.COMPLETED);
      expect(finalState.winner).toBe('ai1');
    });

    it('should stop processing AI turns at human player turn', async () => {
      // Arrange
      const human1Player = createPlayer('human1', 'Human Player 1');
      const aiPlayer = createPlayer('ai1', 'AI Player');
      const human2Player = createPlayer('human2', 'Human Player 2');
      const players = [human1Player, aiPlayer, human2Player];
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      // Mock AI service responses - only ai1 is AI
      mockAIPlayerService.isAIPlayer.mockImplementation(async (playerId) => {
        return playerId === 'ai1';
      });

      // Mock AI turn that advances to next human player
      mockAIPlayerService.processAITurn.mockImplementation(async (gameId) => {
        const baseState = await repository.findById(gameId);
        if (!baseState) throw new Error('Game not found');

        const aiProcessedState = {
          ...baseState,
          moveHistory: [
            ...baseState.moveHistory,
            {
              playerId: 'ai1',
              timestamp: new Date(),
              action: 'ai-move',
              parameters: {},
            },
          ],
          currentPlayerIndex: 2, // Next player is human2
          version: baseState.version + 1,
          updatedAt: new Date(),
        };

        await repository.update(gameId, aiProcessedState, baseState.version);
        return aiProcessedState;
      });

      // Configure mock engine to return correct current player
      mockEngine.getCurrentPlayer = jest.fn().mockImplementation((state) => {
        return state.players[state.currentPlayerIndex].id;
      });

      const humanMove: Move = {
        playerId: 'human1',
        timestamp: new Date(),
        action: 'human-move',
        parameters: {},
      };

      // Act
      const finalState = await stateManager.applyMove('test-game-1', 'human1', humanMove, 1);

      // Assert
      expect(mockAIPlayerService.processAITurn).toHaveBeenCalledTimes(1);
      expect(mockAIPlayerService.isAIPlayer).toHaveBeenCalledWith('human2');
      expect(finalState.currentPlayerIndex).toBe(2); // Should stop at human2's turn
    });

    it('should handle AI processing errors gracefully', async () => {
      // Arrange
      const humanPlayer = createPlayer('human1', 'Human Player');
      const aiPlayer = createPlayer('ai1', 'AI Player');
      const players = [humanPlayer, aiPlayer];
      const gameState = createMockGameState(players);
      await repository.save(gameState);

      // Mock AI service responses
      mockAIPlayerService.isAIPlayer.mockImplementation(async (playerId) => {
        return playerId === 'ai1';
      });

      // Mock AI service to throw error
      mockAIPlayerService.processAITurn.mockRejectedValue(new Error('AI processing failed'));

      // Configure mock engine
      mockEngine.getCurrentPlayer = jest.fn().mockImplementation((state) => {
        // During authorization check, it should be human1's turn initially
        if (state.moveHistory.length === 0) {
          return 'human1';
        }
        // After human move, it should be AI's turn
        return 'ai1';
      });

      const humanMove: Move = {
        playerId: 'human1',
        timestamp: new Date(),
        action: 'human-move',
        parameters: {},
      };

      // Act & Assert - should not throw, should handle error gracefully
      const finalState = await stateManager.applyMove('test-game-1', 'human1', humanMove, 1);

      expect(mockAIPlayerService.processAITurn).toHaveBeenCalledWith('test-game-1', 'ai1');
      expect(finalState.moveHistory).toHaveLength(1); // Only human move should be recorded
      expect(finalState.lifecycle).toBe(GameLifecycle.ACTIVE); // Game should continue
    });

    it('should work without AI service provided', async () => {
      // Arrange
      const stateManagerWithoutAI = new StateManagerService(
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

      // Act & Assert - should work normally without AI processing
      const updatedState = await stateManagerWithoutAI.applyMove('test-game-1', 'player1', move, 1);

      expect(updatedState.moveHistory).toHaveLength(1);
      expect(updatedState.moveHistory[0].playerId).toBe('player1');
    });
  });
});
