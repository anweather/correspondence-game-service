/**
 * Integration tests for player profile routes
 * Following TDD Red-Green-Refactor: These tests should FAIL initially
 *
 * Tests cover:
 * - POST /api/players/profile - Create player profile
 * - GET /api/players/profile - Get current user's profile
 * - PUT /api/players/profile - Update player profile
 * - GET /api/players/:userId/profile - Get player profile by ID (public)
 * - Authentication requirements
 * - Validation errors
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import request from 'supertest';
import { Express } from 'express';
import { createApp, addApiRoutes, finalizeApp } from '@adapters/rest/app';
import { PlayerProfileService } from '@application/services/PlayerProfileService';
import { IPlayerProfileRepository } from '@domain/interfaces/IPlayerProfileRepository';
import { InMemoryPlayerIdentityRepository } from '@infrastructure/persistence/InMemoryPlayerIdentityRepository';
import { PlayerProfile } from '@domain/models/PlayerProfile';
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

    // Check if new display name is taken by another user
    const existingProfile = await this.findByDisplayName(params.displayName);
    if (existingProfile && existingProfile.userId !== userId) {
      throw new Error('Display name is already taken');
    }

    // Remove old display name from set
    this.displayNames.delete(profile.displayName.toLowerCase());

    // Update profile
    profile.displayName = params.displayName;
    profile.updatedAt = new Date();

    // Add new display name to set
    this.displayNames.add(params.displayName.toLowerCase());

    return profile;
  }

  async isDisplayNameAvailable(displayName: string, excludeUserId?: string): Promise<boolean> {
    const existingProfile = await this.findByDisplayName(displayName);
    if (!existingProfile) {
      return true;
    }
    // If excludeUserId is provided, the name is available if it belongs to that user
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

  // Test helper
  clear(): void {
    this.profiles.clear();
    this.displayNames.clear();
  }
}

describe('Player Profile Routes Integration', () => {
  let app: Express;
  let playerProfileService: PlayerProfileService;
  let playerProfileRepository: InMemoryPlayerProfileRepository;
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
    playerProfileRepository = new InMemoryPlayerProfileRepository();
    playerProfileService = new PlayerProfileService(playerProfileRepository);

    // Create app with player profile routes
    app = createApp(playerIdentityRepository);
    const { createPlayerProfileRoutes } = require('@adapters/rest/playerProfileRoutes');
    const playerProfileRouter = createPlayerProfileRoutes(playerProfileService);
    addApiRoutes(app, playerProfileRouter);
    finalizeApp(app);
  });

  describe('POST /api/players/profile - Create Profile', () => {
    it('should require authentication', async () => {
      // Mock unauthenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const response = await request(app)
        .post('/api/players/profile')
        .send({
          displayName: 'testuser',
        })
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should create profile with custom display name', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_123',
        sessionId: 'session_123',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_123',
        username: 'testuser',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User',
      });

      const response = await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'testuser',
        })
        .expect(201);

      expect(response.body.userId).toBe('clerk_user_123');
      expect(response.body.displayName).toBe('testuser');
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should create profile with generated default display name when not provided', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_456',
        sessionId: 'session_456',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_456',
        username: 'testuser2',
        emailAddresses: [{ emailAddress: 'test2@example.com' }],
        firstName: 'Test',
        lastName: 'User2',
      });

      const response = await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({})
        .expect(201);

      expect(response.body.userId).toBe('clerk_user_456');
      expect(response.body.displayName).toMatch(/^player\d+$/);
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should reject display name that is too short', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_789',
        sessionId: 'session_789',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_789',
        username: 'testuser3',
        emailAddresses: [{ emailAddress: 'test3@example.com' }],
        firstName: 'Test',
        lastName: 'User3',
      });

      const response = await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'ab',
        })
        .expect(400);

      expect(response.body.error.message).toContain('between 3 and 20 characters');
    });

    it('should reject display name that is too long', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_101',
        sessionId: 'session_101',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_101',
        username: 'testuser4',
        emailAddresses: [{ emailAddress: 'test4@example.com' }],
        firstName: 'Test',
        lastName: 'User4',
      });

      const response = await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'thisnameiswaytoolo ngforthevalidation',
        })
        .expect(400);

      expect(response.body.error.message).toContain('between 3 and 20 characters');
    });

    it('should reject display name with invalid characters', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_102',
        sessionId: 'session_102',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_102',
        username: 'testuser5',
        emailAddresses: [{ emailAddress: 'test5@example.com' }],
        firstName: 'Test',
        lastName: 'User5',
      });

      const response = await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'test@user!',
        })
        .expect(400);

      expect(response.body.error.message).toContain('letters, numbers, and underscores');
    });

    it('should reject reserved display names', async () => {
      // Mock authenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_103',
        sessionId: 'session_103',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_103',
        username: 'testuser6',
        emailAddresses: [{ emailAddress: 'test6@example.com' }],
        firstName: 'Test',
        lastName: 'User6',
      });

      const response = await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'admin',
        })
        .expect(400);

      expect(response.body.error.message).toContain('reserved');
    });

    it('should reject duplicate display name', async () => {
      // Create first profile
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_104',
        sessionId: 'session_104',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_104',
        username: 'testuser7',
        emailAddresses: [{ emailAddress: 'test7@example.com' }],
        firstName: 'Test',
        lastName: 'User7',
      });

      await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'uniquename',
        })
        .expect(201);

      // Try to create second profile with same display name
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_105',
        sessionId: 'session_105',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_105',
        username: 'testuser8',
        emailAddresses: [{ emailAddress: 'test8@example.com' }],
        firstName: 'Test',
        lastName: 'User8',
      });

      const response = await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'uniquename',
        })
        .expect(409);

      expect(response.body.error.message).toContain('already taken');
    });

    it('should prevent creating duplicate profile for same user', async () => {
      // Create first profile
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_106',
        sessionId: 'session_106',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_106',
        username: 'testuser9',
        emailAddresses: [{ emailAddress: 'test9@example.com' }],
        firstName: 'Test',
        lastName: 'User9',
      });

      await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'firstprofile',
        })
        .expect(201);

      // Try to create second profile for same user
      const response = await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'secondprofile',
        })
        .expect(409);

      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('GET /api/players/profile - Get Current User Profile', () => {
    it('should require authentication', async () => {
      // Mock unauthenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const response = await request(app).get('/api/players/profile').expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should return current user profile', async () => {
      // Create a profile first
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_200',
        sessionId: 'session_200',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_200',
        username: 'testuser10',
        emailAddresses: [{ emailAddress: 'test10@example.com' }],
        firstName: 'Test',
        lastName: 'User10',
      });

      await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'myprofile',
        })
        .expect(201);

      // Get the profile
      const response = await request(app)
        .get('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.userId).toBe('clerk_user_200');
      expect(response.body.displayName).toBe('myprofile');
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should return 404 when profile does not exist', async () => {
      // Mock authenticated request for user without profile
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_201',
        sessionId: 'session_201',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_201',
        username: 'testuser11',
        emailAddresses: [{ emailAddress: 'test11@example.com' }],
        firstName: 'Test',
        lastName: 'User11',
      });

      const response = await request(app)
        .get('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .expect(404);

      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('PUT /api/players/profile - Update Profile', () => {
    it('should require authentication', async () => {
      // Mock unauthenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const response = await request(app)
        .put('/api/players/profile')
        .send({
          displayName: 'newname',
        })
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should update display name', async () => {
      // Create a profile first
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_300',
        sessionId: 'session_300',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_300',
        username: 'testuser12',
        emailAddresses: [{ emailAddress: 'test12@example.com' }],
        firstName: 'Test',
        lastName: 'User12',
      });

      await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'oldname',
        })
        .expect(201);

      // Update the profile
      const response = await request(app)
        .put('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'newname',
        })
        .expect(200);

      expect(response.body.userId).toBe('clerk_user_300');
      expect(response.body.displayName).toBe('newname');
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should reject invalid display name on update', async () => {
      // Create a profile first
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_301',
        sessionId: 'session_301',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_301',
        username: 'testuser13',
        emailAddresses: [{ emailAddress: 'test13@example.com' }],
        firstName: 'Test',
        lastName: 'User13',
      });

      await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'validname',
        })
        .expect(201);

      // Try to update with invalid name
      const response = await request(app)
        .put('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'ab',
        })
        .expect(400);

      expect(response.body.error.message).toContain('between 3 and 20 characters');
    });

    it('should reject duplicate display name on update', async () => {
      // Create first profile
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_302',
        sessionId: 'session_302',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_302',
        username: 'testuser14',
        emailAddresses: [{ emailAddress: 'test14@example.com' }],
        firstName: 'Test',
        lastName: 'User14',
      });

      await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'takenname',
        })
        .expect(201);

      // Create second profile
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_303',
        sessionId: 'session_303',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_303',
        username: 'testuser15',
        emailAddresses: [{ emailAddress: 'test15@example.com' }],
        firstName: 'Test',
        lastName: 'User15',
      });

      await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'myname',
        })
        .expect(201);

      // Try to update second profile to use first profile's name
      const response = await request(app)
        .put('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'takenname',
        })
        .expect(409);

      expect(response.body.error.message).toContain('already taken');
    });

    it('should return 404 when profile does not exist', async () => {
      // Mock authenticated request for user without profile
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_304',
        sessionId: 'session_304',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_304',
        username: 'testuser16',
        emailAddresses: [{ emailAddress: 'test16@example.com' }],
        firstName: 'Test',
        lastName: 'User16',
      });

      const response = await request(app)
        .put('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'newname',
        })
        .expect(404);

      expect(response.body.error.message).toContain('not found');
    });

    it('should require displayName in request body', async () => {
      // Create a profile first
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_305',
        sessionId: 'session_305',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_305',
        username: 'testuser17',
        emailAddresses: [{ emailAddress: 'test17@example.com' }],
        firstName: 'Test',
        lastName: 'User17',
      });

      await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'oldname',
        })
        .expect(201);

      // Try to update without displayName
      const response = await request(app)
        .put('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({})
        .expect(400);

      expect(response.body.error.message).toContain('displayName');
    });
  });

  describe('GET /api/players/:userId/profile - Get Public Profile', () => {
    it('should allow unauthenticated access to public profiles', async () => {
      // Create a profile first
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_400',
        sessionId: 'session_400',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_400',
        username: 'testuser18',
        emailAddresses: [{ emailAddress: 'test18@example.com' }],
        firstName: 'Test',
        lastName: 'User18',
      });

      await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'publicuser',
        })
        .expect(201);

      // Get the profile without authentication
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const response = await request(app).get('/api/players/clerk_user_400/profile').expect(200);

      expect(response.body.userId).toBe('clerk_user_400');
      expect(response.body.displayName).toBe('publicuser');
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should allow authenticated access to public profiles', async () => {
      // Create a profile
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_401',
        sessionId: 'session_401',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_401',
        username: 'testuser19',
        emailAddresses: [{ emailAddress: 'test19@example.com' }],
        firstName: 'Test',
        lastName: 'User19',
      });

      await request(app)
        .post('/api/players/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({
          displayName: 'anotheruser',
        })
        .expect(201);

      // Get the profile as a different authenticated user
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_402',
        sessionId: 'session_402',
      });

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_402',
        username: 'testuser20',
        emailAddresses: [{ emailAddress: 'test20@example.com' }],
        firstName: 'Test',
        lastName: 'User20',
      });

      const response = await request(app)
        .get('/api/players/clerk_user_401/profile')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.userId).toBe('clerk_user_401');
      expect(response.body.displayName).toBe('anotheruser');
    });

    it('should return 404 for non-existent profile', async () => {
      // Mock unauthenticated request
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const response = await request(app).get('/api/players/nonexistent_user/profile').expect(404);

      expect(response.body.error.message).toContain('not found');
    });
  });
});
