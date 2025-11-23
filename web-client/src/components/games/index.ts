/**
 * Game Components Registry
 * Import and register all game-specific components here
 */

import { registerGameComponent } from './registry';
import { TicTacToeMoveInput } from '@games/tic-tac-toe/ui';

// Register tic-tac-toe component
registerGameComponent('tic-tac-toe', TicTacToeMoveInput);

// Export registry functions
export { getGameComponent, hasGameComponent } from './registry';

