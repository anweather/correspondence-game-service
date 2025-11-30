/**
 * Integration tests for stats routes
 * Following TDD Red-Green-Refactor: These tests should FAIL initially
 *
 * Tests cover:
 * - GET /api/players/stats - Get current user's stats
 * - GET /api/players/stats/:gameType - Get stats for specific game type
 * - GET /api/players/history - Get game history
 * - GET /api/players/:userId/stats - Get stats for specific player (public)
 * - Authentication requirements
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import request from 'supertest';
import { Express } from 'express';
import { createApp, addApiRoutes, finalizeApp } from '@adapters/rest/app';
import { StatsService } from '@application/services/StatsService';
import { InMemoryPlayerIdentityRepository } from '@infrastructure/persistence/InMemoryPlayerIdentityRepository';
import { GameState, GameLifecycle } from '@domain/models';
import { loadConfig } from '../../src/config';

// Mock Clerk SDK for authentication tests
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

// Mock config to enable auth for these tests
jest.mock('../../src/config', () => ({
  loadConfig: jest.fn(() => ({
    auth: {
      enabled: true,
      clerk: {
        publishableKey: 'pk_test_123',
        secretKey: 'sk_test_123',
      },
    },
    database: {
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      user: 'test_user',
      password: 'test_password',
    },
  })),
}));

// In-memory implementation for testing
class InMemoryStatsRepository {
  private games: GameState[] = [];

  async getPlayerStats(userId: string, gameType?: string) {
    const filteredGames = this.games.filter((game) => {
      const isPlayer = game.players.some((p) => p.id === userId);
      const isCompleted = game.lifecycle === GameLifecycle.COMPLETED;
      const matchesType = !gameType || game.gameType === gameType;
      return isPlayer && isCompleted && matchesType;
    });

    const wins = filteredGames.filter((g) => g.winner === userId).length;
    const losses = filteredGames.filter(
      (g) => g.winner && g.winner !== userId && g.lifecycle === GameLifecycle.COMPLETED
    ).length;
    const draws = filteredGames.filter(
      (g) => !g.winner && g.lifecycle === GameLifecycle.COMPLETED
    ).length;
    const totalGames = filteredGames.length;
    const totalTurns = filteredGames.reduce((sum, g) => sum + g.moveHistory.length, 0);

    const winRate = wins + losses > 0 ? wins / (wins + losses) : 0;
    const averageTurnsPerGame = totalGames > 0 ? totalTurns / totalGames : 0;

    return {
      userId,
      gameType,
      totalGames,
      wins,
      losses,
      draws,
      winRate,
      totalTurns,
      averageTurnsPerGame,
    };
  }

  async getLeaderboard(gameType?: string, limit: number = 100) {
    // Get all players from completed games
    const playerMap = new Map<string, { wins: number; losses: number; totalGames: number }>();

    this.games
      .filter((g) => {
        const isCompleted = g.lifecycle === GameLifecycle.COMPLETED;
        const matchesType = !gameType || g.gameType === gameType;
        return isCompleted && matchesType;
      })
      .forEach((game) => {
        game.players.forEach((player) => {
          if (!playerMap.has(player.id)) {
            playerMap.set(player.id, { wins: 0, losses: 0, totalGames: 0 });
          }
          const stats = playerMap.get(player.id)!;
          stats.totalGames++;

          if (game.winner === player.id) {
            stats.wins++;
          } else if (game.winner && game.winner !== player.id) {
            stats.losses++;
          }
        });
      });

    // Filter players with at least 5 games
    const entries = Array.from(playerMap.entries())
      .filter(([_, stats]) => stats.totalGames >= 5)
      .map(([userId, stats]) => ({
        userId,
        displayName: `player_${userId}`,
        totalGames: stats.totalGames,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.wins + stats.losses > 0 ? stats.wins / (stats.wins + stats.losses) : 0,
      }))
      .sort((a, b) => {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.totalGames - a.totalGames;
      })
      .slice(0, limit)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }));

    return entries;
  }

  async getGameHistory(userId: string, filters: any = {}) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const filteredGames = this.games.filter((game) => {
      const isPlayer = game.players.some((p) => p.id === userId);
      const matchesType = !filters.gameType || game.gameType === filters.gameType;
      const matchesLifecycle = !filters.lifecycle || game.lifecycle === filters.lifecycle;
      return isPlayer && matchesType && matchesLifecycle;
    });

    // Sort by updated_at descending
    filteredGames.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return filteredGames.slice(offset, offset + pageSize);
  }

  // Test helpers
  addGame(game: GameState): void {
    this.games.push(game);
  }

  clear(): void {
    this.games = [];
  }
}

// Helper to create a test game
function createTestGame(
  gameId: string,
  gameType: string,
  players: string[],
  winner: string | null,
  lifecycle: GameLifecycle,
  moveCount: number = 5
): GameState {
  return {
    gameId,
    gameType,
    lifecycle,
    phase: 'main',
    winner,
    players: players.map((id, index) => ({
      id,
      name: `Player ${index + 1}`,
      joinedAt: new Date(),
    })),
    currentPlayerIndex: 0,
    board: {
      spaces: [],
      metadata: {},
    },
    moveHistory: Array.from({ length: moveCount }, (_, i) => ({
      playerId: players[i % players.length],
      action: 'test',
      parameters: { data: {} },
      timestamp: new Date(),
    })),
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };
}

describe('Stats Routes Integration', () => {
  let app: Express;
  let statsService: StatsService;
  let statsRepository: InMemoryStatsRepository;
  let playerIdentityRepository: InMemoryPlayerIdentityRepository;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Enable authentication for these tests
    (loadConfig as jest.Mock).mockReturnValue({
      auth: {
        enabled: true,
        clerk: {
          publishableKey: 'pk_test_123',
          secretKey: 'sk_test_123',
        },
      },
    });

    // Set up dependencies
    playerIdentityRepository = new InMemoryPlayerIdentityRepository();
    statsRepository = new InMemoryStatsRepository();
    statsService = new StatsService(statsRepository as any);

    // Create app with stats routes
    app = createApp(playerIdentityRepository);
    const { createStatsRoutes } = require('@adapters/rest/statsRoutes');
    const statsRouter = createStatsRoutes(statsService);
    addApiRoutes(app, statsRouter);
    finalizeApp(app);
  });

  describe('GET /api/players/stats - Get Current User Stats', () => {
    it('should require authentication', async () => {
      // Mock unauthenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const response = await request(app).get('/api/players/stats').expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should return stats for authenticated user', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'user_123',
        sessionId: 'session_123',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_123',
        username: 'testuser',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      });

      // Add some test games
      statsRepository.addGame(
        createTestGame(
          'game1',
          'tic-tac-toe',
          ['user_123', 'user_456'],
          'user_123',
          GameLifecycle.COMPLETED,
          5
        )
      );
      statsRepository.addGame(
        createTestGame(
          'game2',
          'tic-tac-toe',
          ['user_123', 'user_789'],
          'user_789',
          GameLifecycle.COMPLETED,
          7
        )
      );
      statsRepository.addGame(
        createTestGame(
          'game3',
          'connect-four',
          ['user_123', 'user_456'],
          'user_123',
          GameLifecycle.COMPLETED,
          10
        )
      );

      const response = await request(app)
        .get('/api/players/stats')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.userId).toBe('user_123');
      expect(response.body.totalGames).toBe(3);
      expect(response.body.wins).toBe(2);
      expect(response.body.losses).toBe(1);
      expect(response.body.winRate).toBeCloseTo(0.667, 2);
      expect(response.body.totalTurns).toBe(22);
      expect(response.body.averageTurnsPerGame).toBeCloseTo(7.33, 2);
    });

    it('should return zero stats for user with no games', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'user_new',
        sessionId: 'session_new',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_new',
        username: 'newuser',
        emailAddresses: [{ emailAddress: 'new@example.com' }],
      });

      const response = await request(app)
        .get('/api/players/stats')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.userId).toBe('user_new');
      expect(response.body.totalGames).toBe(0);
      expect(response.body.wins).toBe(0);
      expect(response.body.losses).toBe(0);
      expect(response.body.winRate).toBe(0);
      expect(response.body.totalTurns).toBe(0);
      expect(response.body.averageTurnsPerGame).toBe(0);
    });

    it('should only count completed games', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'user_active',
        sessionId: 'session_active',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_active',
        username: 'activeuser',
        emailAddresses: [{ emailAddress: 'active@example.com' }],
      });

      // Add completed and active games
      statsRepository.addGame(
        createTestGame(
          'game1',
          'tic-tac-toe',
          ['user_active', 'user_456'],
          'user_active',
          GameLifecycle.COMPLETED
        )
      );
      statsRepository.addGame(
        createTestGame(
          'game2',
          'tic-tac-toe',
          ['user_active', 'user_789'],
          null,
          GameLifecycle.ACTIVE
        )
      );

      const response = await request(app)
        .get('/api/players/stats')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.totalGames).toBe(1);
      expect(response.body.wins).toBe(1);
    });
  });

  describe('GET /api/players/stats/:gameType - Get Stats by Game Type', () => {
    it('should require authentication', async () => {
      // Mock unauthenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const response = await request(app).get('/api/players/stats/tic-tac-toe').expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should return stats filtered by game type', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'user_filter',
        sessionId: 'session_filter',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_filter',
        username: 'filteruser',
        emailAddresses: [{ emailAddress: 'filter@example.com' }],
      });

      // Add games of different types
      statsRepository.addGame(
        createTestGame(
          'game1',
          'tic-tac-toe',
          ['user_filter', 'user_456'],
          'user_filter',
          GameLifecycle.COMPLETED,
          5
        )
      );
      statsRepository.addGame(
        createTestGame(
          'game2',
          'tic-tac-toe',
          ['user_filter', 'user_789'],
          'user_789',
          GameLifecycle.COMPLETED,
          7
        )
      );
      statsRepository.addGame(
        createTestGame(
          'game3',
          'connect-four',
          ['user_filter', 'user_456'],
          'user_filter',
          GameLifecycle.COMPLETED,
          10
        )
      );

      const response = await request(app)
        .get('/api/players/stats/tic-tac-toe')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.userId).toBe('user_filter');
      expect(response.body.gameType).toBe('tic-tac-toe');
      expect(response.body.totalGames).toBe(2);
      expect(response.body.wins).toBe(1);
      expect(response.body.losses).toBe(1);
      expect(response.body.totalTurns).toBe(12);
    });

    it('should return zero stats for game type with no games', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'user_nogames',
        sessionId: 'session_nogames',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_nogames',
        username: 'nogamesuser',
        emailAddresses: [{ emailAddress: 'nogames@example.com' }],
      });

      const response = await request(app)
        .get('/api/players/stats/chess')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.gameType).toBe('chess');
      expect(response.body.totalGames).toBe(0);
    });
  });

  describe('GET /api/players/history - Get Game History', () => {
    it('should require authentication', async () => {
      // Mock unauthenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const response = await request(app).get('/api/players/history').expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should return game history for authenticated user', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'user_history',
        sessionId: 'session_history',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_history',
        username: 'historyuser',
        emailAddresses: [{ emailAddress: 'history@example.com' }],
      });

      // Add test games
      statsRepository.addGame(
        createTestGame(
          'game1',
          'tic-tac-toe',
          ['user_history', 'user_456'],
          'user_history',
          GameLifecycle.COMPLETED
        )
      );
      statsRepository.addGame(
        createTestGame(
          'game2',
          'connect-four',
          ['user_history', 'user_789'],
          null,
          GameLifecycle.ACTIVE
        )
      );

      const response = await request(app)
        .get('/api/players/history')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0].gameId).toBeDefined();
      expect(response.body[0].gameType).toBeDefined();
    });

    it('should filter history by game type', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'user_filter_history',
        sessionId: 'session_filter_history',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_filter_history',
        username: 'filterhistoryuser',
        emailAddresses: [{ emailAddress: 'filterhistory@example.com' }],
      });

      // Add games of different types
      statsRepository.addGame(
        createTestGame(
          'game1',
          'tic-tac-toe',
          ['user_filter_history', 'user_456'],
          'user_filter_history',
          GameLifecycle.COMPLETED
        )
      );
      statsRepository.addGame(
        createTestGame(
          'game2',
          'connect-four',
          ['user_filter_history', 'user_789'],
          null,
          GameLifecycle.ACTIVE
        )
      );

      const response = await request(app)
        .get('/api/players/history?gameType=tic-tac-toe')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].gameType).toBe('tic-tac-toe');
    });

    it('should filter history by lifecycle', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'user_lifecycle',
        sessionId: 'session_lifecycle',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_lifecycle',
        username: 'lifecycleuser',
        emailAddresses: [{ emailAddress: 'lifecycle@example.com' }],
      });

      // Add games with different lifecycles
      statsRepository.addGame(
        createTestGame(
          'game1',
          'tic-tac-toe',
          ['user_lifecycle', 'user_456'],
          'user_lifecycle',
          GameLifecycle.COMPLETED
        )
      );
      statsRepository.addGame(
        createTestGame(
          'game2',
          'tic-tac-toe',
          ['user_lifecycle', 'user_789'],
          null,
          GameLifecycle.ACTIVE
        )
      );

      const response = await request(app)
        .get(`/api/players/history?lifecycle=${GameLifecycle.COMPLETED}`)
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].lifecycle).toBe(GameLifecycle.COMPLETED);
    });

    it('should support pagination', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'user_pagination',
        sessionId: 'session_pagination',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_pagination',
        username: 'paginationuser',
        emailAddresses: [{ emailAddress: 'pagination@example.com' }],
      });

      // Add many games
      for (let i = 0; i < 25; i++) {
        statsRepository.addGame(
          createTestGame(
            `game${i}`,
            'tic-tac-toe',
            ['user_pagination', 'user_456'],
            'user_pagination',
            GameLifecycle.COMPLETED
          )
        );
      }

      // Get first page
      const response1 = await request(app)
        .get('/api/players/history?page=1&pageSize=10')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response1.body.length).toBe(10);

      // Get second page
      const response2 = await request(app)
        .get('/api/players/history?page=2&pageSize=10')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response2.body.length).toBe(10);

      // Get third page
      const response3 = await request(app)
        .get('/api/players/history?page=3&pageSize=10')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response3.body.length).toBe(5);
    });

    it('should return empty array for user with no games', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'user_empty',
        sessionId: 'session_empty',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_empty',
        username: 'emptyuser',
        emailAddresses: [{ emailAddress: 'empty@example.com' }],
      });

      const response = await request(app)
        .get('/api/players/history')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/players/:userId/stats - Get Public Stats', () => {
    it('should allow unauthenticated access to public stats', async () => {
      // Mock unauthenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      // Add test games for the user
      statsRepository.addGame(
        createTestGame(
          'game1',
          'tic-tac-toe',
          ['user_public', 'user_456'],
          'user_public',
          GameLifecycle.COMPLETED
        )
      );

      const response = await request(app).get('/api/players/user_public/stats').expect(200);

      expect(response.body.userId).toBe('user_public');
      expect(response.body.totalGames).toBe(1);
      expect(response.body.wins).toBe(1);
    });

    it('should allow authenticated access to public stats', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'user_viewer',
        sessionId: 'session_viewer',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_viewer',
        username: 'vieweruser',
        emailAddresses: [{ emailAddress: 'viewer@example.com' }],
      });

      // Add test games for another user
      statsRepository.addGame(
        createTestGame(
          'game1',
          'tic-tac-toe',
          ['user_other', 'user_456'],
          'user_other',
          GameLifecycle.COMPLETED
        )
      );

      const response = await request(app)
        .get('/api/players/user_other/stats')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.userId).toBe('user_other');
      expect(response.body.totalGames).toBe(1);
    });

    it('should return zero stats for user with no games', async () => {
      // Mock unauthenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const response = await request(app).get('/api/players/user_nonexistent/stats').expect(200);

      expect(response.body.userId).toBe('user_nonexistent');
      expect(response.body.totalGames).toBe(0);
    });
  });
});
