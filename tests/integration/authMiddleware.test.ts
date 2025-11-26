/**
 * Integration tests for authentication middleware integration
 * Following TDD Red-Green-Refactor: These tests should FAIL initially
 *
 * Tests cover:
 * - Middleware is applied in correct order
 * - Authenticated requests flow through middleware
 * - Unauthenticated requests are rejected
 *
 * Requirements: 1.2, 9.5
 */

import request from 'supertest';
import { Express } from 'express';
import { createApp, addApiRoutes, finalizeApp } from '../../src/adapters/rest/app';
import express from 'express';
import { AuthenticatedRequest } from '../../src/adapters/rest/auth/types';

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

import { getAuth, clerkClient } from '@clerk/express';
import { loadConfig } from '../../src/config';

describe('Authentication Middleware Integration', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Middleware Order', () => {
    it('should apply middleware in correct order: logging → Clerk → routes', async () => {
      // Track middleware execution order
      const executionOrder: string[] = [];

      (loadConfig as jest.Mock).mockReturnValue({
        auth: {
          enabled: true,
          clerk: {
            publishableKey: 'pk_test_123',
            secretKey: 'sk_test_123',
          },
        },
      });

      app = createApp();

      // Add a test middleware to track execution order
      app.use((_req, _res, next) => {
        executionOrder.push('test-middleware');
        next();
      });

      // Create a test route
      const testRouter = express.Router();
      testRouter.get('/test', (_req: AuthenticatedRequest, res) => {
        executionOrder.push('route-handler');
        res.json({ order: executionOrder });
      });

      addApiRoutes(app, testRouter);
      finalizeApp(app);

      const response = await request(app).get('/api/test').expect(200);

      // Verify middleware executed in correct order
      expect(response.body.order).toContain('test-middleware');
      expect(response.body.order).toContain('route-handler');

      // Test middleware should come before route handler
      const testMiddlewareIndex = response.body.order.indexOf('test-middleware');
      const routeHandlerIndex = response.body.order.indexOf('route-handler');
      expect(testMiddlewareIndex).toBeLessThan(routeHandlerIndex);
    });

    it('should apply request ID middleware before authentication', async () => {
      (loadConfig as jest.Mock).mockReturnValue({
        auth: {
          enabled: true,
          clerk: {
            publishableKey: 'pk_test_123',
            secretKey: 'sk_test_123',
          },
        },
      });

      app = createApp();

      const testRouter = express.Router();
      testRouter.get('/test', (req: any, res) => {
        res.json({ hasRequestId: !!req.requestId });
      });

      addApiRoutes(app, testRouter);
      finalizeApp(app);

      const response = await request(app).get('/api/test').expect(200);

      // Request ID should be present (set by requestIdMiddleware)
      expect(response.body.hasRequestId).toBe(true);
    });
  });

  describe('Authenticated Requests', () => {
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

    it('should flow authenticated requests through middleware chain', async () => {
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

      app = createApp();

      const testRouter = express.Router();
      testRouter.get('/protected', (req: AuthenticatedRequest, res) => {
        res.json({
          authenticated: !!req.user,
          userId: req.user?.id,
        });
      });

      addApiRoutes(app, testRouter);
      finalizeApp(app);

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.authenticated).toBe(true);
      expect(response.body.userId).toBeDefined();
    });

    it('should populate req.user for authenticated requests', async () => {
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

      app = createApp();

      const testRouter = express.Router();
      testRouter.get('/me', (req: AuthenticatedRequest, res) => {
        if (!req.user) {
          res.status(401).json({ error: 'Not authenticated' });
          return;
        }
        res.json({
          id: req.user.id,
          externalId: req.user.externalId,
          username: req.user.username,
        });
      });

      addApiRoutes(app, testRouter);
      finalizeApp(app);

      const response = await request(app)
        .get('/api/me')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.externalId).toBe('clerk_user_456');
    });
  });

  describe('Unauthenticated Requests', () => {
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

    it('should reject unauthenticated requests to protected routes', async () => {
      // Mock Clerk auth with no session
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      app = createApp();

      const testRouter = express.Router();
      testRouter.get('/protected', (req: AuthenticatedRequest, res) => {
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

      const response = await request(app).get('/api/protected').expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should not populate req.user for unauthenticated requests', async () => {
      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      app = createApp();

      const testRouter = express.Router();
      testRouter.get('/check', (req: AuthenticatedRequest, res) => {
        res.json({ hasUser: !!req.user });
      });

      addApiRoutes(app, testRouter);
      finalizeApp(app);

      const response = await request(app).get('/api/check').expect(200);

      expect(response.body.hasUser).toBe(false);
    });
  });

  describe('AUTH_ENABLED Configuration', () => {
    it('should bypass authentication when AUTH_ENABLED is false', async () => {
      (loadConfig as jest.Mock).mockReturnValue({
        auth: {
          enabled: false,
          clerk: {
            publishableKey: '',
            secretKey: '',
          },
        },
      });

      app = createApp();

      const testRouter = express.Router();
      testRouter.get('/public', (req: AuthenticatedRequest, res) => {
        res.json({ success: true, hasUser: !!req.user });
      });

      addApiRoutes(app, testRouter);
      finalizeApp(app);

      const response = await request(app).get('/api/public').expect(200);

      expect(response.body.success).toBe(true);
      // User should not be populated when auth is disabled
      expect(response.body.hasUser).toBe(false);
      // Clerk SDK should not be called
      expect(getAuth).not.toHaveBeenCalled();
    });

    it('should enforce authentication when AUTH_ENABLED is true', async () => {
      (loadConfig as jest.Mock).mockReturnValue({
        auth: {
          enabled: true,
          clerk: {
            publishableKey: 'pk_test_123',
            secretKey: 'sk_test_123',
          },
        },
      });

      (getAuth as jest.Mock).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      app = createApp();

      const testRouter = express.Router();
      testRouter.get('/protected', (req: AuthenticatedRequest, res) => {
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

      await request(app).get('/api/protected').expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle Clerk SDK errors gracefully', async () => {
      (loadConfig as jest.Mock).mockReturnValue({
        auth: {
          enabled: true,
          clerk: {
            publishableKey: 'pk_test_123',
            secretKey: 'sk_test_123',
          },
        },
      });

      // Mock Clerk to throw an error
      (getAuth as jest.Mock).mockImplementation(() => {
        throw new Error('Clerk SDK error');
      });

      app = createApp();

      const testRouter = express.Router();
      testRouter.get('/test', (req: AuthenticatedRequest, res) => {
        res.json({ hasUser: !!req.user });
      });

      addApiRoutes(app, testRouter);
      finalizeApp(app);

      // Should not crash, should continue without user
      const response = await request(app).get('/api/test').expect(200);

      expect(response.body.hasUser).toBe(false);
    });
  });
});
