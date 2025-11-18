# Design Document

## Overview

The Async Boardgame Service is built on a plugin-based architecture that separates core game management from game-specific logic. The system consists of three main layers:

1. **REST API Layer**: Handles HTTP requests and responses
2. **Service Layer**: Manages game instances, state, and orchestration
3. **Plugin Layer**: Implements game-specific rules and rendering

The design follows TDD principles and emphasizes extensibility through well-defined interfaces. The architecture supports concurrent access, multiple game types, and complex game mechanics while maintaining a clean separation of concerns.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        REST API Layer                        │
│  (Express/Fastify - Game CRUD, Moves, State, Rendering)    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Game Manager │  │ State Manager│  │   Renderer   │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                      Plugin Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Game Engine  │  │ Game Engine  │  │ Game Engine  │     │
│  │  Plugin A    │  │  Plugin B    │  │  Plugin C    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    Persistence Layer                         │
│              (In-memory → File → Database)                   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Language**: TypeScript - Provides strong type safety for plugin interfaces, compile-time validation of game engine implementations, and excellent IDE support for plugin developers. The interface/abstract class system in TypeScript is ideal for defining extensible plugin contracts while maintaining type safety across the entire system.
- **Runtime**: Node.js
- **Web Framework**: Express (simple, well-documented, TDD-friendly)
- **Testing**: Jest (comprehensive testing framework with good TypeScript support)
- **Image Generation**: Canvas or SVG libraries (node-canvas or svg.js)
- **Persistence**: Start with in-memory, design for easy migration to file-based or database storage

### Architectural Pattern: Hexagonal Architecture (Ports and Adapters)

The system follows Hexagonal Architecture to maintain clear boundaries and enable testability:

**Core Domain (Hexagon Center)**:
- Game engine interfaces and contracts
- Business logic for game state management
- Domain models (GameState, Player, Move, etc.)

**Ports (Interfaces)**:
- Primary Ports (driving): REST API, CLI (future)
- Secondary Ports (driven): Persistence, Rendering, External services

**Adapters**:
- Primary Adapters: Express REST controllers
- Secondary Adapters: In-memory repository, File repository, Database repository, SVG renderer, PNG renderer

This ensures the core game logic is independent of delivery mechanisms and infrastructure concerns.

## Components and Interfaces

### 1. Game Engine Interface

The core plugin interface that all game implementations must implement:

**Note on Implementation**: An abstract base class `BaseGameEngine` will provide default implementations for optional hooks (before/after methods) and common utility methods. Plugin developers can extend this base class to reduce boilerplate while still having the flexibility to override any behavior.

```typescript
interface GameEnginePlugin {
  // Metadata
  getGameType(): string;
  getMinPlayers(): number;
  getMaxPlayers(): number;
  getDescription(): string;
  
  // Lifecycle hooks
  onGameCreated(state: GameState, config: GameConfig): void;
  onPlayerJoined(state: GameState, playerId: string): void;
  onGameStarted(state: GameState): void;
  onGameEnded(state: GameState): void;
  
  // Core game logic with hooks
  beforeInitializeGame?(players: Player[], config: GameConfig): void;
  initializeGame(players: Player[], config: GameConfig): GameState;
  afterInitializeGame?(state: GameState): void;
  
  beforeValidateMove?(state: GameState, playerId: string, move: Move): void;
  validateMove(state: GameState, playerId: string, move: Move): ValidationResult;
  afterValidateMove?(state: GameState, playerId: string, move: Move, result: ValidationResult): void;
  
  beforeApplyMove?(state: GameState, playerId: string, move: Move): void;
  applyMove(state: GameState, playerId: string, move: Move): GameState;
  afterApplyMove?(oldState: GameState, newState: GameState, move: Move): void;
  
  isGameOver(state: GameState): boolean;
  getWinner(state: GameState): string | null;
  
  // Turn management
  getCurrentPlayer(state: GameState): string;
  getNextPlayer(state: GameState): string;
  advanceTurn(state: GameState): GameState;
  
  // Rendering with hooks
  beforeRenderBoard?(state: GameState): void;
  renderBoard(state: GameState): BoardRenderData;
  afterRenderBoard?(state: GameState, renderData: BoardRenderData): void;
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

interface BoardRenderData {
  // Fully flexible rendering - plugins provide complete render instructions
  // No predefined shapes, just layers of render elements
  viewBox: { width: number; height: number }; // Canvas/SVG dimensions
  backgroundColor?: string;
  spaces: SpaceRenderData[];
  layers: RenderLayer[];
}

interface SpaceRenderData {
  id: string;
  position: { x: number; y: number };
  tokens: TokenRenderData[];
  metadata?: Record<string, any>;
}

interface TokenRenderData {
  id: string;
  type: string;
  color?: string;
  icon?: string;
  label?: string;
}

interface RenderLayer {
  name: string;
  zIndex: number;
  elements: RenderElement[];
}

interface RenderElement {
  type: 'rect' | 'circle' | 'path' | 'text' | 'image';
  attributes: Record<string, any>;
}
```

### 2. Game State Model

```typescript
// Base game state - plugins can extend with custom properties via metadata
// Plugins should define their own typed interfaces that extend this base
interface GameState<TMetadata = Record<string, any>> {
  gameId: string;
  gameType: string;
  lifecycle: GameLifecycle;
  players: Player[];
  currentPlayerIndex: number;
  phase: string;
  board: Board;
  moveHistory: Move[];
  metadata: TMetadata; // Strongly typed per game implementation
  version: number; // For optimistic locking
  createdAt: Date;
  updatedAt: Date;
}

// Example: Tic-Tac-Toe specific state
interface TicTacToeState extends GameState<{
  boardSize: number;
  winCondition: number;
}> {}

// Example: Card game specific state
interface CardGameState extends GameState<{
  deck: Card[];
  discardPile: Card[];
  playerHands: Record<string, Card[]>;
}> {}

enum GameLifecycle {
  CREATED = 'created',              // Game instance created, no players yet
  WAITING_FOR_PLAYERS = 'waiting_for_players',  // Waiting for minimum players
  ACTIVE = 'active',                // Game in progress
  COMPLETED = 'completed',          // Game finished normally
  ABANDONED = 'abandoned'           // Game abandoned/cancelled
}

// Player ID is unique within the system and can be linked to external identity providers
// The externalId field supports OAuth, Discord, Steam, etc.
interface Player {
  id: string;              // Internal unique ID
  externalId?: string;     // External identity (OAuth sub, Discord ID, etc.)
  name: string;
  joinedAt: Date;
  metadata?: Record<string, any>;
}

interface Board {
  spaces: Space[];
  metadata: Record<string, any>;
}

interface Space {
  id: string;
  position: Position;
  tokens: Token[];
  metadata?: Record<string, any>;
}

interface Token {
  id: string;
  type: string;
  ownerId?: string;
  metadata?: Record<string, any>;
}

interface Position {
  x: number;
  y: number;
  z?: number; // For 3D or layered boards
}

// Base move interface - plugins define their own typed move structures
interface Move<TParameters = Record<string, any>> {
  playerId: string;
  timestamp: Date;
  action: string;
  parameters: TParameters; // Strongly typed per game implementation
}

// Example: Tic-Tac-Toe move
interface TicTacToeMove extends Move<{
  row: number;
  col: number;
}> {
  action: 'place';
}

// Example: Card game move
interface CardGameMove extends Move<{
  cardId: string;
  targetPlayerId?: string;
  targetSpaceId?: string;
}> {
  action: 'play_card' | 'draw_card' | 'discard_card';
}
```

### 3. Service Layer Components

#### GameManagerService

Responsible for game instance lifecycle management:

```typescript
class GameManagerService {
  createGame(gameType: string, config: GameConfig): GameState;
  getGame(gameId: string): GameState | null;
  listGames(filters: GameFilters): PaginatedResult<GameState>;
  joinGame(gameId: string, playerId: string): GameState;
  listAvailableGameTypes(): GameTypeInfo[];
}

interface GameConfig {
  players?: Player[];
  customSettings?: Record<string, any>;
}

interface GameFilters {
  playerId?: string;
  lifecycle?: GameLifecycle;
  gameType?: string;
  page?: number;
  pageSize?: number;
}

interface GameTypeInfo {
  type: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  configSchema?: object;
}
```

#### StateManagerService

Handles game state updates with concurrency control:

```typescript
class StateManagerService {
  applyMove(gameId: string, playerId: string, move: Move, expectedVersion: number): GameState;
  getState(gameId: string): GameState | null;
  validateMove(gameId: string, playerId: string, move: Move): ValidationResult;
}
```

#### RendererService

Generates visual representations of game boards:

```typescript
class RendererService {
  renderGame(gameId: string, format: 'png' | 'svg'): Buffer;
  renderState(state: GameState, format: 'png' | 'svg'): Buffer;
}
```

### 4. Plugin Registry

Manages registration and retrieval of game engine plugins:

```typescript
class PluginRegistry {
  register(plugin: GameEnginePlugin): void;
  get(gameType: string): GameEnginePlugin | null;
  list(): GameTypeInfo[];
  unregister(gameType: string): void;
}
```

## Data Models

### Persistence Strategy

**Phase 1 (MVP)**: In-memory storage with Map-based repositories
- Fast development and testing
- No external dependencies
- Data lost on restart (acceptable for initial development)

**Phase 2**: File-based persistence
- JSON files for each game instance
- Simple backup and portability
- Suitable for low-to-medium traffic

**Phase 3**: Database persistence
- PostgreSQL or MongoDB
- Proper indexing and querying
- Production-ready scalability

### Repository Pattern

```typescript
interface GameRepository {
  save(state: GameState): Promise<void>;
  findById(gameId: string): Promise<GameState | null>;
  findByPlayer(playerId: string, filters: GameFilters): Promise<PaginatedResult<GameState>>;
  update(gameId: string, state: GameState, expectedVersion: number): Promise<GameState>;
  delete(gameId: string): Promise<void>;
}
```

## Error Handling

### Error Types

```typescript
class GameError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
  }
}

// Specific error classes
class GameNotFoundError extends GameError {
  constructor(gameId: string) {
    super(`Game ${gameId} not found`, 'GAME_NOT_FOUND', 404);
  }
}

class InvalidMoveError extends GameError {
  constructor(reason: string) {
    super(`Invalid move: ${reason}`, 'INVALID_MOVE', 400, { reason });
  }
}

class ConcurrencyError extends GameError {
  constructor(gameId: string) {
    super(`Game ${gameId} was modified by another request`, 'STALE_STATE', 409);
  }
}

class UnauthorizedMoveError extends GameError {
  constructor(playerId: string) {
    super(`Player ${playerId} is not authorized to make this move`, 'UNAUTHORIZED_MOVE', 403);
  }
}
```

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_MOVE",
    "message": "Invalid move: Cannot move piece to occupied space",
    "details": {
      "reason": "Cannot move piece to occupied space"
    }
  }
}
```

## Testing Strategy

### Test Pyramid

```
        ┌─────────────┐
        │   E2E Tests │  (10%)
        │  API Tests  │
        └─────────────┘
      ┌─────────────────┐
      │ Integration Tests│ (20%)
      │  Service Layer   │
      └─────────────────┘
    ┌───────────────────────┐
    │     Unit Tests        │ (70%)
    │ Plugins, Utils, Logic │
    └───────────────────────┘
```

### TDD Workflow

1. **Red**: Write a failing test that defines desired behavior
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code quality while keeping tests green

### Test Categories

#### Unit Tests
- Game engine plugin logic
- Move validation
- State transitions
- Utility functions
- Individual service methods

#### Integration Tests
- Service layer interactions
- Plugin registry operations
- Repository operations
- State manager with concurrency

#### API Tests (E2E)
- REST endpoint behavior
- Request/response formats
- Error handling
- Authentication/authorization (future)

### Test Utilities

```typescript
// Test builders for creating test data
class GameStateBuilder {
  withPlayers(players: Player[]): this;
  withBoard(board: Board): this;
  inLifecycle(lifecycle: GameLifecycle): this;
  build(): GameState;
}

// Mock plugin for testing
class MockGameEngine implements GameEnginePlugin {
  // Configurable behavior for testing
}
```

### Coverage Goals

- Core game logic: 90%+
- Service layer: 85%+
- API layer: 80%+
- Overall: 80%+

## REST API Design

### Endpoints

#### Game Management

```
POST   /api/games
GET    /api/games
GET    /api/games/:gameId
POST   /api/games/:gameId/join
DELETE /api/games/:gameId

GET    /api/game-types
```

#### Game Play

```
GET    /api/games/:gameId/state
POST   /api/games/:gameId/moves
GET    /api/games/:gameId/moves
```

#### Rendering

```
GET    /api/games/:gameId/board.png
GET    /api/games/:gameId/board.svg
```

### Request/Response Examples

#### Create Game

```http
POST /api/games
Content-Type: application/json

{
  "gameType": "tic-tac-toe",
  "config": {
    "players": [
      { "id": "player1", "name": "Alice" },
      { "id": "player2", "name": "Bob" }
    ]
  }
}
```

Response:
```json
{
  "gameId": "game-123",
  "gameType": "tic-tac-toe",
  "lifecycle": "active",
  "players": [...],
  "state": {...}
}
```

#### Make Move

```http
POST /api/games/game-123/moves
Content-Type: application/json

{
  "playerId": "player1",
  "move": {
    "action": "place",
    "parameters": {
      "spaceId": "0,0"
    }
  },
  "version": 5
}
```

Response:
```json
{
  "success": true,
  "state": {...},
  "version": 6
}
```

## Progressive Complexity

### Phase 1: Simple Games (Tic-Tac-Toe)
- 2 players
- Rectangular grid
- Simple turn-based mechanics
- No dice, cards, or phases

### Phase 2: Intermediate Games (Checkers)
- 2 players
- Rectangular grid
- Multiple tokens per player
- Capture mechanics

### Phase 3: Card Games (Simple card game)
- 2-4 players
- Card deck management
- Hidden information (player hands)

### Phase 4: Dice Games (Backgammon-style)
- 2 players
- Dice rolling
- Probability-based moves

### Phase 5: Complex Games (Settlers of Catan-style)
- 3-6 players
- Hexagonal board
- Multiple phases
- Resource management
- Trading mechanics

### Phase 6: Advanced Features
- 6-8 players
- Custom board shapes
- Multiple decks
- Complex phase management
- Multiple tokens per space

## Concurrency and State Management

### Optimistic Locking

Each game state has a version number that increments with each update:

1. Client reads state (version N)
2. Client submits move with version N
3. Server checks if current version is still N
4. If yes: apply move, increment to N+1
5. If no: return 409 Conflict error

### Request Serialization

For each game instance, moves are processed sequentially using a queue or lock mechanism:

```typescript
class GameLockManager {
  async withLock<T>(gameId: string, fn: () => Promise<T>): Promise<T>;
}
```

## Rendering Architecture

### Layered Rendering

```
┌─────────────────────────────────────┐
│  Frame Layer (metadata, title)      │
├─────────────────────────────────────┤
│  Board Layer (grid, spaces)         │
├─────────────────────────────────────┤
│  Token Layer (pieces, markers)      │
├─────────────────────────────────────┤
│  Overlay Layer (highlights, labels) │
└─────────────────────────────────────┘
```

### Rendering Pipeline

1. Game engine provides BoardRenderData
2. Renderer service creates frame layer with metadata
3. Renderer service delegates board-specific rendering to plugin
4. Layers are composed in z-index order
5. Final image is generated in requested format (PNG/SVG)

## Extension Points

### Custom Game Mechanics

Plugins can extend the base game state with custom metadata:

```typescript
interface CustomGameState extends GameState {
  metadata: {
    resources?: Record<string, number>;
    cards?: Card[];
    diceRoll?: number;
    // ... any custom data
  };
}
```

### Custom Move Types

Moves are flexible and game-specific:

```typescript
// Tic-tac-toe move
{ action: 'place', parameters: { spaceId: '0,0' } }

// Card game move
{ action: 'play_card', parameters: { cardId: 'card-5', targetPlayerId: 'player2' } }

// Dice game move
{ action: 'roll_dice', parameters: { diceCount: 2 } }
```

### Lifecycle Hooks

Plugins can react to game lifecycle events:

```typescript
onGameCreated(state, config) {
  // Initialize custom resources
}

onPlayerJoined(state, playerId) {
  // Deal initial cards
}

onGameStarted(state) {
  // Set up first turn
}
```

## Security Considerations (Future)

While not part of the initial MVP, the design accommodates future security features:

- Player authentication and authorization
- Move validation includes player identity checks
- API endpoints can be protected with middleware
- Game state can include player-specific hidden information

## Performance Considerations

- In-memory storage provides sub-millisecond access times
- State updates are atomic per game instance
- Rendering is done on-demand (not cached initially)
- Future optimization: cache rendered boards with TTL
- Pagination for game lists prevents large result sets

## Deployment Strategy

### Development
- Local Node.js server
- In-memory storage
- Hot reload for rapid iteration

### Testing
- Automated test suite runs on every commit
- Integration tests with real HTTP requests
- Mock plugins for testing framework

### Production (Future)
- Containerized deployment (Docker)
- Database persistence
- Load balancing for multiple instances
- Redis for distributed locking
