# Tic-Tac-Toe UI Components

This directory contains React UI components for the Tic-Tac-Toe game.

## Components

- **TicTacToeMoveInput**: Interactive grid component for selecting moves

## Testing

UI component tests are located in `web-client/src/components/games/tic-tac-toe/TicTacToeMoveInput.test.tsx`.

**Why tests are in web-client:**
- UI components require React and React Testing Library
- The web-client already has the complete testing infrastructure (vitest, jsdom, @testing-library/react)
- Running UI tests from the game package would require duplicating all React testing dependencies
- The components are consumed by the web-client, so tests run in the same environment where they're used

**Running UI tests:**
```bash
cd web-client
npm test -- --run TicTacToeMoveInput
```

## Usage

```typescript
import { TicTacToeMoveInput } from '@games/tic-tac-toe/ui';
import type { GameState, MoveInput } from '@games/tic-tac-toe/ui';

function MyComponent() {
  const handleMove = (move: MoveInput) => {
    console.log('Move:', move);
  };

  return (
    <TicTacToeMoveInput
      gameState={gameState}
      onMoveChange={handleMove}
    />
  );
}
```

## Types

All UI-related types are exported from `../types.ts` and include:
- `GameState`: Complete game state
- `MoveInput`: Move input format (action + parameters)
- `Player`, `Board`, `Space`, `Token`: Supporting types
