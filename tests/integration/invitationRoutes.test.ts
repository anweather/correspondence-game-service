/**
 * Integration tests for invitation routes
 * Following TDD Red-Green-Refactor: These tests should FAIL initially
 *
 * Tests cover:
 * - POST /api/invitations - Create invitation
 * - GET /api/invitations - List invitations
 * - PUT /api/invitations/:id/accept - Accept invitation
 * - PUT /api/invitations/:id/decline - Decline invitation
 * - Authentication and authorization
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import request from 'supertest';
import { Express } from 'express';
import { createApp, addApiRoutes, finalizeApp } from '@adapters/rest/app';
import { InvitationService } from '@application/services/InvitationService';
import { IInvitationRepository } from '@domain/interfaces/IInvitationRepository';
import { IPlayerProfileRepository } from '@domain/interfaces/IPlayerProfileRepository';
import { GameRepository, GameFilters, PaginatedResult } from '@domain/interfaces';
import { InMemoryPlayerIdentityRepository } from '@infrastructure/persistence/InMemoryPlayerIdentityRepository';
import { GameInvitation, InvitationStatus } from '@domain/models/GameInvitation';
import { PlayerProfile } from '@domain/models/PlayerProfile';
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
class InMemoryInvitationRepository implements IInvitationRepository {
  private invitations: Map<string, GameInvitation> = new Map();
  private idCounter = 1;

  async create(params: {
    gameId: string;
    inviterId: string;
    inviteeId: string;
  }): Promise<GameInvitation> {
    const invitation: GameInvitation = {
      invitationId: `inv_${this.idCounter++}`,
      gameId: params.gameId,
      inviterId: params.inviterId,
      inviteeId: params.inviteeId,
      status: InvitationStatus.PENDING,
      createdAt: new Date(),
    };

    this.invitations.set(invitation.invitationId, invitation);
    return invitation;
  }

  async findById(invitationId: string): Promise<GameInvitation | null> {
    return this.invitations.get(invitationId) || null;
  }

  async findByInvitee(
    inviteeId: string,
    filters?: { status?: InvitationStatus }
  ): Promise<GameInvitation[]> {
    const invitations = Array.from(this.invitations.values()).filter(
      (inv) => inv.inviteeId === inviteeId
    );

    if (filters?.status) {
      return invitations.filter((inv) => inv.status === filters.status);
    }

    return invitations;
  }

  async findByInviter(inviterId: string): Promise<GameInvitation[]> {
    return Array.from(this.invitations.values()).filter((inv) => inv.inviterId === inviterId);
  }

  async findByGame(gameId: string): Promise<GameInvitation[]> {
    return Array.from(this.invitations.values()).filter((inv) => inv.gameId === gameId);
  }

  async updateStatus(
    invitationId: string,
    status: InvitationStatus,
    respondedAt?: Date
  ): Promise<GameInvitation> {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    invitation.status = status;
    if (respondedAt) {
      invitation.respondedAt = respondedAt;
    }

    return invitation;
  }

  async delete(invitationId: string): Promise<void> {
    this.invitations.delete(invitationId);
  }

  async findAll(filters?: { status?: InvitationStatus }): Promise<GameInvitation[]> {
    const invitations = Array.from(this.invitations.values());

    if (filters?.status) {
      return invitations.filter((inv) => inv.status === filters.status);
    }

    return invitations;
  }

  // Test helper
  clear(): void {
    this.invitations.clear();
    this.idCounter = 1;
  }
}

class InMemoryPlayerProfileRepository implements IPlayerProfileRepository {
  private profiles: Map<string, PlayerProfile> = new Map();
  private displayNames: Set<string> = new Set();

  async create(params: { userId: string; displayName: string }): Promise<PlayerProfile> {
    if (this.profiles.has(params.userId)) {
      throw new Error('Profile already exists for this user');
    }
    if (this.displayNames.has(params.displayName.toLowerCase())) {
      throw new Error('Display name is already taken');
    }

    const profile: PlayerProfile = {
      userId: params.userId,
      displayName: params.displayName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.profiles.set(params.userId, profile);
    this.displayNames.add(params.displayName.toLowerCase());
    return profile;
  }

  async findByUserId(userId: string): Promise<PlayerProfile | null> {
    return this.profiles.get(userId) || null;
  }

  async findByDisplayName(displayName: string): Promise<PlayerProfile | null> {
    for (const profile of this.profiles.values()) {
      if (profile.displayName.toLowerCase() === displayName.toLowerCase()) {
        return profile;
      }
    }
    return null;
  }

  async update(userId: string, params: { displayName: string }): Promise<PlayerProfile> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const existingProfile = await this.findByDisplayName(params.displayName);
    if (existingProfile && existingProfile.userId !== userId) {
      throw new Error('Display name is already taken');
    }

    this.displayNames.delete(profile.displayName.toLowerCase());
    profile.displayName = params.displayName;
    profile.updatedAt = new Date();
    this.displayNames.add(params.displayName.toLowerCase());

    return profile;
  }

  async isDisplayNameAvailable(displayName: string, excludeUserId?: string): Promise<boolean> {
    const existingProfile = await this.findByDisplayName(displayName);
    if (!existingProfile) {
      return true;
    }
    return excludeUserId ? existingProfile.userId === excludeUserId : false;
  }

  async delete(userId: string): Promise<void> {
    const profile = this.profiles.get(userId);
    if (profile) {
      this.displayNames.delete(profile.displayName.toLowerCase());
      this.profiles.delete(userId);
    }
  }

  async findAll(): Promise<PlayerProfile[]> {
    return Array.from(this.profiles.values());
  }

  clear(): void {
    this.profiles.clear();
    this.displayNames.clear();
  }
}

class InMemoryGameRepository implements GameRepository {
  private games: Map<string, GameState> = new Map();

  async save(game: GameState): Promise<void> {
    this.games.set(game.gameId, game);
  }

  async findById(gameId: string): Promise<GameState | null> {
    return this.games.get(gameId) || null;
  }

  async findAll(_filters: GameFilters): Promise<PaginatedResult<GameState>> {
    const games = Array.from(this.games.values());
    return {
      items: games,
      total: games.length,
      page: 1,
      pageSize: games.length,
      totalPages: 1,
    };
  }

  async findByPlayer(playerId: string, _filters: GameFilters): Promise<PaginatedResult<GameState>> {
    const games = Array.from(this.games.values()).filter((game) =>
      game.players.some((player) => player.id === playerId)
    );
    return {
      items: games,
      total: games.length,
      page: 1,
      pageSize: games.length,
      totalPages: 1,
    };
  }

  async update(gameId: string, state: GameState, _expectedVersion: number): Promise<GameState> {
    this.games.set(gameId, state);
    return state;
  }

  async delete(gameId: string): Promise<void> {
    this.games.delete(gameId);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  clear(): void {
    this.games.clear();
  }
}

describe('Invitation Routes Integration', () => {
  let app: Express;
  let invitationService: InvitationService;
  let invitationRepository: InMemoryInvitationRepository;
  let playerProfileRepository: InMemoryPlayerProfileRepository;
  let gameRepository: InMemoryGameRepository;
  let playerIdentityRepository: InMemoryPlayerIdentityRepository;

  // Test data
  const inviterUserId = 'clerk_user_inviter';
  const inviteeUserId = 'clerk_user_invitee';
  const otherUserId = 'clerk_user_other';
  const gameId = 'game_123';

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
    invitationRepository = new InMemoryInvitationRepository();
    playerProfileRepository = new InMemoryPlayerProfileRepository();
    gameRepository = new InMemoryGameRepository();

    invitationService = new InvitationService(
      invitationRepository,
      playerProfileRepository,
      gameRepository
    );

    // Create test profiles
    await playerProfileRepository.create({
      userId: inviterUserId,
      displayName: 'inviter_user',
    });

    await playerProfileRepository.create({
      userId: inviteeUserId,
      displayName: 'invitee_user',
    });

    await playerProfileRepository.create({
      userId: otherUserId,
      displayName: 'other_user',
    });

    // Create test game with inviter as a player
    const testGame: GameState = {
      gameId,
      gameType: 'tic-tac-toe',
      lifecycle: GameLifecycle.WAITING_FOR_PLAYERS,
      players: [{ id: inviterUserId, name: 'inviter_user', joinedAt: new Date() }],
      currentPlayerIndex: 0,
      phase: 'playing',
      board: { spaces: [], metadata: {} },
      moveHistory: [],
      metadata: {},
      winner: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await gameRepository.save(testGame);

    // Create app with invitation routes
    app = createApp(playerIdentityRepository);
    const { createInvitationRoutes } = require('@adapters/rest/invitationRoutes');
    const invitationRouter = createInvitationRoutes(invitationService);
    addApiRoutes(app, invitationRouter);
    finalizeApp(app);
  });

  describe('POST /api/invitations - Create Invitation', () => {
    it('should require authentication', async () => {
      // Mock unauthenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const response = await request(app)
        .post('/api/invitations')
        .send({
          gameId,
          inviteeId: inviteeUserId,
        })
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should create invitation with valid parameters', async () => {
      // Mock authenticated request as inviter
      (getAuth as jest.Mock).mockReturnValue({
        userId: inviterUserId,
        sessionId: 'session_123',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: inviterUserId,
        username: 'inviter_user',
        emailAddresses: [{ emailAddress: 'inviter@example.com' }],
      });

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', 'Bearer valid_token')
        .send({
          gameId,
          inviteeId: inviteeUserId,
        })
        .expect(201);

      expect(response.body.invitationId).toBeDefined();
      expect(response.body.gameId).toBe(gameId);
      expect(response.body.inviterId).toBe(inviterUserId);
      expect(response.body.inviteeId).toBe(inviteeUserId);
      expect(response.body.status).toBe(InvitationStatus.PENDING);
      expect(response.body.createdAt).toBeDefined();
    });

    it('should reject invitation if gameId is missing', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: inviterUserId,
        sessionId: 'session_123',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: inviterUserId,
        username: 'inviter_user',
        emailAddresses: [{ emailAddress: 'inviter@example.com' }],
      });

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', 'Bearer valid_token')
        .send({
          inviteeId: inviteeUserId,
        })
        .expect(400);

      expect(response.body.error.message).toContain('gameId');
    });

    it('should reject invitation if inviteeId is missing', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: inviterUserId,
        sessionId: 'session_123',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: inviterUserId,
        username: 'inviter_user',
        emailAddresses: [{ emailAddress: 'inviter@example.com' }],
      });

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', 'Bearer valid_token')
        .send({
          gameId,
        })
        .expect(400);

      expect(response.body.error.message).toContain('inviteeId');
    });

    it('should reject invitation if game does not exist', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: inviterUserId,
        sessionId: 'session_123',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: inviterUserId,
        username: 'inviter_user',
        emailAddresses: [{ emailAddress: 'inviter@example.com' }],
      });

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', 'Bearer valid_token')
        .send({
          gameId: 'nonexistent_game',
          inviteeId: inviteeUserId,
        })
        .expect(404);

      expect(response.body.error.message).toContain('Game not found');
    });

    it('should reject invitation if inviter is not a participant', async () => {
      // Mock authenticated request as user not in game
      (getAuth as jest.Mock).mockReturnValue({
        userId: otherUserId,
        sessionId: 'session_456',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: otherUserId,
        username: 'other_user',
        emailAddresses: [{ emailAddress: 'other@example.com' }],
      });

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', 'Bearer valid_token')
        .send({
          gameId,
          inviteeId: inviteeUserId,
        })
        .expect(403);

      expect(response.body.error.message).toContain('not a participant');
    });

    it('should reject invitation if invitee does not exist', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: inviterUserId,
        sessionId: 'session_123',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: inviterUserId,
        username: 'inviter_user',
        emailAddresses: [{ emailAddress: 'inviter@example.com' }],
      });

      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', 'Bearer valid_token')
        .send({
          gameId,
          inviteeId: 'nonexistent_user',
        })
        .expect(404);

      expect(response.body.error.message).toContain('Invitee not found');
    });

    it('should reject duplicate pending invitation', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: inviterUserId,
        sessionId: 'session_123',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: inviterUserId,
        username: 'inviter_user',
        emailAddresses: [{ emailAddress: 'inviter@example.com' }],
      });

      // Create first invitation
      await request(app)
        .post('/api/invitations')
        .set('Authorization', 'Bearer valid_token')
        .send({
          gameId,
          inviteeId: inviteeUserId,
        })
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', 'Bearer valid_token')
        .send({
          gameId,
          inviteeId: inviteeUserId,
        })
        .expect(409);

      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('GET /api/invitations - List Invitations', () => {
    it('should require authentication', async () => {
      // Mock unauthenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const response = await request(app).get('/api/invitations').expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should return invitations for authenticated user', async () => {
      // Create some invitations
      await invitationRepository.create({
        gameId,
        inviterId: inviterUserId,
        inviteeId: inviteeUserId,
      });

      await invitationRepository.create({
        gameId: 'game_456',
        inviterId: otherUserId,
        inviteeId: inviteeUserId,
      });

      // Mock authenticated request as invitee
      (getAuth as jest.Mock).mockReturnValue({
        userId: inviteeUserId,
        sessionId: 'session_789',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: inviteeUserId,
        username: 'invitee_user',
        emailAddresses: [{ emailAddress: 'invitee@example.com' }],
      });

      const response = await request(app)
        .get('/api/invitations')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].inviteeId).toBe(inviteeUserId);
      expect(response.body[1].inviteeId).toBe(inviteeUserId);
    });

    it('should filter invitations by status', async () => {
      // Create invitations with different statuses
      const inv1 = await invitationRepository.create({
        gameId,
        inviterId: inviterUserId,
        inviteeId: inviteeUserId,
      });

      const inv2 = await invitationRepository.create({
        gameId: 'game_456',
        inviterId: otherUserId,
        inviteeId: inviteeUserId,
      });

      // Accept one invitation
      await invitationRepository.updateStatus(
        inv2.invitationId,
        InvitationStatus.ACCEPTED,
        new Date()
      );

      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: inviteeUserId,
        sessionId: 'session_789',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: inviteeUserId,
        username: 'invitee_user',
        emailAddresses: [{ emailAddress: 'invitee@example.com' }],
      });

      // Get only pending invitations
      const response = await request(app)
        .get('/api/invitations')
        .query({ status: InvitationStatus.PENDING })
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe(InvitationStatus.PENDING);
      expect(response.body[0].invitationId).toBe(inv1.invitationId);
    });

    it('should return empty array when user has no invitations', async () => {
      // Mock authenticated request as user with no invitations
      (getAuth as jest.Mock).mockReturnValue({
        userId: otherUserId,
        sessionId: 'session_999',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: otherUserId,
        username: 'other_user',
        emailAddresses: [{ emailAddress: 'other@example.com' }],
      });

      const response = await request(app)
        .get('/api/invitations')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe('PUT /api/invitations/:id/accept - Accept Invitation', () => {
    let invitationId: string;

    beforeEach(async () => {
      // Create a pending invitation
      const invitation = await invitationRepository.create({
        gameId,
        inviterId: inviterUserId,
        inviteeId: inviteeUserId,
      });
      invitationId = invitation.invitationId;
    });

    it('should require authentication', async () => {
      // Mock unauthenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const response = await request(app)
        .put(`/api/invitations/${invitationId}/accept`)
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should accept invitation as invitee', async () => {
      // Mock authenticated request as invitee
      (getAuth as jest.Mock).mockReturnValue({
        userId: inviteeUserId,
        sessionId: 'session_789',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: inviteeUserId,
        username: 'invitee_user',
        emailAddresses: [{ emailAddress: 'invitee@example.com' }],
      });

      const response = await request(app)
        .put(`/api/invitations/${invitationId}/accept`)
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.invitationId).toBe(invitationId);
      expect(response.body.status).toBe(InvitationStatus.ACCEPTED);
      expect(response.body.respondedAt).toBeDefined();
    });

    it('should reject acceptance if user is not the invitee', async () => {
      // Mock authenticated request as different user
      (getAuth as jest.Mock).mockReturnValue({
        userId: otherUserId,
        sessionId: 'session_999',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: otherUserId,
        username: 'other_user',
        emailAddresses: [{ emailAddress: 'other@example.com' }],
      });

      const response = await request(app)
        .put(`/api/invitations/${invitationId}/accept`)
        .set('Authorization', 'Bearer valid_token')
        .expect(403);

      expect(response.body.error.message).toContain('Only the invitee');
    });

    it('should reject acceptance if invitation does not exist', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: inviteeUserId,
        sessionId: 'session_789',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: inviteeUserId,
        username: 'invitee_user',
        emailAddresses: [{ emailAddress: 'invitee@example.com' }],
      });

      const response = await request(app)
        .put('/api/invitations/nonexistent_inv/accept')
        .set('Authorization', 'Bearer valid_token')
        .expect(404);

      expect(response.body.error.message).toContain('not found');
    });

    it('should reject acceptance if invitation is not pending', async () => {
      // Accept the invitation first
      await invitationRepository.updateStatus(invitationId, InvitationStatus.ACCEPTED, new Date());

      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: inviteeUserId,
        sessionId: 'session_789',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: inviteeUserId,
        username: 'invitee_user',
        emailAddresses: [{ emailAddress: 'invitee@example.com' }],
      });

      const response = await request(app)
        .put(`/api/invitations/${invitationId}/accept`)
        .set('Authorization', 'Bearer valid_token')
        .expect(400);

      expect(response.body.error.message).toContain('not pending');
    });
  });

  describe('PUT /api/invitations/:id/decline - Decline Invitation', () => {
    let invitationId: string;

    beforeEach(async () => {
      // Create a pending invitation
      const invitation = await invitationRepository.create({
        gameId,
        inviterId: inviterUserId,
        inviteeId: inviteeUserId,
      });
      invitationId = invitation.invitationId;
    });

    it('should require authentication', async () => {
      // Mock unauthenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const response = await request(app)
        .put(`/api/invitations/${invitationId}/decline`)
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should decline invitation as invitee', async () => {
      // Mock authenticated request as invitee
      (getAuth as jest.Mock).mockReturnValue({
        userId: inviteeUserId,
        sessionId: 'session_789',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: inviteeUserId,
        username: 'invitee_user',
        emailAddresses: [{ emailAddress: 'invitee@example.com' }],
      });

      const response = await request(app)
        .put(`/api/invitations/${invitationId}/decline`)
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.invitationId).toBe(invitationId);
      expect(response.body.status).toBe(InvitationStatus.DECLINED);
      expect(response.body.respondedAt).toBeDefined();
    });

    it('should reject decline if user is not the invitee', async () => {
      // Mock authenticated request as different user
      (getAuth as jest.Mock).mockReturnValue({
        userId: otherUserId,
        sessionId: 'session_999',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: otherUserId,
        username: 'other_user',
        emailAddresses: [{ emailAddress: 'other@example.com' }],
      });

      const response = await request(app)
        .put(`/api/invitations/${invitationId}/decline`)
        .set('Authorization', 'Bearer valid_token')
        .expect(403);

      expect(response.body.error.message).toContain('Only the invitee');
    });

    it('should reject decline if invitation does not exist', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: inviteeUserId,
        sessionId: 'session_789',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: inviteeUserId,
        username: 'invitee_user',
        emailAddresses: [{ emailAddress: 'invitee@example.com' }],
      });

      const response = await request(app)
        .put('/api/invitations/nonexistent_inv/decline')
        .set('Authorization', 'Bearer valid_token')
        .expect(404);

      expect(response.body.error.message).toContain('not found');
    });

    it('should reject decline if invitation is not pending', async () => {
      // Decline the invitation first
      await invitationRepository.updateStatus(invitationId, InvitationStatus.DECLINED, new Date());

      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: inviteeUserId,
        sessionId: 'session_789',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: inviteeUserId,
        username: 'invitee_user',
        emailAddresses: [{ emailAddress: 'invitee@example.com' }],
      });

      const response = await request(app)
        .put(`/api/invitations/${invitationId}/decline`)
        .set('Authorization', 'Bearer valid_token')
        .expect(400);

      expect(response.body.error.message).toContain('not pending');
    });
  });
});
