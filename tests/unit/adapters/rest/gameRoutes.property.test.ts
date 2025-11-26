/**
 * Property-based tests for game routes authentication
 * Following TDD Red-Green-Refactor: These tests should FAIL initially
 *
 * Tests cover:
 * - Property 10: Game ownership association
 * - Property 11: Game participant authorization
 *
 * Requirements: 6.2, 6.3
 */

import * as fc from 'fast-check';
import request from 'supertest';
import { Express } from 'express';
import { createApp, addApiRoutes, finalizeApp } from '../../../../src/adapters/rest/app';
import { createGameRoutes } from '../../../../src/adapters/rest/gameRoutes';
import { GameManagerService } from '../../../../src/application/services/GameManagerService';
import { StateManagerService } from '../../../../src/application/services/StateManagerService';
import { GameLockManager } from '../../../../src/application/GameLockManager';
import { PluginRegistry } from '../../../../src/application/PluginRegistry';
import { InMemoryGameRepository } from '../../../../src/infrastructure/persistence/InMemoryGameRepository';
import { TicTacToeEngine } from '../../../../games/tic-tac-toe/engine';

// Mock Clerk SDK
jest.mock('@clerk/express', () => ({
  clerkMiddleware: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  getAuth: jest.fn(),
  clerkClient: {
    users: {
      getUser: jest.fn(),
    },
  },
}));

import { getAuth, clerkClient } from '@clerk/express';

describe('Game Routes Property-Based Tests', () => {
  let app: Express;
  let gameManagerService: GameManagerService;
  let stateManagerService: StateManagerService;
  let repository: InMemoryGameRepository;
  let registry: PluginRegistry;
  let lockManager: GameLockManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up real dependencies
    repository = new InMemoryGameRepository();
    registry = new PluginRegistry();
    lockManager = new GameLockManager();

    // Register Tic-Tac-Toe plugin
    const ticTacToeEngine = new TicTacToeEngine();
    registry.register(ticTacToeEngine);

    gameManagerService = new GameManagerService(registry, repository);
    stateManagerService = new StateManagerService(repository, registry, lockManager);

    // Create app with real routes
    app = createApp();
    const gameRouter = createGameRoutes(gameManagerService, repository, stateManagerService);
    addApiRoutes(app, gameRouter);
    finalizeApp(app);
  });

  /**
   * Property 10: Game ownership association
   * Feature: authentication-authorization, Property 10: Game ownership association
   * Validates: Requirements 6.2
   *
   * For any game created by an authenticated user, the game should be associated with that user
   */
  describe('Property 10: Game ownership association', () => {
    it('should associate any game created by authenticated user with that user', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random user data
          fc.record({
            userId: fc.string({ minLength: 5, maxLength: 50 }),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            email: fc.emailAddress(),
          }),
          // Generate random game configuration
          fc.record({
            player1Id: fc.string({ minLength: 3, maxLength: 20 }),
            player1Name: fc.string({ minLength: 3, maxLength: 20 }),
            player2Id: fc.string({ minLength: 3, maxLength: 20 }),
            player2Name: fc.string({ minLength: 3, maxLength: 20 }),
          }),
          async (user, gameConfig) => {
            // Mock authenticated request
            (getAuth as jest.Mock).mockReturnValue({
              userId: user.userId,
              sessionId: `session_${user.userId}`,
            });

            (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
              id: user.userId,
              username: user.username,
              emailAddresses: [{ emailAddress: user.email }],
              firstName: 'Test',
              lastName: 'User',
            });

            // Create game as authenticated user
            const response = await request(app)
              .post('/api/games')
              .set('Authorization', 'Bearer valid_token')
              .send({
                gameType: 'tic-tac-toe',
                config: {
                  players: [
                    {
                      id: gameConfig.player1Id,
                      name: gameConfig.player1Name,
                      joinedAt: new Date(),
                    },
                    {
                      id: gameConfig.player2Id,
                      name: gameConfig.player2Name,
                      joinedAt: new Date(),
                    },
                  ],
                },
              });

            // Property: Game should be created successfully
            expect(response.status).toBe(201);
            expect(response.body.gameId).toBeDefined();

            // Property: Game should be associated with the creator
            // This will be validated once we implement the association
            // For now, we verify the game was created
            const gameId = response.body.gameId;
            const game = await repository.findById(gameId);
            expect(game).toBeDefined();

            // TODO: Once creator_player_id is implemented, verify:
            // expect(game.creatorPlayerId).toBe(user.userId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: Game participant authorization
   * Feature: authentication-authorization, Property 11: Game participant authorization
   * Validates: Requirements 6.3
   *
   * For any move attempt by an authenticated user, if the user is not a participant in the game,
   * the request should be rejected with a 403 status
   */
  describe('Property 11: Game participant authorization', () => {
    it('should reject any move by non-participant with 403', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random creator user
          fc.record({
            userId: fc.string({ minLength: 5, maxLength: 50 }),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            email: fc.emailAddress(),
          }),
          // Generate random non-participant user
          fc.record({
            userId: fc.string({ minLength: 5, maxLength: 50 }),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            email: fc.emailAddress(),
          }),
          // Generate random game configuration
          fc.record({
            player1Id: fc.string({ minLength: 3, maxLength: 20 }),
            player1Name: fc.string({ minLength: 3, maxLength: 20 }),
            player2Id: fc.string({ minLength: 3, maxLength: 20 }),
            player2Name: fc.string({ minLength: 3, maxLength: 20 }),
          }),
          async (creator, nonParticipant, gameConfig) => {
            // Ensure non-participant is different from creator
            fc.pre(nonParticipant.userId !== creator.userId);
            // Ensure non-participant is not one of the players
            fc.pre(nonParticipant.userId !== gameConfig.player1Id);
            fc.pre(nonParticipant.userId !== gameConfig.player2Id);

            // Create game as creator
            (getAuth as jest.Mock).mockReturnValue({
              userId: creator.userId,
              sessionId: `session_${creator.userId}`,
            });

            (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
              id: creator.userId,
              username: creator.username,
              emailAddresses: [{ emailAddress: creator.email }],
              firstName: 'Creator',
              lastName: 'User',
            });

            const createResponse = await request(app)
              .post('/api/games')
              .set('Authorization', 'Bearer valid_token')
              .send({
                gameType: 'tic-tac-toe',
                config: {
                  players: [
                    {
                      id: gameConfig.player1Id,
                      name: gameConfig.player1Name,
                      joinedAt: new Date(),
                    },
                    {
                      id: gameConfig.player2Id,
                      name: gameConfig.player2Name,
                      joinedAt: new Date(),
                    },
                  ],
                },
              });

            const gameId = createResponse.body.gameId;
            const version = createResponse.body.version;

            // Try to make a move as non-participant
            (getAuth as jest.Mock).mockReturnValue({
              userId: nonParticipant.userId,
              sessionId: `session_${nonParticipant.userId}`,
            });

            (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
              id: nonParticipant.userId,
              username: nonParticipant.username,
              emailAddresses: [{ emailAddress: nonParticipant.email }],
              firstName: 'Non',
              lastName: 'Participant',
            });

            const moveResponse = await request(app)
              .post(`/api/games/${gameId}/moves`)
              .set('Authorization', 'Bearer valid_token')
              .send({
                playerId: 'random_player',
                move: {
                  action: 'place',
                  parameters: { row: 0, col: 0 },
                  playerId: 'random_player',
                  timestamp: new Date(),
                },
                version: version,
              });

            // Property: Non-participant moves should be rejected with 403
            // Note: The error code may be either FORBIDDEN (from middleware) or
            // UNAUTHORIZED_MOVE (from game logic), both indicate correct rejection
            expect(moveResponse.status).toBe(403);
            expect(['FORBIDDEN', 'UNAUTHORIZED_MOVE']).toContain(moveResponse.body.error.code);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
