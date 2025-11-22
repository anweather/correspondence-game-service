import request from 'supertest';
import { Express } from 'express';
import { createApp, finalizeApp } from '@adapters/rest/app';
import { createHealthRoutes } from '@adapters/rest/healthRoutes';
import { GameRepository } from '@domain/interfaces';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';

describe('Health Check Routes Integration', () => {
  let app: Express;
  let repository: GameRepository;

  beforeEach(() => {
    repository = new InMemoryGameRepository();
    app = createApp();
    const healthRouter = createHealthRoutes(repository);
    app.use(healthRouter);
    finalizeApp(app);
  });

  describe('GET /health', () => {
    it('should return 200 and healthy status when database is connected', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
      expect(response.body.version).toBeDefined();
      expect(response.body.database).toBeDefined();
      expect(response.body.database.connected).toBe(true);
      expect(response.body.database.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should include valid timestamp in ISO format', async () => {
      const response = await request(app).get('/health').expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should include uptime in seconds', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return 503 and unhealthy status when database check fails', async () => {
      // Create a mock repository that fails health check
      const failingRepository: GameRepository = {
        ...repository,
        healthCheck: jest.fn().mockResolvedValue(false),
      };

      const failingApp = createApp();
      const healthRouter = createHealthRoutes(failingRepository);
      failingApp.use(healthRouter);
      finalizeApp(failingApp);

      const response = await request(failingApp).get('/health').expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.database.connected).toBe(false);
    });

    it('should measure database response time', async () => {
      // Create a mock repository with delayed health check
      const delayedRepository: GameRepository = {
        ...repository,
        healthCheck: jest.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return true;
        }),
      };

      const delayedApp = createApp();
      const healthRouter = createHealthRoutes(delayedRepository);
      delayedApp.use(healthRouter);
      finalizeApp(delayedApp);

      const response = await request(delayedApp).get('/health').expect(200);

      expect(response.body.database.responseTime).toBeGreaterThanOrEqual(50);
    });
  });
});
