import request from 'supertest';
import { Express } from 'express';
import { createApp, finalizeApp } from '@adapters/rest/app';
import {
  GameError,
  GameNotFoundError,
  InvalidMoveError,
  ConcurrencyError,
  UnauthorizedMoveError,
  GameFullError,
} from '@domain/errors';

describe('Express App Initialization', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp();
  });

  describe('Middleware Setup', () => {
    it('should parse JSON request bodies', async () => {
      // Add a test route that echoes the body
      app.post('/test-json', (req, res) => {
        res.json(req.body);
      });
      finalizeApp(app);

      const testData = { message: 'test', value: 123 };

      const response = await request(app).post('/test-json').send(testData).expect(200);

      expect(response.body).toEqual(testData);
    });

    it('should have CORS enabled', async () => {
      // Add a test route
      app.get('/test-cors', (_req, res) => {
        res.json({ ok: true });
      });
      finalizeApp(app);

      const response = await request(app).get('/test-cors').expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle CORS preflight requests', async () => {
      // Add a test route
      app.post('/test-preflight', (_req, res) => {
        res.json({ ok: true });
      });
      finalizeApp(app);

      const response = await request(app)
        .options('/test-preflight')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Error Handling Middleware', () => {
    it('should convert GameNotFoundError to 404 response', async () => {
      app.get('/test-not-found', (_req, _res, next) => {
        next(new GameNotFoundError('game-123'));
      });
      finalizeApp(app);

      const response = await request(app).get('/test-not-found').expect(404);

      expect(response.body).toEqual({
        error: {
          code: 'GAME_NOT_FOUND',
          message: 'Game game-123 not found',
        },
      });
    });

    it('should convert InvalidMoveError to 400 response', async () => {
      app.post('/test-invalid-move', (_req, _res, next) => {
        next(new InvalidMoveError('Space is occupied'));
      });
      finalizeApp(app);

      const response = await request(app).post('/test-invalid-move').expect(400);

      expect(response.body).toEqual({
        error: {
          code: 'INVALID_MOVE',
          message: 'Invalid move: Space is occupied',
          details: { reason: 'Space is occupied' },
        },
      });
    });

    it('should convert ConcurrencyError to 409 response', async () => {
      app.post('/test-concurrency', (_req, _res, next) => {
        next(new ConcurrencyError('game-123'));
      });
      finalizeApp(app);

      const response = await request(app).post('/test-concurrency').expect(409);

      expect(response.body).toEqual({
        error: {
          code: 'STALE_STATE',
          message: 'Game game-123 was modified by another request',
        },
      });
    });

    it('should convert UnauthorizedMoveError to 403 response', async () => {
      app.post('/test-unauthorized', (_req, _res, next) => {
        next(new UnauthorizedMoveError('player-123'));
      });
      finalizeApp(app);

      const response = await request(app).post('/test-unauthorized').expect(403);

      expect(response.body).toEqual({
        error: {
          code: 'UNAUTHORIZED_MOVE',
          message: 'Player player-123 is not authorized to make this move',
        },
      });
    });

    it('should convert GameFullError to 409 response', async () => {
      app.post('/test-game-full', (_req, _res, next) => {
        next(new GameFullError('game-123'));
      });
      finalizeApp(app);

      const response = await request(app).post('/test-game-full').expect(409);

      expect(response.body).toEqual({
        error: {
          code: 'GAME_FULL',
          message: 'Game game-123 is full',
        },
      });
    });

    it('should convert generic GameError to appropriate status code', async () => {
      app.get('/test-generic-error', (_req, _res, next) => {
        next(new GameError('Custom error', 'CUSTOM_ERROR', 418, { extra: 'data' }));
      });
      finalizeApp(app);

      const response = await request(app).get('/test-generic-error').expect(418);

      expect(response.body).toEqual({
        error: {
          code: 'CUSTOM_ERROR',
          message: 'Custom error',
          details: { extra: 'data' },
        },
      });
    });

    it('should handle non-GameError exceptions as 500 Internal Server Error', async () => {
      app.get('/test-unknown-error', (_req, _res, next) => {
        next(new Error('Unexpected error'));
      });
      finalizeApp(app);

      const response = await request(app).get('/test-unknown-error').expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBeDefined();
      // In non-production, error message is exposed
      // In production, it's hidden (tested in separate test)
    });

    it('should not expose error details in production for non-GameError', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/test-production-error', (_req, _res, next) => {
        next(new Error('Sensitive error details'));
      });
      finalizeApp(app);

      const response = await request(app).get('/test-production-error').expect(500);

      expect(response.body.error.message).not.toContain('Sensitive error details');
      expect(response.body).toEqual({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for API routes that do not exist', async () => {
      finalizeApp(app);

      const response = await request(app).get('/api/nonexistent-route').expect(404);

      expect(response.body).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
        },
      });
    });

    it('should attempt to serve SPA fallback for non-API routes', async () => {
      finalizeApp(app);

      // The SPA fallback will try to serve index.html
      // In test environment, this may succeed or fail depending on file existence
      const response = await request(app).get('/nonexistent-route');

      // Should either serve the file (200) or fall through to 404
      expect([200, 404]).toContain(response.status);
    });
  });
});
