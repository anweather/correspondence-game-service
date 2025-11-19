# Testing Documentation

This document describes the testing approach, utilities, and best practices for the Async Boardgame Service.

## Testing Philosophy

This project follows **Test-Driven Development (TDD)** methodology:

1. **Red**: Write a failing test that defines desired behavior
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code quality while keeping tests green

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── domain/             # Domain model tests
│   ├── application/        # Service layer tests
│   ├── infrastructure/     # Infrastructure tests
│   └── adapters/           # Adapter tests (plugins, REST)
├── integration/            # Integration tests
│   └── rest/              # REST API integration tests
├── e2e/                   # End-to-end tests
│   └── ticTacToe.e2e.test.ts
└── utils/                 # Test utilities and fixtures
    ├── GameStateBuilder.ts
    ├── MockGameEngine.ts
    ├── fixtures.ts
    └── index.ts
```

## Running Tests

```bash
# Run all tests in watch mode
npm test

# Run all tests once
npm run test:run

# Run specific test file
npm run test:run -- GameManagerService.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests matching a pattern
npm run test:run -- --testNamePattern="should create game"
```

## Test Utilities

The project provides comprehensive test utilities to simplify test data creation.

### GameStateBuilder

Fluent API for building `GameState` objects:

```typescript
import { GameStateBuilder, createPlayer } from '@tests/utils';

const gameState = new GameStateBuilder()
  .withGameId('test-game-123')
  .withGameType('tic-tac-toe')
  .withPlayers([
    createPlayer('player1', 'Alice'),
    createPlayer('player2', 'Bob'),
  ])
  .withLifecycle(GameLifecycle.ACTIVE)
  .withCurrentPlayerIndex(0)
  .withVersion(5)
  .build();
```

**Available Methods:**
- `withGameId(id: string)`: Set game ID
- `withGameType(type: string)`: Set game type
- `withLifecycle(lifecycle: GameLifecycle)`: Set lifecycle state
- `withPlayers(players: Player[])`: Set players
- `addPlayer(player: Player)`: Add a single player
- `withCurrentPlayerIndex(index: number)`: Set current player
- `withPhase(phase: string)`: Set game phase
- `withBoard(board: Board)`: Set board
- `addSpace(space: Space)`: Add a space to the board
- `withMoveHistory(moves: Move[])`: Set move history
- `addMove(move: Move)`: Add a move to history
- `withMetadata(metadata: Record<string, any>)`: Set metadata
- `withVersion(version: number)`: Set version number
- `withCreatedAt(date: Date)`: Set creation timestamp
- `withUpdatedAt(date: Date)`: Set update timestamp
- `build()`: Build the GameState object

### MockGameEngine

Configurable mock game engine for testing:

```typescript
import { MockGameEngine } from '@tests/utils';

const mockEngine = new MockGameEngine('test-game')
  .withMinPlayers(2)
  .withMaxPlayers(4)
  .withDescription('Test game for unit tests')
  .withValidationResult({ valid: true })
  .withGameOverResult(false)
  .withWinnerResult(null);

// Register with plugin registry
registry.register(mockEngine);

// Check if hooks were called
expect(mockEngine.beforeApplyMoveCalled).toBe(true);
expect(mockEngine.afterApplyMoveCalled).toBe(true);
```

**Configuration Methods:**
- `withMinPlayers(min: number)`: Set minimum players
- `withMaxPlayers(max: number)`: Set maximum players
- `withDescription(desc: string)`: Set description
- `withValidationResult(result: ValidationResult)`: Set validation result
- `withGameOverResult(isOver: boolean)`: Set game over state
- `withWinnerResult(winner: string | null)`: Set winner
- `throwOnInitialize()`: Make initialization throw error
- `throwOnApplyMove()`: Make move application throw error
- `resetHookTracking()`: Reset hook call tracking

**Hook Tracking Properties:**
- `onGameCreatedCalled`
- `onPlayerJoinedCalled`
- `onGameStartedCalled`
- `onGameEndedCalled`
- `beforeInitializeGameCalled`
- `afterInitializeGameCalled`
- `beforeValidateMoveCalled`
- `afterValidateMoveCalled`
- `beforeApplyMoveCalled`
- `afterApplyMoveCalled`
- `beforeRenderBoardCalled`
- `afterRenderBoardCalled`

### Test Fixtures

Pre-configured test data for common scenarios:

```typescript
import { fixtures } from '@tests/utils';

// Common players
const alice = fixtures.players.alice;
const bob = fixtures.players.bob;

// Pre-configured game states
const game = fixtures.twoPlayerGame();
const waitingGame = fixtures.waitingForPlayersGame();
const completedGame = fixtures.completedGame();
const ticTacToeGame = fixtures.ticTacToeGame();
const gameInProgress = fixtures.ticTacToeInProgress();

// Games with specific characteristics
const gameWithHistory = fixtures.gameWithMoveHistory(10);
const versionedGame = fixtures.gameAtVersion(5);
const gameWithMeta = fixtures.gameWithMetadata({ custom: 'data' });
```

**Available Fixtures:**
- `fixtures.players.alice`: Player Alice
- `fixtures.players.bob`: Player Bob
- `fixtures.players.charlie`: Player Charlie
- `fixtures.players.diana`: Player Diana
- `fixtures.twoPlayerGame()`: Standard 2-player game
- `fixtures.fourPlayerGame()`: 4-player game
- `fixtures.waitingForPlayersGame()`: Game waiting for players
- `fixtures.completedGame()`: Completed game with winner
- `fixtures.ticTacToeGame()`: Empty tic-tac-toe board
- `fixtures.ticTacToeInProgress()`: Tic-tac-toe game in progress
- `fixtures.gameWithMoveHistory(count)`: Game with N moves
- `fixtures.gameAtVersion(version)`: Game at specific version
- `fixtures.gameWithMetadata(metadata)`: Game with custom metadata

### Helper Functions

```typescript
import {
  createPlayer,
  createMove,
  createSpace,
  createToken,
  createPlayerList,
  createMoveList,
} from '@tests/utils';

// Create individual objects
const player = createPlayer('player1', 'Alice', { rating: 1500 });
const move = createMove('player1', 'place', { row: 0, col: 0 });
const space = createSpace('0,0', 0, 0, [], { type: 'corner' });
const token = createToken('token1', 'X', 'player1', { color: 'red' });

// Create lists
const players = createPlayerList(4); // Creates 4 players
const moves = createMoveList(10, ['player1', 'player2']); // Creates 10 moves alternating between players
```

## Writing Unit Tests

### Testing Services

```typescript
import { GameManagerService } from '@application/services/GameManagerService';
import { PluginRegistry } from '@application/PluginRegistry';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import { MockGameEngine, createPlayer } from '../../utils';

describe('GameManagerService', () => {
  let service: GameManagerService;
  let registry: PluginRegistry;
  let repository: InMemoryGameRepository;

  beforeEach(() => {
    registry = new PluginRegistry();
    repository = new InMemoryGameRepository();
    service = new GameManagerService(registry, repository);
  });

  it('should create a game', async () => {
    // Arrange
    const plugin = new MockGameEngine('test-game')
      .withMinPlayers(2)
      .withMaxPlayers(2);
    registry.register(plugin);

    const player1 = createPlayer('player1', 'Alice');
    const player2 = createPlayer('player2', 'Bob');

    // Act
    const game = await service.createGame('test-game', {
      players: [player1, player2],
    });

    // Assert
    expect(game.gameType).toBe('test-game');
    expect(game.players).toHaveLength(2);
    expect(game.lifecycle).toBe(GameLifecycle.ACTIVE);
  });
});
```

### Testing Game Engines

```typescript
import { TicTacToeEngine } from '@adapters/plugins/tic-tac-toe/TicTacToeEngine';
import { createPlayer, createMove } from '../../utils';

describe('TicTacToeEngine', () => {
  let engine: TicTacToeEngine;

  beforeEach(() => {
    engine = new TicTacToeEngine();
  });

  it('should initialize 3x3 board', () => {
    const players = [
      createPlayer('player1', 'Alice'),
      createPlayer('player2', 'Bob'),
    ];

    const state = engine.initializeGame(players, {});

    expect(state.board.spaces).toHaveLength(9);
    expect(state.currentPlayerIndex).toBe(0);
  });

  it('should validate valid move', () => {
    const players = [createPlayer('player1', 'Alice')];
    const state = engine.initializeGame(players, {});
    const move = createMove('player1', 'place', { row: 0, col: 0 });

    const result = engine.validateMove(state, 'player1', move);

    expect(result.valid).toBe(true);
  });

  it('should detect win condition', () => {
    let state = engine.initializeGame([
      createPlayer('player1', 'Alice'),
      createPlayer('player2', 'Bob'),
    ], {});

    // Play winning sequence
    state = engine.applyMove(state, 'player1', createMove('player1', 'place', { row: 0, col: 0 }));
    state = engine.advanceTurn(state);
    state = engine.applyMove(state, 'player2', createMove('player2', 'place', { row: 1, col: 0 }));
    state = engine.advanceTurn(state);
    state = engine.applyMove(state, 'player1', createMove('player1', 'place', { row: 0, col: 1 }));
    state = engine.advanceTurn(state);
    state = engine.applyMove(state, 'player2', createMove('player2', 'place', { row: 1, col: 1 }));
    state = engine.advanceTurn(state);
    state = engine.applyMove(state, 'player1', createMove('player1', 'place', { row: 0, col: 2 }));

    expect(engine.isGameOver(state)).toBe(true);
    expect(engine.getWinner(state)).toBe('player1');
  });
});
```

## Writing Integration Tests

Integration tests verify that multiple components work together correctly:

```typescript
import request from 'supertest';
import { app } from '@adapters/rest/app';
import { PluginRegistry } from '@application/PluginRegistry';
import { TicTacToeEngine } from '@adapters/plugins/tic-tac-toe/TicTacToeEngine';

describe('Game Management API', () => {
  beforeAll(() => {
    const registry = PluginRegistry.getInstance();
    registry.register(new TicTacToeEngine());
  });

  it('should create and retrieve a game', async () => {
    // Create game
    const createResponse = await request(app)
      .post('/api/games')
      .send({
        gameType: 'tic-tac-toe',
        config: {
          players: [
            { id: 'player1', name: 'Alice' },
            { id: 'player2', name: 'Bob' },
          ],
        },
      })
      .expect(201);

    const gameId = createResponse.body.data.gameId;

    // Retrieve game
    const getResponse = await request(app)
      .get(`/api/games/${gameId}`)
      .expect(200);

    expect(getResponse.body.data.gameId).toBe(gameId);
    expect(getResponse.body.data.players).toHaveLength(2);
  });
});
```

## Writing E2E Tests

End-to-end tests verify complete user workflows:

```typescript
import request from 'supertest';
import { app } from '@adapters/rest/app';

describe('Tic-Tac-Toe E2E', () => {
  it('should play a complete game', async () => {
    // Create game
    const createRes = await request(app)
      .post('/api/games')
      .send({
        gameType: 'tic-tac-toe',
        config: {
          players: [
            { id: 'player1', name: 'Alice' },
            { id: 'player2', name: 'Bob' },
          ],
        },
      });

    const gameId = createRes.body.data.gameId;
    let version = createRes.body.data.version;

    // Player 1 moves
    const move1 = await request(app)
      .post(`/api/games/${gameId}/moves`)
      .send({
        playerId: 'player1',
        move: { action: 'place', parameters: { row: 0, col: 0 } },
        version,
      });

    version = move1.body.data.version;

    // Player 2 moves
    const move2 = await request(app)
      .post(`/api/games/${gameId}/moves`)
      .send({
        playerId: 'player2',
        move: { action: 'place', parameters: { row: 1, col: 1 } },
        version,
      });

    // Continue until game ends...

    // Verify final state
    const finalState = await request(app)
      .get(`/api/games/${gameId}`)
      .expect(200);

    expect(finalState.body.data.lifecycle).toBe('completed');
  });
});
```

## Test Coverage

The project maintains high test coverage standards:

- **Overall**: 80% minimum
- **Branches**: 80% minimum
- **Functions**: 80% minimum
- **Lines**: 80% minimum

View coverage report:

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Best Practices

### 1. Test Naming

Use descriptive test names that explain the behavior:

```typescript
// Good
it('should throw InvalidMoveError when move is out of bounds', () => {});
it('should transition to COMPLETED lifecycle when game ends', () => {});

// Bad
it('should work', () => {});
it('test move validation', () => {});
```

### 2. Arrange-Act-Assert Pattern

Structure tests clearly:

```typescript
it('should apply move and increment version', async () => {
  // Arrange
  const gameState = fixtures.twoPlayerGame();
  await repository.save(gameState);
  const move = createMove('player1', 'test-action');

  // Act
  const result = await service.applyMove(gameState.gameId, 'player1', move, 1);

  // Assert
  expect(result.version).toBe(2);
  expect(result.moveHistory).toHaveLength(1);
});
```

### 3. Test One Thing

Each test should verify a single behavior:

```typescript
// Good - separate tests
it('should validate move parameters', () => {});
it('should check turn order', () => {});
it('should verify game state', () => {});

// Bad - testing multiple things
it('should validate move', () => {
  // Tests parameters, turn order, game state, etc.
});
```

### 4. Use Test Utilities

Leverage the provided utilities instead of creating test data manually:

```typescript
// Good
const game = fixtures.twoPlayerGame();
const player = createPlayer('player1', 'Alice');

// Bad
const game = {
  gameId: 'test-id',
  gameType: 'test-game',
  lifecycle: GameLifecycle.ACTIVE,
  players: [
    { id: 'player1', name: 'Alice', joinedAt: new Date() },
    { id: 'player2', name: 'Bob', joinedAt: new Date() },
  ],
  // ... many more fields
};
```

### 5. Test Error Cases

Don't just test the happy path:

```typescript
describe('validateMove', () => {
  it('should accept valid move', () => {});
  it('should reject move out of bounds', () => {});
  it('should reject move to occupied space', () => {});
  it('should reject move when not player turn', () => {});
  it('should reject move when game is over', () => {});
});
```

### 6. Avoid Test Interdependence

Each test should be independent:

```typescript
// Good - each test is independent
describe('GameService', () => {
  beforeEach(() => {
    service = new GameService();
  });

  it('test 1', () => {});
  it('test 2', () => {});
});

// Bad - tests depend on each other
describe('GameService', () => {
  let gameId;

  it('should create game', () => {
    gameId = service.createGame();
  });

  it('should get game', () => {
    service.getGame(gameId); // Depends on previous test
  });
});
```

### 7. Mock External Dependencies

Mock external dependencies to isolate the code under test:

```typescript
describe('GameManagerService', () => {
  let mockRepository: jest.Mocked<GameRepository>;
  let mockRegistry: jest.Mocked<PluginRegistry>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      // ...
    } as any;

    mockRegistry = {
      getPlugin: jest.fn(),
      // ...
    } as any;

    service = new GameManagerService(mockRegistry, mockRepository);
  });
});
```

## Debugging Tests

### Run Single Test

```bash
npm run test:run -- --testNamePattern="should create game"
```

### Run Single File

```bash
npm run test:run -- GameManagerService.test.ts
```

### Enable Verbose Output

```bash
npm run test:run -- --verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Continuous Integration

Tests run automatically on:
- Every commit (pre-commit hook)
- Every pull request
- Before deployment

Ensure all tests pass before submitting a pull request.

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [Test Utilities Source](../tests/utils/)
- [Example Tests](../tests/unit/application/)
