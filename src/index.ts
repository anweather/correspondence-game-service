/**
 * Async Boardgame Service
 * Entry point for the application
 */

import { createApp, addStaticFileServing, finalizeApp } from './adapters/rest/app';
import { createGameRoutes } from './adapters/rest/gameRoutes';
import { createPlayerRoutes } from './adapters/rest/playerRoutes';
import { PluginRegistry } from './application/PluginRegistry';
import { GameLockManager } from './application/GameLockManager';
import { GameManagerService } from './application/services/GameManagerService';
import { StateManagerService } from './application/services/StateManagerService';
import { InMemoryGameRepository } from './infrastructure/persistence/InMemoryGameRepository';
import { InMemoryPlayerIdentityRepository } from './infrastructure/persistence/InMemoryPlayerIdentityRepository';
import { RendererService } from './infrastructure/rendering/RendererService';
import { TicTacToeEngine } from './adapters/plugins/tic-tac-toe/TicTacToeEngine';
import { DatabaseConnection } from './infrastructure/persistence/DatabaseConnection';
import { DatabaseMigrator } from './infrastructure/persistence/DatabaseMigrator';
import { validateAndLogConfig } from './config';

console.log('Async Boardgame Service - Starting...');

// Main application startup function
async function startApplication() {
  // Load configuration
  const config = validateAndLogConfig();

  // Initialize database connection if DATABASE_URL is provided
  let dbConnection: DatabaseConnection | null = null;
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
  } else {
    console.log('No DATABASE_URL configured, using in-memory storage');
  }

  // Initialize dependencies
  const pluginRegistry = new PluginRegistry();
  const gameRepository = new InMemoryGameRepository();
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

  // Add routes to app
  app.use('/api', gameRouter);
  app.use('/api', playerRouter);

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
  const shutdown = async () => {
    console.log('Received shutdown signal, starting graceful shutdown...');

    // Stop accepting new connections
    server.close(() => {
      console.log('HTTP server closed');
    });

    // Close database connection if it exists
    if (dbConnection) {
      await dbConnection.close();
    }

    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Start the application
startApplication().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
