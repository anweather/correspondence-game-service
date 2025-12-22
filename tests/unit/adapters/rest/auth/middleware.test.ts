/**
 * Unit tests for authentication middleware
 * Following TDD Red-Green-Refactor: These tests should FAIL initially
 *
 * Tests cover:
 * - clerkMiddleware with valid/invalid Clerk sessions
 * - AUTH_ENABLED=false bypass
 * - requireAuth with authenticated/unauthenticated requests
 * - requireGameParticipant authorization logic
 *
 * Requirements: 1.1, 1.2, 4.3, 6.3, 9.4
 */

import { Response, NextFunction } from 'express';
import { clerkMiddleware } from '../../../../../src/adapters/rest/auth/clerkMiddleware';
import { requireAuth } from '../../../../../src/adapters/rest/auth/requireAuth';
import { requireGameParticipant } from '../../../../../src/adapters/rest/auth/requireGameParticipant';
import { AuthenticatedRequest } from '../../../../../src/adapters/rest/auth/types';
import { AuthenticatedUser } from '../../../../../src/domain/interfaces/authentication';
import { InMemoryGameRepository } from '../../../../../src/infrastructure/persistence/InMemoryGameRepository';
import { InMemoryPlayerIdentityRepository } from '../../../../../src/infrastructure/persistence/InMemoryPlayerIdentityRepository';
import { GameState, Player, GameLifecycle } from '../../../../../src/domain/models';

// Mock Clerk SDK
jest.mock('@clerk/express', () => ({
  clerkMiddleware: jest.fn(),
  getAuth: jest.fn(),
  clerkClient: {
    users: {
      getUser: jest.fn(),
    },
  },
}));

// Mock config
jest.mock('../../../../../src/config', () => ({
  loadConfig: jest.fn(),
}));

import { getAuth, clerkClient } from '@clerk/express';
import { loadConfig } from '../../../../../src/config';

describe('clerkMiddleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockRepository: InMemoryPlayerIdentityRepository;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    mockRepository = new InMemoryPlayerIdentityRepository();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('when AUTH_ENABLED is false', () => {
    beforeEach(() => {
      (loadConfig as jest.Mock).mockReturnValue({
        auth: {
          enabled: false,
          clerk: {
            publishableKey: '',
            secretKey: '',
          },
        },
      });
    });

    it('should bypass authentication and call next()', async () => {
      const middleware = clerkMiddleware(mockRepository);
      await middleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeUndefined();
    });

    it('should call Clerk SDK but bypass authentication when auth is disabled', async () => {
      const middleware = clerkMiddleware(mockRepository);
      await middleware(mockRequest as any, mockResponse as Response, mockNext);

      // Clerk SDK is called (we always check auth status)
      expect(getAuth).toHaveBeenCalled();
      // But user is not populated when auth is disabled
      expect(mockRequest.user).toBeUndefined();
    });
  });

  describe('when AUTH_ENABLED is true', () => {
    beforeEach(() => {
      (loadConfig as jest.Mock).mockReturnValue({
        auth: {
          enabled: true,
          clerk: {
            publishableKey: 'pk_test_123',
            secretKey: 'sk_test_123',
          },
        },
      });
    });

    it('should populate req.user with authenticated user from Clerk session', async () => {
      // Mock Clerk auth with valid session
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_123',
        sessionId: 'session_123',
      });

      // Mock Clerk client to return user data
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_123',
        username: 'testuser',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User',
      });

      const middleware = clerkMiddleware(mockRepository);
      await middleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.externalId).toBe('clerk_user_123');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should not populate req.user when Clerk session is invalid', async () => {
      // Mock Clerk auth with no session
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const middleware = clerkMiddleware(mockRepository);
      await middleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should extract user information from Clerk session', async () => {
      // Mock Clerk auth with full user data
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'clerk_user_456',
        sessionId: 'session_456',
      });

      // Mock Clerk client to return user data
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_user_456',
        username: 'testuser456',
        emailAddresses: [{ emailAddress: 'test456@example.com' }],
        firstName: 'Test',
        lastName: 'User',
      });

      const middleware = clerkMiddleware(mockRepository);
      await middleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockRequest.user).toMatchObject({
        externalId: 'clerk_user_456',
      });
    });
  });
});

describe('requireAuth', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should call next() when user is authenticated', () => {
    const authenticatedUser: AuthenticatedUser = {
      id: 'player_123',
      externalId: 'clerk_user_123',
      username: 'testuser',
      email: 'test@example.com',
    };
    mockRequest.user = authenticatedUser;

    requireAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 401 when user is not authenticated', () => {
    mockRequest.user = undefined;

    requireAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      },
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when req.user is null', () => {
    mockRequest.user = null as any;

    requireAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      },
    });
  });
});

describe('requireGameParticipant', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let gameRepository: InMemoryGameRepository;

  beforeEach(() => {
    gameRepository = new InMemoryGameRepository();
    mockRequest = {
      params: {},
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should call next() when user is a participant in the game', async () => {
    // Create a game with the user as a participant
    const player1: Player = {
      id: 'player_123',
      name: 'testuser',
      joinedAt: new Date(),
    };
    const player2: Player = {
      id: 'player_456',
      name: 'otheruser',
      joinedAt: new Date(),
    };
    const gameState: GameState = {
      gameId: 'game_123',
      gameType: 'tic-tac-toe',
      players: [player1, player2],
      currentPlayerIndex: 0,
      phase: 'playing',
      lifecycle: GameLifecycle.ACTIVE,
      version: 1,
      board: { spaces: [], metadata: {} },
      moveHistory: [],
      metadata: {},
      winner: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await gameRepository.save(gameState);

    const authenticatedUser: AuthenticatedUser = {
      id: 'player_123',
      externalId: 'clerk_user_123',
      username: 'testuser',
      email: 'test@example.com',
    };
    mockRequest.user = authenticatedUser;
    mockRequest.params = { gameId: 'game_123' };

    const middleware = requireGameParticipant(gameRepository);
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 403 when user is not a participant in the game', async () => {
    // Create a game without the user as a participant
    const player1: Player = {
      id: 'player_456',
      name: 'otheruser',
      joinedAt: new Date(),
    };
    const player2: Player = {
      id: 'player_789',
      name: 'anotheruser',
      joinedAt: new Date(),
    };
    const gameState: GameState = {
      gameId: 'game_123',
      gameType: 'tic-tac-toe',
      players: [player1, player2],
      currentPlayerIndex: 0,
      phase: 'playing',
      lifecycle: GameLifecycle.ACTIVE,
      version: 1,
      board: { spaces: [], metadata: {} },
      moveHistory: [],
      metadata: {},
      winner: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await gameRepository.save(gameState);

    const authenticatedUser: AuthenticatedUser = {
      id: 'player_123',
      externalId: 'clerk_user_123',
      username: 'testuser',
      email: 'test@example.com',
    };
    mockRequest.user = authenticatedUser;
    mockRequest.params = { gameId: 'game_123' };

    const middleware = requireGameParticipant(gameRepository);
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'FORBIDDEN',
        message: 'Forbidden: Not a participant in this game',
      },
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 404 when game does not exist', async () => {
    const authenticatedUser: AuthenticatedUser = {
      id: 'player_123',
      externalId: 'clerk_user_123',
      username: 'testuser',
      email: 'test@example.com',
    };
    mockRequest.user = authenticatedUser;
    mockRequest.params = { gameId: 'nonexistent_game' };

    const middleware = requireGameParticipant(gameRepository);
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'GAME_NOT_FOUND',
        message: 'Game not found',
      },
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should use custom gameId parameter name', async () => {
    const player1: Player = {
      id: 'player_123',
      name: 'testuser',
      joinedAt: new Date(),
    };
    const gameState: GameState = {
      gameId: 'game_456',
      gameType: 'tic-tac-toe',
      players: [player1],
      currentPlayerIndex: 0,
      phase: 'playing',
      lifecycle: GameLifecycle.ACTIVE,
      version: 1,
      board: { spaces: [], metadata: {} },
      moveHistory: [],
      metadata: {},
      winner: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await gameRepository.save(gameState);

    const authenticatedUser: AuthenticatedUser = {
      id: 'player_123',
      externalId: 'clerk_user_123',
      username: 'testuser',
      email: 'test@example.com',
    };
    mockRequest.user = authenticatedUser;
    mockRequest.params = { id: 'game_456' };

    const middleware = requireGameParticipant(gameRepository, 'id');
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should return 401 when user is not authenticated', async () => {
    mockRequest.user = undefined;
    mockRequest.params = { gameId: 'game_123' };

    const middleware = requireGameParticipant(gameRepository);
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      },
    });
  });
});
