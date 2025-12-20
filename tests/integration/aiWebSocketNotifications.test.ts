/**
 * Integration tests for AI move WebSocket notifications
 * Requirements: 5.5, 7.4
 */

import { Server } from 'http';
import express from 'express';
import WebSocket from 'ws';
import { createApp, finalizeApp } from '../../src/adapters/rest/app';
import { setupWebSocketServer } from '../../src/adapters/rest/websocketAdapter';
import { WebSocketManager } from '../../src/infrastructure/websocket/WebSocketManager';
import { InMemoryPlayerIdentityRepository } from '../../src/infrastructure/persistence/InMemoryPlayerIdentityRepository';
import { InMemoryGameRepository } from '../../src/infrastructure/persistence/InMemoryGameRepository';
import { InMemoryAIPlayerRepository } from '../../src/infrastructure/persistence/InMemoryAIPlayerRepository';
import { GameManagerService } from '../../src/application/services/GameManagerService';
import { StateManagerService } from '../../src/application/services/StateManagerService';
import { AIPlayerService } from '../../src/application/services/AIPlayerService';
import { PluginRegistry } from '../../src/application/PluginRegistry';
import { GameLockManager } from '../../src/application/GameLockManager';
import { WebSocketMessageType } from '../../src/domain/interfaces/IWebSocketService';
import { TicTacToeEngine } from '../../games/tic-tac-toe/engine';

describe('AI WebSocket Notifications Integration Tests', () => {
  let server: Server;
  let app: express.Express;
  let wsManager: WebSocketManager;
  let playerIdentityRepo: InMemoryPlayerIdentityRepository;
  let gameRepository: InMemoryGameRepository;
  let aiPlayerRepository: InMemoryAIPlayerRepository;
  let gameManagerService: GameManagerService;
  let stateManagerService: StateManagerService;
  let aiPlayerService: AIPlayerService;
  let pluginRegistry: PluginRegistry;
  let wsUrl: string;

  // Test user data
  const testUserId = 'test-user-websocket';
  const testToken = 'test-token-websocket';

  beforeAll(async () => {
    // Create repositories
    playerIdentityRepo = new InMemoryPlayerIdentityRepository();
    gameRepository = new InMemoryGameRepository();
    aiPlayerRepository = new InMemoryAIPlayerRepository();

    // Create test player identity
    await playerIdentityRepo.create({
      name: 'Test User WebSocket',
      externalAuthProvider: 'test',
      externalAuthId: testUserId,
      email: 'test-websocket@example.com',
    });

    // Create WebSocket manager
    wsManager = new WebSocketManager();

    // Create plugin registry and register TicTacToe
    pluginRegistry = new PluginRegistry();
    pluginRegistry.register(new TicTacToeEngine());

    // Create services
    const lockManager = new GameLockManager();
    aiPlayerService = new AIPlayerService(pluginRegistry, aiPlayerRepository, gameRepository);
    stateManagerService = new StateManagerService(
      gameRepository,
      pluginRegistry,
      lockManager,
      wsManager,
      aiPlayerService
    );
    gameManagerService = new GameManagerService(pluginRegistry, gameRepository, aiPlayerService);

    // Create Express app
    app = createApp(playerIdentityRepo);

    // Finalize app
    finalizeApp(app);

    // Start server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          const port = address.port;
          wsUrl = `ws://localhost:${port}`;
        }
        resolve();
      });
    });

    // Setup WebSocket server on the HTTP server
    setupWebSocketServer(server, wsManager, playerIdentityRepo);
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  describe('AI Move WebSocket Events', () => {
    let ws: WebSocket;
    let gameId: string;

    beforeEach(async () => {
      // Create a game with one human player and one AI player
      const gameState = await gameManagerService.createGame(
        'tic-tac-toe',
        {
          players: [
            {
              id: testUserId,
              name: 'Human Player',
              joinedAt: new Date(),
            },
          ],
          aiPlayers: [
            {
              name: 'AI Player',
              strategyId: 'easy',
            },
          ],
        },
        { id: testUserId, username: 'Test User' },
        'AI WebSocket Test Game'
      );

      gameId = gameState.gameId;

      // Setup WebSocket connection
      await new Promise<void>((resolve, reject) => {
        ws = new WebSocket(`${wsUrl}/api/ws?token=${testToken}`);
        ws.on('open', () => resolve());
        ws.on('error', reject);
      });

      // Subscribe to game updates
      await new Promise<void>((resolve) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'subscribed') {
            resolve();
          }
        });

        ws.send(JSON.stringify({ type: 'subscribe', gameId }));
      });
    });

    afterEach(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    it('should receive WebSocket notification when AI makes a move', (done) => {
      // Requirement: 5.5
      let moveCount = 0;

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === WebSocketMessageType.GAME_UPDATE) {
          moveCount++;

          if (moveCount === 1) {
            // First move - human move
            expect(message.gameState).toBeDefined();
            expect(message.gameState.gameId).toBe(gameId);
            expect(message.gameState.moveHistory).toHaveLength(1);

            // Verify the move was made by human player
            const lastMove = message.gameState.moveHistory[0];
            expect(lastMove.playerId).toBe(testUserId);
          } else if (moveCount === 2) {
            // Second move - AI move
            expect(message.gameState).toBeDefined();
            expect(message.gameState.gameId).toBe(gameId);
            expect(message.gameState.moveHistory).toHaveLength(2);

            // Verify AI player made the move
            const lastMove = message.gameState.moveHistory[1];
            const aiPlayer = message.gameState.players.find((p: any) => p.metadata?.isAI === true);
            expect(lastMove.playerId).toBe(aiPlayer.id);

            done();
          }
        }
      });

      // Make a human move to trigger AI response
      stateManagerService
        .applyMove(
          gameId,
          testUserId,
          {
            playerId: testUserId,
            timestamp: new Date(),
            action: 'place',
            parameters: { row: 0, col: 0 }, // Top-left corner
          },
          1
        )
        .catch(done);
    });

    it('should maintain consistent event format between human and AI moves', (done) => {
      // Requirement: 5.5
      const receivedMessages: any[] = [];

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === WebSocketMessageType.GAME_UPDATE) {
          receivedMessages.push(message);

          if (receivedMessages.length === 2) {
            const humanMoveMessage = receivedMessages[0];
            const aiMoveMessage = receivedMessages[1];

            // Verify both messages have the same structure
            expect(humanMoveMessage).toHaveProperty('type', WebSocketMessageType.GAME_UPDATE);
            expect(humanMoveMessage).toHaveProperty('gameId', gameId);
            expect(humanMoveMessage).toHaveProperty('gameState');
            expect(humanMoveMessage).toHaveProperty('timestamp');

            expect(aiMoveMessage).toHaveProperty('type', WebSocketMessageType.GAME_UPDATE);
            expect(aiMoveMessage).toHaveProperty('gameId', gameId);
            expect(aiMoveMessage).toHaveProperty('gameState');
            expect(aiMoveMessage).toHaveProperty('timestamp');

            // Verify both messages have identical structure (no AI-specific flags)
            expect(Object.keys(humanMoveMessage).sort()).toEqual(Object.keys(aiMoveMessage).sort());

            // Verify AI metadata is present in game state
            expect(aiMoveMessage.gameState.metadata.hasAIPlayers).toBe(true);
            expect(aiMoveMessage.gameState.metadata.aiPlayerCount).toBe(1);

            // Verify we can distinguish move sources from player metadata
            const humanMove = humanMoveMessage.gameState.moveHistory[0];
            const aiMove = aiMoveMessage.gameState.moveHistory[1];

            const humanPlayer = aiMoveMessage.gameState.players.find(
              (p: any) => p.id === humanMove.playerId
            );
            const aiPlayer = aiMoveMessage.gameState.players.find(
              (p: any) => p.id === aiMove.playerId
            );

            expect(humanPlayer.metadata?.isAI).toBeFalsy();
            expect(aiPlayer.metadata?.isAI).toBe(true);

            done();
          }
        }
      });

      // Make a human move to trigger AI response
      stateManagerService
        .applyMove(
          gameId,
          testUserId,
          {
            playerId: testUserId,
            timestamp: new Date(),
            action: 'place',
            parameters: { row: 1, col: 1 }, // Center
          },
          1
        )
        .catch(done);
    });

    it('should include AI player information in game state', (done) => {
      // Requirement: 5.5
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === WebSocketMessageType.GAME_UPDATE) {
          const gameState = message.gameState;

          // Check if this is an AI move by looking at the last move
          const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
          const lastMovePlayer = gameState.players.find((p: any) => p.id === lastMove.playerId);

          if (lastMovePlayer?.metadata?.isAI === true) {
            // Verify AI player metadata
            const aiPlayer = gameState.players.find((p: any) => p.metadata?.isAI === true);
            expect(aiPlayer).toBeDefined();
            expect(aiPlayer.metadata.isAI).toBe(true);
            expect(aiPlayer.metadata.strategyId).toBe('easy');

            // Verify game metadata includes AI information
            expect(gameState.metadata.hasAIPlayers).toBe(true);
            expect(gameState.metadata.aiPlayerCount).toBe(1);

            done();
          }
        }
      });

      // Make a human move to trigger AI response
      stateManagerService
        .applyMove(
          gameId,
          testUserId,
          {
            playerId: testUserId,
            timestamp: new Date(),
            action: 'place',
            parameters: { row: 2, col: 2 }, // Bottom-right corner
          },
          1
        )
        .catch(done);
    });
  });

  describe('AI Error Notifications', () => {
    it('should handle invalid AI strategy creation errors', async () => {
      // Requirement: 7.4
      // Test that creating a game with invalid AI strategy throws appropriate error
      await expect(
        gameManagerService.createGame(
          'tic-tac-toe',
          {
            players: [
              {
                id: testUserId,
                name: 'Human Player',
                joinedAt: new Date(),
              },
            ],
            aiPlayers: [
              {
                name: 'AI Player',
                strategyId: 'nonexistent', // This will cause an error
              },
            ],
          },
          { id: testUserId, username: 'Test User' },
          'AI Error Test Game'
        )
      ).rejects.toThrow("AI strategy 'nonexistent' not found for game type 'tic-tac-toe'");
    });
  });
});
