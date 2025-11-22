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

console.log('Async Boardgame Service - Starting...');

// Main application startup function
async function startApplication() {
  // Load configuration
  const config = validateAndLogConfig();

  // Initialize database connection and repository based on configuration
  let dbConnection: DatabaseConnection | null = null;
  let gameRepository: GameRepository;

  if (config.database.url) {
    console.log('Initializing database connection...');
    dbConnection = new DatabaseConnection({
      connectionString: config.database.url,
      poolSize: config.database.poolSize,
    });

    // Connect to database with retry logic
    await dbConnection.connect();

    // Apply database migrations
    console.log('Applying database migrations...');
    const migrator = new DatabaseMigrator(dbConnection.getPool());
    await migrator.applyMigrations();
    console.log('Database migrations completed');

    // Use PostgreSQL repository
    console.log('Using PostgreSQL for game state persistence');
    gameRepository = new PostgresGameRepository(config.database.url, config.database.poolSize);
  } else {
    console.log('No DATABASE_URL configured, using in-memory storage');
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
  console.log(`Registered game plugin: ${ticTacToeEngine.getGameType()}`);

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
    console.log(`✓ Async Boardgame Service running on http://localhost:${PORT}`);
    console.log(`✓ API available at http://localhost:${PORT}/api`);
    console.log(
      `✓ Available game types: ${pluginRegistry
        .list()
        .map((t) => t.type)
        .join(', ')}`
    );
  });

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, starting graceful shutdown...`);
    const shutdownStartTime = Date.now();

    try {
      // Step 1: Stop accepting new requests
      console.log('Step 1/4: Stopping acceptance of new requests...');
      inFlightTracker.startShutdown();
      console.log('✓ New requests will be rejected with 503 Service Unavailable');

      // Step 2: Stop accepting new HTTP connections
      console.log('Step 2/4: Closing HTTP server...');
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log('✓ HTTP server closed');
          resolve();
        });
      });

      // Step 3: Wait for in-flight requests to complete (30s timeout)
      const inFlightCount = inFlightTracker.getInFlightCount();
      if (inFlightCount > 0) {
        console.log(
          `Step 3/4: Waiting for ${inFlightCount} in-flight request(s) to complete (30s timeout)...`
        );
        await inFlightTracker.waitForCompletion(30000);
        const remainingCount = inFlightTracker.getInFlightCount();
        if (remainingCount === 0) {
          console.log('✓ All in-flight requests completed');
        } else {
          console.log(`⚠ Timeout reached, ${remainingCount} request(s) still in-flight`);
        }
      } else {
        console.log('Step 3/4: No in-flight requests to wait for');
      }

      // Step 4: Close database connections
      console.log('Step 4/4: Closing database connections...');

      // Close database connection if it exists
      if (dbConnection) {
        await dbConnection.close();
        console.log('✓ Database connection closed');
      }

      // Close repository connections (PostgresGameRepository has its own pool)
      if (gameRepository instanceof PostgresGameRepository) {
        await gameRepository.close();
        console.log('✓ Repository connection pool closed');
      }

      const shutdownDuration = Date.now() - shutdownStartTime;
      console.log(`\n✓ Graceful shutdown completed in ${shutdownDuration}ms`);
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the application
startApplication().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
