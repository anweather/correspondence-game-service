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

console.log('Async Boardgame Service - Starting...');

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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Async Boardgame Service running on http://localhost:${PORT}`);
  console.log(`✓ API available at http://localhost:${PORT}/api`);
  console.log(
    `✓ Available game types: ${pluginRegistry
      .list()
      .map((t) => t.type)
      .join(', ')}`
  );
});
