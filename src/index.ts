/**
 * Async Boardgame Service
 * Entry point for the application
 */

import { createApp, addStaticFileServing, finalizeApp, inFlightTracker } from './adapters/rest/app';
import { createGameRoutes } from './adapters/rest/gameRoutes';
import { createPlayerRoutes } from './adapters/rest/playerRoutes';
import { createHealthRoutes } from './adapters/rest/healthRoutes';
import { PluginRegistry } from './application/PluginRegistry';
import { GameLockManager } from './application/GameLockManager';
import { GameManagerService } from './application/services/GameManagerService';
import { StateManagerService } from './application/services/StateManagerService';
import { InMemoryGameRepository } from './infrastructure/persistence/InMemoryGameRepository';
import { PostgresGameRepository } from './infrastructure/persistence/PostgresGameRepository';
import { InMemoryPlayerIdentityRepository } from './infrastructure/persistence/InMemoryPlayerIdentityRepository';
import { RendererService } from './infrastructure/rendering/RendererService';
import { TicTacToeEngine } from './adapters/plugins/tic-tac-toe/TicTacToeEngine';
import { DatabaseConnection } from './infrastructure/persistence/DatabaseConnection';
import { DatabaseMigrator } from './infrastructure/persistence/DatabaseMigrator';
import { validateAndLogConfig } from './config';
import { GameRepository } from '@domain/interfaces';
import { initializeLogger } from './infrastructure/logging/Logger';

console.log('Async Boardgame Service - Starting...');

// Main application startup function
async function startApplication() {
  // Load configuration
  const config = validateAndLogConfig();

  // Initialize logger
  const logger = initializeLogger(config.logging.level, config.logging.format);
  logger.info('Async Boardgame Service starting', {
    nodeEnv: config.nodeEnv,
    port: config.port,
    logLevel: config.logging.level,
    logFormat: config.logging.format,
  });

  // Initialize database connection and repository based on configuration
  let dbConnection: DatabaseConnection | null = null;
  let gameRepository: GameRepository;

  if (config.database.url) {
    logger.info('Initializing database connection', {
      poolSize: config.database.poolSize,
    });

    dbConnection = new DatabaseConnection({
      connectionString: config.database.url,
      poolSize: config.database.poolSize,
    });

    // Connect to database with retry logic
    try {
      await dbConnection.connect();
      logger.info('Database connection established');
    } catch (error) {
      logger.error('Failed to connect to database', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    // Apply database migrations
    logger.info('Applying database migrations');
    try {
      const migrator = new DatabaseMigrator(dbConnection.getPool());
      await migrator.applyMigrations();
      logger.info('Database migrations completed');
    } catch (error) {
      logger.error('Failed to apply database migrations', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    // Use PostgreSQL repository
    logger.info('Using PostgreSQL for game state persistence');
    gameRepository = new PostgresGameRepository(config.database.url, config.database.poolSize);
  } else {
    logger.info('No DATABASE_URL configured, using in-memory storage');
    gameRepository = new InMemoryGameRepository();
  }

  // Initialize dependencies
  const pluginRegistry = new PluginRegistry();
  const playerIdentityRepository = new InMemoryPlayerIdentityRepository();
  const gameLockManager = new GameLockManager();
  const rendererService = new RendererService(pluginRegistry, gameRepository);

  // Register game plugins
  const ticTacToeEngine = new TicTacToeEngine();
  pluginRegistry.register(ticTacToeEngine);
  logger.info('Registered game plugin', {
    gameType: ticTacToeEngine.getGameType(),
  });

  // Initialize services
  const gameManagerService = new GameManagerService(pluginRegistry, gameRepository);
  const stateManagerService = new StateManagerService(
    gameRepository,
    pluginRegistry,
    gameLockManager
  );

  // Create Express app
  const app = createApp();

  // Create API routes
  const gameRouter = createGameRoutes(
    gameManagerService,
    gameRepository,
    stateManagerService,
    rendererService
  );
  const playerRouter = createPlayerRoutes(playerIdentityRepository);
  const healthRouter = createHealthRoutes(gameRepository);

  // Add routes to app
  app.use('/api', gameRouter);
  app.use('/api', playerRouter);
  app.use(healthRouter); // Health check at root level (/health)

  // Add static file serving for React web client
  addStaticFileServing(app);

  // Finalize app with error handlers
  finalizeApp(app);

  // Start server
  const PORT = config.port;
  const server = app.listen(PORT, () => {
    logger.info('Async Boardgame Service started', {
      port: PORT,
      url: `http://localhost:${PORT}`,
      apiUrl: `http://localhost:${PORT}/api`,
      availableGameTypes: pluginRegistry.list().map((t) => t.type),
    });
  });

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    logger.info('Shutdown signal received', { signal });
    const shutdownStartTime = Date.now();

    try {
      // Step 1: Stop accepting new requests
      logger.info('Shutdown step 1/4: Stopping acceptance of new requests');
      inFlightTracker.startShutdown();
      logger.info('New requests will be rejected with 503 Service Unavailable');

      // Step 2: Stop accepting new HTTP connections
      logger.info('Shutdown step 2/4: Closing HTTP server');
      await new Promise<void>((resolve) => {
        server.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });

      // Step 3: Wait for in-flight requests to complete (30s timeout)
      const inFlightCount = inFlightTracker.getInFlightCount();
      if (inFlightCount > 0) {
        logger.info('Shutdown step 3/4: Waiting for in-flight requests', {
          count: inFlightCount,
          timeoutMs: 30000,
        });
        await inFlightTracker.waitForCompletion(30000);
        const remainingCount = inFlightTracker.getInFlightCount();
        if (remainingCount === 0) {
          logger.info('All in-flight requests completed');
        } else {
          logger.warn('Shutdown timeout reached with requests still in-flight', {
            remainingCount,
          });
        }
      } else {
        logger.info('Shutdown step 3/4: No in-flight requests to wait for');
      }

      // Step 4: Close database connections
      logger.info('Shutdown step 4/4: Closing database connections');

      // Close database connection if it exists
      if (dbConnection) {
        await dbConnection.close();
        logger.info('Database connection closed');
      }

      // Close repository connections (PostgresGameRepository has its own pool)
      if (gameRepository instanceof PostgresGameRepository) {
        await gameRepository.close();
        logger.info('Repository connection pool closed');
      }

      const shutdownDuration = Date.now() - shutdownStartTime;
      logger.info('Graceful shutdown completed', { durationMs: shutdownDuration });
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the application
startApplication().catch((error) => {
  // Logger may not be initialized yet, so use console.error
  console.error('Failed to start application:', error);
  process.exit(1);
});
