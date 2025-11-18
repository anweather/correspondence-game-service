# Implementation Plan

Following Red-Green-Refactor TDD: Write failing tests first (Red), implement minimal code to pass (Green), then refactor.

- [x] 1. Set up project structure and testing framework
  - Initialize TypeScript Node.js project with package.json
  - Install and configure Jest for TypeScript testing
  - Configure tsconfig.json for strict type checking and hexagonal architecture folder structure (src/domain, src/application, src/infrastructure, src/adapters)
  - Create initial folder structure following hexagonal architecture
  - Add npm scripts for running tests
  - _Requirements: 6.1, 6.2_

- [x] 2. TDD: Core domain models and interfaces
  - [x] 2.1 Write tests for domain models
    - Write tests for GameState interface with generic metadata support
    - Write tests for Player interface with externalId support
    - Write tests for Move interface with generic parameters
    - Write tests for Board, Space, Token, Position interfaces
    - Write tests for GameLifecycle enum transitions
    - _Requirements: 6.1, 6.2_
  
  - [x] 2.2 Implement domain models to pass tests
    - Create domain model interfaces: GameState<TMetadata>, Player, Move<TParameters>, Board, Space, Token, Position
    - Create GameLifecycle enum with all states (CREATED, WAITING_FOR_PLAYERS, ACTIVE, COMPLETED, ABANDONED)
    - _Requirements: 5.1_

- [x] 3. TDD: GameEnginePlugin interface and base class
  - [x] 3.1 Write tests for BaseGameEngine
    - Write tests for default hook implementations (should be no-ops)
    - Write tests for utility methods (player lookup, validation helpers)
    - Write tests that abstract methods throw when not implemented
    - _Requirements: 6.1, 6.2, 6.4_
  
  - [x] 3.2 Define GameEnginePlugin interface
    - Define all interface methods: metadata, lifecycle hooks, core logic with pre/post hooks, turn management, rendering
    - Define ValidationResult, BoardRenderData, and related rendering interfaces
    - _Requirements: 5.1, 5.6, 5.7_
  
  - [x] 3.3 Implement BaseGameEngine to pass tests
    - Create abstract class with no-op implementations for optional hooks
    - Implement utility methods for common operations
    - Leave core methods abstract (initializeGame, validateMove, applyMove, renderBoard)
    - _Requirements: 5.1_

- [-] 4. TDD: Error handling classes
  - [ ] 4.1 Write tests for error classes
    - Write tests for GameError base class with code, statusCode, details
    - Write tests for each specific error type with correct status codes
    - _Requirements: 6.1, 6.2, 6.4_
  
  - [ ] 4.2 Implement error classes to pass tests
    - Create GameError base class
    - Implement GameNotFoundError (404), InvalidMoveError (400), ConcurrencyError (409), UnauthorizedMoveError (403), GameFullError (409)
    - _Requirements: 1.4, 1a.5, 3.3, 7.3_

- [ ] 5. TDD: PluginRegistry
  - [ ] 5.1 Write tests for PluginRegistry
    - Write tests for plugin registration and retrieval
    - Write tests for duplicate registration prevention
    - Write tests for listing available game types
    - Write tests for unregister functionality
    - _Requirements: 6.1, 6.2, 6.4_
  
  - [ ] 5.2 Implement PluginRegistry to pass tests
    - Create PluginRegistry class with Map-based storage
    - Implement register, get, list, unregister methods
    - Add validation for duplicate game types
    - _Requirements: 1.7, 5.1_

- [ ] 6. TDD: InMemoryGameRepository
  - [ ] 6.1 Write tests for GameRepository interface
    - Write tests for save, findById, findByPlayer operations
    - Write tests for update with optimistic locking (version checking)
    - Write tests for delete operation
    - Write tests for pagination in findByPlayer
    - Write tests for ConcurrencyError when version mismatch
    - _Requirements: 6.1, 6.2, 6.4, 7.4_
  
  - [ ] 6.2 Define GameRepository interface
    - Define all repository methods with proper signatures
    - Define PaginatedResult interface
    - _Requirements: 7.4_
  
  - [ ] 6.3 Implement InMemoryGameRepository to pass tests
    - Use Map<string, GameState> for storage
    - Implement all methods with version checking for updates
    - Implement pagination logic
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 7. TDD: GameLockManager
  - [ ] 7.1 Write tests for GameLockManager
    - Write tests for sequential processing of operations on same game
    - Write tests for concurrent operations on different games
    - Write tests for lock cleanup after operation
    - Write tests for error handling within locked operations
    - _Requirements: 6.1, 6.2, 6.4, 7.1, 7.2, 7.5_
  
  - [ ] 7.2 Implement GameLockManager to pass tests
    - Create class with withLock method
    - Implement per-game-instance locking using Map<string, Promise>
    - Handle lock cleanup
    - _Requirements: 7.1, 7.2, 7.5_

- [ ] 8. TDD: GameManagerService
  - [ ] 8.1 Write tests for GameManagerService
    - Write tests for createGame with different player counts (CREATED vs WAITING_FOR_PLAYERS)
    - Write tests for getGame (found and not found cases)
    - Write tests for joinGame (success, duplicate player, full game, wrong lifecycle)
    - Write tests for lifecycle transitions (WAITING_FOR_PLAYERS → ACTIVE)
    - Write tests for listGames with filtering and pagination
    - Write tests for listAvailableGameTypes
    - _Requirements: 6.1, 6.2, 6.4, 1.1, 1.2, 1.3, 1.5, 1a.1, 1a.2, 1a.3, 1a.4, 1a.5_
  
  - [ ] 8.2 Implement GameManagerService to pass tests
    - Implement all methods using PluginRegistry and GameRepository
    - Handle lifecycle state management
    - Add validation logic
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1a.1, 1a.2, 1a.3, 1a.4, 1a.5, 8.1, 8.2, 8.3, 8.4_

- [ ] 9. TDD: StateManagerService
  - [ ] 9.1 Write tests for StateManagerService
    - Write tests for validateMove delegation to plugin
    - Write tests for applyMove with valid moves
    - Write tests for player authorization (wrong player, not in game)
    - Write tests for optimistic locking (version conflicts)
    - Write tests for move history tracking
    - Write tests for game over detection and lifecycle transition
    - Write tests for hook invocation (beforeApplyMove, afterApplyMove)
    - _Requirements: 6.1, 6.2, 6.4, 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 9.2 Implement StateManagerService to pass tests
    - Implement validateMove and applyMove methods
    - Integrate with GameLockManager for concurrency control
    - Add authorization checks and move history
    - Handle lifecycle transitions
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 10. TDD: Tic-Tac-Toe game plugin
  - [ ] 10.1 Write tests for TicTacToeEngine initialization
    - Write tests for metadata methods (getGameType, min/max players, description)
    - Write tests for initializeGame creating 3x3 board
    - Write tests for initial game state (empty board, first player)
    - _Requirements: 6.1, 6.2, 6.4, 5.1, 5.2_
  
  - [ ] 10.2 Write tests for TicTacToeEngine move validation
    - Write tests for valid moves (empty space, correct turn)
    - Write tests for invalid moves (occupied space, wrong player, out of bounds)
    - _Requirements: 6.1, 6.2, 6.4_
  
  - [ ] 10.3 Write tests for TicTacToeEngine move application
    - Write tests for placing tokens
    - Write tests for turn advancement
    - Write tests for win detection (rows, columns, diagonals)
    - Write tests for draw detection
    - Write tests for game over states
    - _Requirements: 6.1, 6.2, 6.4_
  
  - [ ] 10.4 Implement TicTacToeEngine to pass tests
    - Create TicTacToeEngine extending BaseGameEngine
    - Define TicTacToeState and TicTacToeMove interfaces
    - Implement all game logic methods
    - Implement getCurrentPlayer, getNextPlayer, advanceTurn
    - _Requirements: 5.1, 5.2_

- [ ] 11. TDD: RendererService
  - [ ] 11.1 Write tests for RendererService
    - Write tests for renderGame and renderState methods
    - Write tests for plugin delegation and hook invocation
    - Write tests for frame layer creation with metadata
    - Write tests for layer composition by z-index
    - _Requirements: 6.1, 6.2, 6.4, 4.1, 4.2, 4.3, 4.7_
  
  - [ ] 11.2 Write tests for SVG generation
    - Write tests for RenderElement conversion to SVG
    - Write tests for all element types (rect, circle, path, text, image)
    - Write tests for viewBox and dimensions
    - _Requirements: 6.1, 6.2, 6.4, 4.5, 4.6_
  
  - [ ] 11.3 Implement RendererService to pass tests
    - Add svg.js or similar library dependency
    - Implement rendering methods with plugin delegation
    - Implement layered composition
    - Implement SVG generation from RenderLayer data
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 12. TDD: Tic-Tac-Toe rendering
  - [ ] 12.1 Write tests for TicTacToeEngine rendering
    - Write tests for BoardRenderData structure
    - Write tests for grid layout generation
    - Write tests for token rendering (X and O)
    - Write tests for empty spaces
    - _Requirements: 6.1, 6.2, 6.4, 4.2, 4.3, 4.4, 4.7_
  
  - [ ] 12.2 Implement TicTacToeEngine renderBoard to pass tests
    - Implement renderBoard method
    - Generate grid with borders and dividers
    - Render tokens in appropriate spaces
    - _Requirements: 4.2, 4.3, 4.4, 4.7_

- [ ] 13. TDD: Express REST API setup
  - [ ] 13.1 Write tests for Express app initialization
    - Write tests for middleware setup (JSON parser, CORS)
    - Write tests for error handling middleware
    - Write tests for GameError to HTTP response conversion
    - _Requirements: 6.1, 6.2, 6.5_
  
  - [ ] 13.2 Implement Express app to pass tests
    - Initialize Express app with middleware
    - Implement error handling middleware
    - Configure CORS
    - _Requirements: 6.5_

- [ ] 14. TDD: Game management API endpoints
  - [ ] 14.1 Write tests for game management endpoints
    - Write tests for POST /api/games (success, invalid game type)
    - Write tests for GET /api/games (filtering, pagination)
    - Write tests for GET /api/games/:gameId (found, not found)
    - Write tests for POST /api/games/:gameId/join (success, full, duplicate)
    - Write tests for DELETE /api/games/:gameId
    - Write tests for GET /api/game-types
    - _Requirements: 6.1, 6.2, 6.5, 1.1, 1.5, 1.7, 2.1, 2.2, 2.3, 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 14.2 Implement game management endpoints to pass tests
    - Implement all game management routes
    - Wire up to GameManagerService
    - Handle request validation and error responses
    - _Requirements: 1.1, 1.5, 1.7, 2.1, 2.2, 2.3, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 15. TDD: Gameplay API endpoints
  - [ ] 15.1 Write tests for gameplay endpoints
    - Write tests for GET /api/games/:gameId/state
    - Write tests for POST /api/games/:gameId/moves (valid, invalid, unauthorized, conflict)
    - Write tests for GET /api/games/:gameId/moves
    - Write tests for optimistic locking with version parameter
    - _Requirements: 6.1, 6.2, 6.5, 2.1, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 15.2 Implement gameplay endpoints to pass tests
    - Implement all gameplay routes
    - Wire up to StateManagerService
    - Handle version parameter for optimistic locking
    - _Requirements: 2.1, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 16. TDD: Rendering API endpoints
  - [ ] 16.1 Write tests for rendering endpoints
    - Write tests for GET /api/games/:gameId/board.svg
    - Write tests for proper SVG content-type headers
    - Write tests for rendering errors
    - _Requirements: 6.1, 6.2, 6.5, 4.1, 4.5, 4.6_
  
  - [ ] 16.2 Implement rendering endpoints to pass tests
    - Implement SVG rendering route
    - Wire up to RendererService
    - Set proper content-type headers
    - _Requirements: 4.1, 4.5, 4.6_

- [ ] 17. Integration testing and refactoring
  - Run full test suite and verify all tests pass
  - Refactor code for better organization and readability
  - Ensure test coverage meets goals (80%+ overall)
  - _Requirements: 6.1, 6.3_

- [ ] 18. Create test utilities and documentation
  - Implement GameStateBuilder for test data creation
  - Implement MockGameEngine for testing
  - Create test fixtures for common scenarios
  - Write README with project overview and setup instructions
  - Document plugin development guide with TicTacToe example
  - Document REST API endpoints with examples
  - _Requirements: 6.2, 6.4, 5.1_

- [ ] 19. Set up development tooling
  - Configure ESLint for code quality
  - Configure Prettier for code formatting
  - Add npm scripts for dev, test, build, lint
  - Configure Jest for coverage reporting
  - Add pre-commit hooks for linting and testing
  - _Requirements: 6.1, 6.3_
