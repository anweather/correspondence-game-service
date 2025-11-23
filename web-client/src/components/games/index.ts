/**
 * Game Components Registry
 * Import and register all game-specific components here
 */

import { registerGameComponent } from './registry';
import { TicTacToeMoveInput } from '@games/tic-tac-toe/ui';
import { ConnectFourMoveInput } from '@games/connect-four/ui';

// Register tic-tac-toe component
registerGameComponent('tic-tac-toe', TicTacToeMoveInput);

// Register connect-four component
registerGameComponent('connect-four', ConnectFourMoveInput);

// Export registry functions
export { getGameComponent, hasGameComponent } from './registry';

