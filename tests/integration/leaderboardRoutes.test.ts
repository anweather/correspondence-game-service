/**
 * Integration tests for leaderboard routes
 * Following TDD Red-Green-Refactor: These tests should FAIL initially
 *
 * Tests cover:
 * - GET /api/leaderboard - Get overall leaderboard
 * - GET /api/leaderboard/:gameType - Get leaderboard for specific game type
 * - Pagination
 * - Ranking order
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
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

describe('Leaderboard Routes Integration', () => {
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

    // Create app with leaderboard routes
    app = createApp(playerIdentityRepository, { disableAuth: true });
    const { createLeaderboardRoutes } = require('@adapters/rest/leaderboardRoutes');
    const leaderboardRouter = createLeaderboardRoutes(statsService);
    addApiRoutes(app, leaderboardRouter);
    finalizeApp(app);
  });

  describe('GET /api/leaderboard - Get Overall Leaderboard', () => {
    it('should return leaderboard with ranked players', async () => {
      // Add games for multiple players
      // Player 1: 5 games, 5 wins (100% win rate)
      for (let i = 0; i < 5; i++) {
        statsRepository.addGame(
          createTestGame(
            `game_p1_${i}`,
            'tic-tac-toe',
            ['player1', 'player2'],
            'player1',
            GameLifecycle.COMPLETED
          )
        );
      }

      // Player 2: 10 games, 7 wins (70% win rate)
      for (let i = 0; i < 7; i++) {
        statsRepository.addGame(
          createTestGame(
            `game_p2_win_${i}`,
            'tic-tac-toe',
            ['player2', 'player3'],
            'player2',
            GameLifecycle.COMPLETED
          )
        );
      }
      for (let i = 0; i < 3; i++) {
        statsRepository.addGame(
          createTestGame(
            `game_p2_loss_${i}`,
            'tic-tac-toe',
            ['player2', 'player3'],
            'player3',
            GameLifecycle.COMPLETED
          )
        );
      }

      // Player 3: 8 games, 5 wins (62.5% win rate)
      for (let i = 0; i < 5; i++) {
        statsRepository.addGame(
          createTestGame(
            `game_p3_win_${i}`,
            'tic-tac-toe',
            ['player3', 'player4'],
            'player3',
            GameLifecycle.COMPLETED
          )
        );
      }
      for (let i = 0; i < 3; i++) {
        statsRepository.addGame(
          createTestGame(
            `game_p3_loss_${i}`,
            'tic-tac-toe',
            ['player3', 'player4'],
            'player4',
            GameLifecycle.COMPLETED
          )
        );
      }

      const response = await request(app).get('/api/leaderboard').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(4); // player1, player2, player3, player4

      // Verify ranking order (by win rate descending)
      expect(response.body[0].rank).toBe(1);
      expect(response.body[0].userId).toBe('player1');
      expect(response.body[0].winRate).toBe(1.0);

      expect(response.body[1].rank).toBe(2);
      expect(response.body[1].userId).toBe('player2');
      expect(response.body[1].winRate).toBeCloseTo(0.467, 2); // 7 wins / 15 games

      expect(response.body[2].rank).toBe(3);
      expect(response.body[2].userId).toBe('player3');
      expect(response.body[2].winRate).toBeCloseTo(0.444, 2); // 8 wins / 18 games

      // player4 has 8 games (3 wins, 5 losses) = 37.5% win rate
      expect(response.body[3].rank).toBe(4);
      expect(response.body[3].userId).toBe('player4');
      expect(response.body[3].winRate).toBeCloseTo(0.375, 2);
    });

    it('should include display names in leaderboard entries', async () => {
      // Add games for a player
      for (let i = 0; i < 5; i++) {
        statsRepository.addGame(
          createTestGame(
            `game_${i}`,
            'tic-tac-toe',
            ['player_alpha', 'player_beta'],
            'player_alpha',
            GameLifecycle.COMPLETED
          )
        );
      }

      const response = await request(app).get('/api/leaderboard').expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].displayName).toBeDefined();
      expect(typeof response.body[0].displayName).toBe('string');
    });

    it('should include all required fields in leaderboard entries', async () => {
      // Add games for a player
      for (let i = 0; i < 5; i++) {
        statsRepository.addGame(
          createTestGame(
            `game_${i}`,
            'tic-tac-toe',
            ['player_complete', 'player_other'],
            'player_complete',
            GameLifecycle.COMPLETED
          )
        );
      }

      const response = await request(app).get('/api/leaderboard').expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      const entry = response.body[0];

      expect(entry).toHaveProperty('rank');
      expect(entry).toHaveProperty('userId');
      expect(entry).toHaveProperty('displayName');
      expect(entry).toHaveProperty('totalGames');
      expect(entry).toHaveProperty('wins');
      expect(entry).toHaveProperty('losses');
      expect(entry).toHaveProperty('winRate');

      expect(typeof entry.rank).toBe('number');
      expect(typeof entry.userId).toBe('string');
      expect(typeof entry.displayName).toBe('string');
      expect(typeof entry.totalGames).toBe('number');
      expect(typeof entry.wins).toBe('number');
      expect(typeof entry.losses).toBe('number');
      expect(typeof entry.winRate).toBe('number');
    });

    it('should only include players with at least 5 games', async () => {
      // Player with 3 games (should not appear)
      for (let i = 0; i < 3; i++) {
        statsRepository.addGame(
          createTestGame(
            `game_few_${i}`,
            'tic-tac-toe',
            ['player_few', 'player_other'],
            'player_few',
            GameLifecycle.COMPLETED
          )
        );
      }

      // Player with 5 games (should appear)
      for (let i = 0; i < 5; i++) {
        statsRepository.addGame(
          createTestGame(
            `game_enough_${i}`,
            'tic-tac-toe',
            ['player_enough', 'player_other'],
            'player_enough',
            GameLifecycle.COMPLETED
          )
        );
      }

      const response = await request(app).get('/api/leaderboard').expect(200);

      const playerIds = response.body.map((entry: any) => entry.userId);
      expect(playerIds).not.toContain('player_few');
      expect(playerIds).toContain('player_enough');
    });

    it('should return empty array when no players meet minimum games threshold', async () => {
      // Add only a few games
      statsRepository.addGame(
        createTestGame(
          'game1',
          'tic-tac-toe',
          ['player1', 'player2'],
          'player1',
          GameLifecycle.COMPLETED
        )
      );

      const response = await request(app).get('/api/leaderboard').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should break ties by total games played', async () => {
      // Player 1: 5 games, 3 wins (60% win rate)
      for (let i = 0; i < 3; i++) {
        statsRepository.addGame(
          createTestGame(
            `game_p1_win_${i}`,
            'tic-tac-toe',
            ['player1', 'player_other'],
            'player1',
            GameLifecycle.COMPLETED
          )
        );
      }
      for (let i = 0; i < 2; i++) {
        statsRepository.addGame(
          createTestGame(
            `game_p1_loss_${i}`,
            'tic-tac-toe',
            ['player1', 'player_other'],
            'player_other',
            GameLifecycle.COMPLETED
          )
        );
      }

      // Player 2: 10 games, 6 wins (60% win rate, more games)
      for (let i = 0; i < 6; i++) {
        statsRepository.addGame(
          createTestGame(
            `game_p2_win_${i}`,
            'tic-tac-toe',
            ['player2', 'player_other'],
            'player2',
            GameLifecycle.COMPLETED
          )
        );
      }
      for (let i = 0; i < 4; i++) {
        statsRepository.addGame(
          createTestGame(
            `game_p2_loss_${i}`,
            'tic-tac-toe',
            ['player2', 'player_other'],
            'player_other',
            GameLifecycle.COMPLETED
          )
        );
      }

      const response = await request(app).get('/api/leaderboard').expect(200);

      expect(response.body.length).toBe(3); // player1, player2, and player_other
      // Both player1 and player2 have 60% win rate, player2 ranks higher due to more games
      expect(response.body[0].userId).toBe('player2');
      expect(response.body[0].totalGames).toBe(10);
      expect(response.body[0].winRate).toBeCloseTo(0.6, 2);

      expect(response.body[1].userId).toBe('player1');
      expect(response.body[1].totalGames).toBe(5);
      expect(response.body[1].winRate).toBeCloseTo(0.6, 2);

      // player_other has 15 games, 6 wins, 9 losses = 40% win rate
      expect(response.body[2].userId).toBe('player_other');
      expect(response.body[2].totalGames).toBe(15);
      expect(response.body[2].winRate).toBeCloseTo(0.4, 2);
    });
  });

  describe('GET /api/leaderboard/:gameType - Get Leaderboard by Game Type', () => {
    it('should return leaderboard filtered by game type', async () => {
      // Add tic-tac-toe games for player1
      for (let i = 0; i < 5; i++) {
        statsRepository.addGame(
          createTestGame(
            `ttt_${i}`,
            'tic-tac-toe',
            ['player1', 'player2'],
            'player1',
            GameLifecycle.COMPLETED
          )
        );
      }

      // Add connect-four games for player2
      for (let i = 0; i < 5; i++) {
        statsRepository.addGame(
          createTestGame(
            `cf_${i}`,
            'connect-four',
            ['player2', 'player3'],
            'player2',
            GameLifecycle.COMPLETED
          )
        );
      }

      const response = await request(app).get('/api/leaderboard/tic-tac-toe').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const playerIds = response.body.map((entry: any) => entry.userId);
      expect(playerIds).toContain('player1');
      expect(playerIds).toContain('player2'); // player2 also has 5 tic-tac-toe games (all losses)
      expect(playerIds).not.toContain('player3'); // player3 only plays connect-four
    });

    it('should return empty array for game type with no qualifying players', async () => {
      // Add games for a different game type
      for (let i = 0; i < 5; i++) {
        statsRepository.addGame(
          createTestGame(
            `game_${i}`,
            'tic-tac-toe',
            ['player1', 'player2'],
            'player1',
            GameLifecycle.COMPLETED
          )
        );
      }

      const response = await request(app).get('/api/leaderboard/chess').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should rank players correctly within game type', async () => {
      // Player 1: 5 tic-tac-toe games, 5 wins (100%)
      for (let i = 0; i < 5; i++) {
        statsRepository.addGame(
          createTestGame(
            `ttt_p1_${i}`,
            'tic-tac-toe',
            ['player1', 'player2'],
            'player1',
            GameLifecycle.COMPLETED
          )
        );
      }

      // Player 2: 10 tic-tac-toe games, 5 wins (50%)
      for (let i = 0; i < 5; i++) {
        statsRepository.addGame(
          createTestGame(
            `ttt_p2_win_${i}`,
            'tic-tac-toe',
            ['player2', 'player3'],
            'player2',
            GameLifecycle.COMPLETED
          )
        );
      }
      for (let i = 0; i < 5; i++) {
        statsRepository.addGame(
          createTestGame(
            `ttt_p2_loss_${i}`,
            'tic-tac-toe',
            ['player2', 'player3'],
            'player3',
            GameLifecycle.COMPLETED
          )
        );
      }

      const response = await request(app).get('/api/leaderboard/tic-tac-toe').expect(200);

      expect(response.body.length).toBe(3); // player1, player2, player3
      expect(response.body[0].userId).toBe('player1');
      expect(response.body[0].winRate).toBe(1.0);

      // player3 has 10 games (5 wins, 5 losses) = 50% win rate
      expect(response.body[1].userId).toBe('player3');
      expect(response.body[1].winRate).toBe(0.5);

      // player2 has 15 games (5 wins, 10 losses) = 33.3% win rate
      expect(response.body[2].userId).toBe('player2');
      expect(response.body[2].winRate).toBeCloseTo(0.333, 2);
    });
  });

  describe('Pagination', () => {
    it('should support limit parameter', async () => {
      // Add games for 10 players
      for (let p = 1; p <= 10; p++) {
        for (let i = 0; i < 5; i++) {
          statsRepository.addGame(
            createTestGame(
              `game_p${p}_${i}`,
              'tic-tac-toe',
              [`player${p}`, 'opponent'],
              `player${p}`,
              GameLifecycle.COMPLETED
            )
          );
        }
      }

      const response = await request(app).get('/api/leaderboard?limit=5').expect(200);

      expect(response.body.length).toBe(5);
    });

    it('should default to 100 entries when no limit specified', async () => {
      // Add games for 50 players
      for (let p = 1; p <= 50; p++) {
        for (let i = 0; i < 5; i++) {
          statsRepository.addGame(
            createTestGame(
              `game_p${p}_${i}`,
              'tic-tac-toe',
              [`player${p}`, 'opponent'],
              `player${p}`,
              GameLifecycle.COMPLETED
            )
          );
        }
      }

      const response = await request(app).get('/api/leaderboard').expect(200);

      // Should return all 51 (50 players + 1 opponent) since it's less than default limit of 100
      expect(response.body.length).toBe(51);
    });

    it('should handle limit larger than available entries', async () => {
      // Add games for 3 players
      for (let p = 1; p <= 3; p++) {
        for (let i = 0; i < 5; i++) {
          statsRepository.addGame(
            createTestGame(
              `game_p${p}_${i}`,
              'tic-tac-toe',
              [`player${p}`, 'opponent'],
              `player${p}`,
              GameLifecycle.COMPLETED
            )
          );
        }
      }

      const response = await request(app).get('/api/leaderboard?limit=100').expect(200);

      expect(response.body.length).toBe(4); // 3 players + 1 opponent
    });

    it('should validate limit parameter', async () => {
      const response = await request(app).get('/api/leaderboard?limit=invalid').expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject negative limit', async () => {
      const response = await request(app).get('/api/leaderboard?limit=-5').expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject limit of zero', async () => {
      const response = await request(app).get('/api/leaderboard?limit=0').expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Ranking Order', () => {
    it('should rank by win rate descending', async () => {
      // Create players with different win rates
      const players = [
        { id: 'player1', wins: 8, losses: 2 }, // 80%
        { id: 'player2', wins: 7, losses: 3 }, // 70%
        { id: 'player3', wins: 9, losses: 1 }, // 90%
        { id: 'player4', wins: 6, losses: 4 }, // 60%
      ];

      for (const player of players) {
        // Add wins
        for (let i = 0; i < player.wins; i++) {
          statsRepository.addGame(
            createTestGame(
              `${player.id}_win_${i}`,
              'tic-tac-toe',
              [player.id, 'opponent'],
              player.id,
              GameLifecycle.COMPLETED
            )
          );
        }
        // Add losses
        for (let i = 0; i < player.losses; i++) {
          statsRepository.addGame(
            createTestGame(
              `${player.id}_loss_${i}`,
              'tic-tac-toe',
              [player.id, 'opponent'],
              'opponent',
              GameLifecycle.COMPLETED
            )
          );
        }
      }

      const response = await request(app).get('/api/leaderboard').expect(200);

      expect(response.body.length).toBe(5); // 4 players + 1 opponent
      expect(response.body[0].userId).toBe('player3'); // 90%
      expect(response.body[1].userId).toBe('player1'); // 80%
      expect(response.body[2].userId).toBe('player2'); // 70%
      expect(response.body[3].userId).toBe('player4'); // 60%
      expect(response.body[4].userId).toBe('opponent'); // 0% (all losses)
    });

    it('should assign sequential ranks starting from 1', async () => {
      // Add games for 5 players
      for (let p = 1; p <= 5; p++) {
        for (let i = 0; i < 5; i++) {
          statsRepository.addGame(
            createTestGame(
              `game_p${p}_${i}`,
              'tic-tac-toe',
              [`player${p}`, 'opponent'],
              i < 3 ? `player${p}` : 'opponent', // 60% win rate for all
              GameLifecycle.COMPLETED
            )
          );
        }
      }

      const response = await request(app).get('/api/leaderboard').expect(200);

      expect(response.body.length).toBe(6); // 5 players + 1 opponent
      expect(response.body[0].rank).toBe(1);
      expect(response.body[1].rank).toBe(2);
      expect(response.body[2].rank).toBe(3);
      expect(response.body[3].rank).toBe(4);
      expect(response.body[4].rank).toBe(5);
      expect(response.body[5].rank).toBe(6);
    });

    it('should maintain rank order after pagination', async () => {
      // Add games for 10 players with varying win rates
      for (let p = 1; p <= 10; p++) {
        const wins = 10 - p; // Player 1 has most wins, player 10 has least
        const losses = p - 1;

        for (let i = 0; i < wins; i++) {
          statsRepository.addGame(
            createTestGame(
              `p${p}_win_${i}`,
              'tic-tac-toe',
              [`player${p}`, 'opponent'],
              `player${p}`,
              GameLifecycle.COMPLETED
            )
          );
        }
        for (let i = 0; i < losses; i++) {
          statsRepository.addGame(
            createTestGame(
              `p${p}_loss_${i}`,
              'tic-tac-toe',
              [`player${p}`, 'opponent'],
              'opponent',
              GameLifecycle.COMPLETED
            )
          );
        }
      }

      // Get first 5
      const response1 = await request(app).get('/api/leaderboard?limit=5').expect(200);

      expect(response1.body[0].rank).toBe(1);
      expect(response1.body[4].rank).toBe(5);

      // Get next 5
      const response2 = await request(app).get('/api/leaderboard?limit=5').expect(200);

      // Note: Without offset parameter, this will return the same results
      // This test documents current behavior - pagination would need offset support
      expect(response2.body[0].rank).toBe(1);
    });
  });
});
