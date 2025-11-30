/**
 * Integration tests for admin routes with requireAdmin middleware
 * Tests that admin authorization is properly enforced
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import request from 'supertest';
import express, { Express, Router } from 'express';
import { requireAdmin } from '../../src/adapters/rest/auth/requireAdmin';
import { requireAuth } from '../../src/adapters/rest/auth/requireAuth';
import { AuthenticatedRequest } from '../../src/adapters/rest/auth/types';
import { AuthenticatedUser } from '../../src/domain/interfaces/authentication';

// Mock config
jest.mock('../../src/config', () => ({
  loadConfig: jest.fn(),
}));

import { loadConfig } from '../../src/config';

describe('Admin Routes Integration', () => {
  let app: Express;

  beforeEach(() => {
    // Create a test Express app
    app = express();
    app.use(express.json());

    // Mock config with admin user IDs
    (loadConfig as jest.Mock).mockReturnValue({
      adminUserIds: ['admin_user_123', 'admin_user_456'],
    });

    // Add a middleware to simulate authentication for testing
    // This must come BEFORE the routes
    app.use((req: AuthenticatedRequest, _res, next) => {
      // This would normally be set by clerkMiddleware
      // For testing, we'll set it based on a header
      const userId = req.headers['x-test-user-id'] as string;
      if (userId) {
        req.user = {
          id: userId,
          externalId: `clerk_${userId}`,
          username: `user_${userId}`,
          email: `${userId}@example.com`,
        } as AuthenticatedUser;
      }
      next();
    });

    // Create a test admin router
    const adminRouter = Router();

    // Example admin-only endpoint
    adminRouter.get('/admin/stats', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
      res.json({
        message: 'Admin stats',
        userId: req.user?.id,
      });
    });

    // Example admin-only endpoint for managing users
    adminRouter.post(
      '/admin/users/:userId/ban',
      requireAuth,
      requireAdmin,
      (req: AuthenticatedRequest, res) => {
        res.json({
          message: 'User banned',
          bannedUserId: req.params.userId,
          adminUserId: req.user?.id,
        });
      }
    );

    app.use('/api', adminRouter);
  });

  describe('GET /api/admin/stats', () => {
    it('should allow access for authenticated admin user', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('x-test-user-id', 'admin_user_123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Admin stats',
        userId: 'admin_user_123',
      });
    });

    it('should deny access for authenticated non-admin user', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('x-test-user-id', 'regular_user_789');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: {
          code: 'FORBIDDEN',
          message: 'Forbidden: Admin access required',
        },
      });
    });

    it('should deny access for unauthenticated user', async () => {
      const response = await request(app).get('/api/admin/stats');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
      });
    });
  });

  describe('POST /api/admin/users/:userId/ban', () => {
    it('should allow admin to ban users', async () => {
      const response = await request(app)
        .post('/api/admin/users/user_123/ban')
        .set('x-test-user-id', 'admin_user_456');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'User banned',
        bannedUserId: 'user_123',
        adminUserId: 'admin_user_456',
      });
    });

    it('should deny non-admin from banning users', async () => {
      const response = await request(app)
        .post('/api/admin/users/user_123/ban')
        .set('x-test-user-id', 'regular_user_789');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: {
          code: 'FORBIDDEN',
          message: 'Forbidden: Admin access required',
        },
      });
    });
  });

  describe('middleware order', () => {
    it('should check authentication before authorization', async () => {
      // When not authenticated, should get 401 not 403
      const response = await request(app).get('/api/admin/stats');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should check authorization after authentication', async () => {
      // When authenticated but not admin, should get 403
      const response = await request(app)
        .get('/api/admin/stats')
        .set('x-test-user-id', 'regular_user_789');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });
});
