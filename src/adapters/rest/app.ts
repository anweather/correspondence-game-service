import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import {
  GameError,
  AuthenticationRequiredError,
  InvalidTokenError,
  ForbiddenError,
} from '@domain/errors';
import { requestIdMiddleware } from './requestIdMiddleware';
import { requestLoggingMiddleware } from './requestLoggingMiddleware';
import { securityHeadersMiddleware } from './securityHeaders';
import { getLogger } from '../../infrastructure/logging/Logger';
import { clerkMiddleware } from './auth/clerkMiddleware';
import { loadConfig } from '../../config';
import { PlayerIdentityRepository } from '../../domain/interfaces/PlayerIdentityRepository';

/**
 * In-flight request tracker for graceful shutdown
 */
class InFlightRequestTracker {
  private inFlightCount = 0;
  private isShuttingDown = false;

  /**
   * Middleware to track in-flight requests
   */
  middleware = (_req: Request, res: Response, next: NextFunction): void => {
    // Reject new requests during shutdown
    if (this.isShuttingDown) {
      res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Server is shutting down',
        },
      });
      return;
    }

    // Increment counter
    this.inFlightCount++;

    // Decrement counter when response finishes
    res.on('finish', () => {
      this.inFlightCount--;
    });

    next();
  };

  /**
   * Mark that shutdown has started (reject new requests)
   */
  startShutdown(): void {
    this.isShuttingDown = true;
  }

  /**
   * Get current number of in-flight requests
   */
  getInFlightCount(): number {
    return this.inFlightCount;
  }

  /**
   * Wait for all in-flight requests to complete
   * @param timeoutMs - Maximum time to wait in milliseconds
   * @returns Promise that resolves when all requests complete or timeout occurs
   */
  async waitForCompletion(timeoutMs: number): Promise<void> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        if (this.inFlightCount === 0) {
          clearInterval(checkInterval);
          resolve();
        } else if (elapsed >= timeoutMs) {
          clearInterval(checkInterval);
          console.warn(
            `Shutdown timeout reached with ${this.inFlightCount} requests still in-flight`
          );
          resolve();
        }
      }, 100); // Check every 100ms
    });
  }
}

// Export singleton instance
export const inFlightTracker = new InFlightRequestTracker();

/**
 * Error handling middleware that converts errors to JSON responses
 * Requirements: 8.1, 8.2, 8.5, 8.6
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const logger = getLogger();

  // Handle authentication errors specifically (Requirements: 8.1, 8.2, 8.5, 8.6)
  if (
    err instanceof AuthenticationRequiredError ||
    err instanceof InvalidTokenError ||
    err instanceof ForbiddenError
  ) {
    // Log authentication errors without sensitive data (Requirement: 8.6)
    logger.warn('Authentication error occurred', {
      requestId: req.requestId,
      code: err.code,
      message: err.message,
      // Explicitly exclude sensitive data - no tokens, secrets, or passwords
      // Only log error metadata for debugging
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = {
      error: {
        code: err.code,
        message: err.message,
      },
    };

    // Include details if present (e.g., reason for invalid token)
    if (err.details) {
      response.error.details = err.details;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle other GameError instances
  if (err instanceof GameError) {
    logger.warn('Game error occurred', {
      requestId: req.requestId,
      code: err.code,
      message: err.message,
      details: err.details,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  logger.error('Unexpected error occurred', {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
  });

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
 * @param playerIdentityRepository - Repository for player identity persistence (required if auth enabled)
 * @returns Configured Express app instance
 */
export function createApp(playerIdentityRepository?: PlayerIdentityRepository): Express {
  const app = express();
  const config = loadConfig();

  // Middleware setup
  app.use(express.json());
  app.use(cors());

  // Security headers (must be early in the chain)
  app.use(securityHeadersMiddleware);

  // Request ID middleware (must be early in the chain)
  app.use(requestIdMiddleware);

  // Request logging middleware
  app.use(requestLoggingMiddleware);

  // Clerk authentication middleware
  // Always load Clerk middleware to handle JWT tokens when present
  // But only require authentication when AUTH_ENABLED=true
  const logger = getLogger();
  logger.info('Setting up authentication', { authEnabled: config.auth.enabled });

  if (playerIdentityRepository) {
    // First, register Clerk's base middleware
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { clerkMiddleware: baseClerkMiddleware } = require('@clerk/express');
    app.use(baseClerkMiddleware());
    logger.info('Registered Clerk base middleware');

    // Then, register our custom middleware that uses getAuth()
    app.use(clerkMiddleware(playerIdentityRepository));
    logger.info('Registered custom Clerk middleware');

    if (!config.auth.enabled) {
      // Log info when authentication is optional
      logger.info(
        'Authentication is optional (AUTH_ENABLED=false) - JWT tokens will be processed but not required'
      );
    }
  } else {
    if (config.auth.enabled) {
      throw new Error('playerIdentityRepository is required when AUTH_ENABLED=true');
    }
    // Log warning when authentication is completely disabled
    logger.warn(
      'Authentication is disabled (AUTH_ENABLED=false) and no playerIdentityRepository provided'
    );
  }

  // Track in-flight requests for graceful shutdown
  app.use(inFlightTracker.middleware);

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
 * Adds static file serving for the React web client
 * Serves the built React app from web-client/dist
 * Must be called before finalizeApp()
 * @param app - Express application instance
 */
export function addStaticFileServing(app: Express): void {
  const webClientPath = path.join(__dirname, '..', '..', '..', '..', 'web-client', 'dist');

  // Serve static files from web-client/dist
  app.use(express.static(webClientPath));
}

/**
 * Adds SPA fallback route for React Router
 * Must be called as part of finalizeApp() before 404 handler
 * @param app - Express application instance
 */
function addSpaFallback(app: Express): void {
  const webClientPath = path.join(__dirname, '..', '..', '..', '..', 'web-client', 'dist');

  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    // Skip if this is an API route
    if (req.path.startsWith('/api')) {
      return next();
    }

    // Serve index.html for all other routes (SPA routing)
    res.sendFile(path.join(webClientPath, 'index.html'), (err) => {
      if (err) {
        // If index.html doesn't exist, pass to 404 handler
        next();
      }
    });
  });
}

/**
 * Finalizes the app by adding SPA fallback, 404 and error handlers
 * Call this after all routes have been registered
 */
export function finalizeApp(app: Express): void {
  // SPA fallback for React Router (must be before 404 handler)
  addSpaFallback(app);

  // 404 handler for undefined routes (must be after all routes)
  app.use(notFoundHandler);

  // Error handling middleware (must be last)
  app.use(errorHandler);
}
