import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { GameError } from '@domain/errors';

/**
 * Error handling middleware that converts errors to JSON responses
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Handle GameError instances
  if (err instanceof GameError) {
    const response: any = {
      error: {
        code: err.code,
        message: err.message,
      },
    };

    // Include details if present
    if (err.details) {
      response.error.details = err.details;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unknown errors
  // In production, don't expose internal error details
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction
        ? 'An unexpected error occurred'
        : err.message || 'An unexpected error occurred',
    },
  });
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
}

/**
 * Creates and configures the Express application
 * @returns Configured Express app instance
 */
export function createApp(): Express {
  const app = express();

  // Middleware setup
  app.use(express.json());
  app.use(cors());

  // Routes will be added here by route modules
  // This is just the base app setup

  return app;
}

/**
 * Adds API routes to the Express app
 * @param app - Express application instance
 * @param apiRouter - Router containing API routes
 */
export function addApiRoutes(app: Express, apiRouter: express.Router): void {
  app.use('/api', apiRouter);
}

/**
 * Finalizes the app by adding 404 and error handlers
 * Call this after all routes have been registered
 */
export function finalizeApp(app: Express): void {
  // 404 handler for undefined routes (must be after all routes)
  app.use(notFoundHandler);

  // Error handling middleware (must be last)
  app.use(errorHandler);
}
