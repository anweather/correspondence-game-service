import { Router, Request, Response, NextFunction } from 'express';
import { GameRepository } from '@domain/interfaces';

/**
 * Creates health check routes
 * @param gameRepository - Repository for checking database connectivity
 * @returns Express router with health check endpoint
 */
export function createHealthRoutes(gameRepository: GameRepository): Router {
  const router = Router();
  const startTime = Date.now();

  /**
   * GET /health
   * Health check endpoint that returns service status and database connectivity
   */
  router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const timestamp = new Date().toISOString();
      const uptime = Math.floor((Date.now() - startTime) / 1000); // uptime in seconds

      // Check database connectivity
      const dbStartTime = Date.now();
      const dbConnected = await gameRepository.healthCheck();
      const dbResponseTime = Date.now() - dbStartTime;

      // Determine overall health status
      const isHealthy = dbConnected;
      const status = isHealthy ? 'healthy' : 'unhealthy';
      const statusCode = isHealthy ? 200 : 503;

      const healthResponse = {
        status,
        timestamp,
        uptime,
        version: process.env.npm_package_version || '1.0.0',
        database: {
          connected: dbConnected,
          responseTime: dbResponseTime,
        },
      };

      res.status(statusCode).json(healthResponse);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
