/**
 * Integration test for sentinel user middleware
 * Tests the full authentication flow with sentinel users
 */

import request from 'supertest';
import { Express } from 'express';
import { createApp, addApiRoutes, finalizeApp } from '../../src/adapters/rest/app';
import express from 'express';
import { AuthenticatedRequest } from '../../src/adapters/rest/auth/types';
import { InMemoryPlayerIdentityRepository } from '../../src/infrastructure/persistence/InMemoryPlayerIdentityRepository';

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

// Mock config
jest.mock('../../src/config', () => ({
  loadConfig: jest.fn(),
}));

import { getAuth } from '@clerk/express';
import { loadConfig } from '../../src/config';

describe('Sentinel User Integration', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock config to enable authentication
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

  describe('Sentinel User Authentication', () => {
    beforeEach(() => {
      // Mock Clerk to return no authentication (so sentinel middleware is the only auth)
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const mockRepository = new InMemoryPlayerIdentityRepository();
      app = createApp(mockRepository); // Auth enabled

      const testRouter = express.Router();
      testRouter.get('/stats', (req: AuthenticatedRequest, res) => {
        if (!req.user) {
          res.status(401).json({
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'Authentication required',
            },
          });
          return;
        }
        res.json({
          totalGames: 0,
          wins: 0,
          losses: 0,
          userId: req.user.id,
          username: req.user.username,
        });
      });

      addApiRoutes(app, testRouter);
      finalizeApp(app);
    });

    it('should authenticate test- prefixed users', async () => {
      const response = await request(app)
        .get('/api/stats')
        .set('x-test-user-id', 'test-user-123')
        .expect(200);

      expect(response.body).toHaveProperty('totalGames', 0);
      expect(response.body).toHaveProperty('wins', 0);
      expect(response.body).toHaveProperty('losses', 0);
      expect(response.body.userId).toBe('test-user-123');
      expect(response.body.username).toBe('test-user-123');
    });

    it('should authenticate blackbox- prefixed users', async () => {
      const response = await request(app)
        .get('/api/stats')
        .set('x-test-user-id', 'blackbox-player-alice')
        .expect(200);

      expect(response.body).toHaveProperty('totalGames', 0);
      expect(response.body.userId).toBe('blackbox-player-alice');
      expect(response.body.username).toBe('blackbox-player-alice');
    });

    it('should allow non-sentinel test users via Clerk middleware', async () => {
      // This tests that the system supports both sentinel users AND regular test users
      // Non-sentinel test users are handled by Clerk middleware for backward compatibility
      const response = await request(app)
        .get('/api/stats')
        .set('x-test-user-id', 'regular-user-123')
        .expect(200);

      expect(response.body).toHaveProperty('totalGames', 0);
      expect(response.body.userId).toBe('regular-user-123');
      expect(response.body.username).toBe('test-user-regular-user-123'); // Clerk middleware adds prefix
    });

    it('should reject requests without user ID when auth is enabled', async () => {
      const response = await request(app).get('/api/stats').expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('Production Environment Safety', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const mockRepository = new InMemoryPlayerIdentityRepository();
      app = createApp(mockRepository);

      const testRouter = express.Router();
      testRouter.get('/stats', (req: AuthenticatedRequest, res) => {
        if (!req.user) {
          res.status(401).json({
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'Authentication required',
            },
          });
          return;
        }
        res.json({ success: true });
      });

      addApiRoutes(app, testRouter);
      finalizeApp(app);
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should block sentinel users in production environment', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/stats')
        .set('x-test-user-id', 'test-user-123')
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should allow sentinel users in development environment', async () => {
      process.env.NODE_ENV = 'development';

      await request(app).get('/api/stats').set('x-test-user-id', 'test-user-123').expect(200);
    });
  });
});
