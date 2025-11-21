/**
 * Async Boardgame Service
 * Entry point for the application
 */

import { createApp, addApiRoutes, finalizeApp } from './adapters/rest/app';
import { createGameRoutes } from './adapters/rest/gameRoutes';
import { PluginRegistry } from './application/PluginRegistry';
import { GameLockManager } from './application/GameLockManager';
import { GameManagerService } from './application/services/GameManagerService';
import { StateManagerService } from './application/services/StateManagerService';
import { InMemoryGameRepository } from './infrastructure/persistence/InMemoryGameRepository';
import { RendererService } from './infrastructure/rendering/RendererService';
import { TicTacToeEngine } from './adapters/plugins/tic-tac-toe/TicTacToeEngine';

console.log('Async Boardgame Service - Starting...');

// Initialize dependencies
const pluginRegistry = new PluginRegistry();
const gameRepository = new InMemoryGameRepository();
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

// Create and add API routes
const apiRouter = createGameRoutes(
  gameManagerService,
  gameRepository,
  stateManagerService,
  rendererService
);
addApiRoutes(app, apiRouter);

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
