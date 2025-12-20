# Implementation Plan

- [x] 1. Define AI domain interfaces and models (Ports)
  - Create AIPlayer domain model in `src/domain/models/AIPlayer.ts`
  - Create AIStrategy interface in `src/domain/interfaces/IAIStrategy.ts`
  - Create AICapableGamePlugin interface extending GameEnginePlugin
  - Create AI-specific error classes in `src/domain/errors/index.ts`
  - _Requirements: 1.3, 3.1, 3.2_

- [x] 1.1 Write property test for AIPlayer model
  - **Property 1: AI Player Unique Identification**
  - **Validates: Requirements 1.3, 4.1**

- [x] 2. Create AI player repository interface and in-memory implementation
  - Define IAIPlayerRepository interface in `src/domain/interfaces/IAIPlayerRepository.ts`
  - Implement InMemoryAIPlayerRepository in `src/infrastructure/persistence/InMemoryAIPlayerRepository.ts`
  - _Requirements: 4.5_

- [x] 2.1 Write property test for AI player persistence
  - **Property 7: AI Player Persistence**
  - **Validates: Requirements 4.5**

- [x] 3. Implement AIPlayerService (Application Layer)
- [x] 3.1 Create AIPlayerService class structure
  - Create `src/application/services/AIPlayerService.ts`
  - Implement createAIPlayers method
  - Implement isAIPlayer method
  - Implement getAvailableStrategies method
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 3.2 Write unit tests for AIPlayerService basic operations
  - Test AI player creation
  - Test AI player identification
  - Test strategy retrieval
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 3.3 Implement processAITurn method with error handling
  - Add processAITurn method to AIPlayerService
  - Implement timeout handling with 1-second default
  - Implement retry logic for invalid moves (up to 3 attempts)
  - Implement retry logic for failures (1 retry)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1, 7.2, 7.3_

- [x] 3.4 Write property test for AI move validation consistency
  - **Property 2: AI Move Validation Consistency**
  - **Validates: Requirements 2.2**

- [x] 3.5 Write property test for AI move generation interface compliance
  - **Property 5: AI Move Generation Interface Compliance**
  - **Validates: Requirements 3.2, 3.4**

- [x] 3.6 Write unit tests for AI error handling
  - Test timeout handling and retry
  - Test invalid move retry logic
  - Test failure recovery
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 4. Extend StateManagerService for AI turn detection
- [x] 4.1 Add AI turn processing to StateManagerService
  - Inject AIPlayerService into StateManagerService
  - Add processAITurnsIfNeeded private method
  - Modify applyMove to trigger AI turns after human moves
  - Handle consecutive AI turns until human player or game end
  - _Requirements: 2.1, 2.5_

- [x] 4.2 Write property test for automatic AI turn processing
  - **Property 3: Automatic AI Turn Processing**
  - **Validates: Requirements 2.1, 2.5**

- [x] 4.3 Write unit tests for AI turn detection and processing
  - Test AI turn detection after human move
  - Test consecutive AI turns
  - Test stopping at human player turn
  - Test stopping at game end
  - _Requirements: 2.1, 2.5_

- [x] 5. Extend GameManagerService for AI player support
- [x] 5.1 Update createGame to support AI players
  - Modify createGame method to accept AI player configurations
  - Integrate with AIPlayerService to create AI players
  - Convert AI players to Player objects for game initialization
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 5.2 Write unit tests for game creation with AI players
  - Test creating games with AI players
  - Test AI player count validation
  - Test AI player initialization with default strategies
  - Test difficulty level selection
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6. Implement fallback random AI strategy
- [x] 6.1 Create RandomAIStrategy class
  - Create `src/application/ai/RandomAIStrategy.ts`
  - Implement AIStrategy interface
  - Generate random valid moves from available moves
  - _Requirements: 3.5_

- [x] 6.2 Write property test for AI strategy availability
  - **Property 4: AI Strategy Availability**
  - **Validates: Requirements 3.1, 3.5**

- [x] 6.3 Write unit tests for RandomAIStrategy
  - Test random move generation
  - Test move validity
  - Test handling empty move lists
  - _Requirements: 3.5_

- [x] 7. Implement Tic-Tac-Toe AI strategies
- [x] 7.1 Create TicTacToeAI module structure
  - Create `games/tic-tac-toe/ai/` directory
  - Create `games/tic-tac-toe/ai/index.ts`
  - Create strategy interface implementations
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 7.2 Implement perfect-play AI strategy for Tic-Tac-Toe
  - Create `games/tic-tac-toe/ai/PerfectPlayStrategy.ts`
  - Implement minimax algorithm or rule-based perfect play
  - Prioritize: immediate wins > block opponent wins > center > corners > edges
  - _Requirements: 6.1, 6.2_

- [x] 7.3 Write property test for Tic-Tac-Toe AI optimality
  - **Property 9: Tic-Tac-Toe AI Optimality**
  - **Validates: Requirements 6.2**

- [x] 7.4 Write property test for Tic-Tac-Toe AI performance
  - **Property 10: AI Performance Requirements**
  - **Validates: Requirements 6.4**

- [x] 7.5 Implement easy AI strategy for Tic-Tac-Toe
  - Create `games/tic-tac-toe/ai/EasyStrategy.ts`
  - Implement random valid move selection
  - _Requirements: 6.3_

- [x] 7.6 Write unit tests for Tic-Tac-Toe AI strategies
  - Test perfect-play strategy move selection
  - Test easy strategy randomness
  - Test edge cases (nearly full boards, immediate wins/blocks)
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 7.7 Extend TicTacToeEngine with AI support
  - Implement AICapableGamePlugin interface
  - Add getAIStrategies method
  - Add getDefaultAIStrategy method
  - Add createAIPlayer method
  - Register AI strategies
  - _Requirements: 3.1, 6.1, 6.3_

- [x] 7.8 Write unit tests for TicTacToeEngine AI integration
  - Test AI strategy registration
  - Test default strategy retrieval
  - Test AI player creation
  - _Requirements: 3.1, 6.1_

- [-] 8. Update REST API for AI player support
(Make sure this is backward compatible with the existing REST API we have for the frontend client.)
- [x] 8.1 Extend game creation endpoint
  - Update POST /games endpoint to accept AI player configurations
  - Add validation for AI player parameters
  - Update request/response types
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 8.2 Write integration tests for AI game creation API
  - Test creating games with AI players via API
  - Test AI player configuration validation
  - Test API response structure
  - _Requirements: 1.1, 1.2, 5.1, 5.4_

- [x] 8.3 Update game state retrieval endpoints
  - Ensure GET /games/:id includes AI player metadata
  - Ensure GET /games includes AI game indicators
  - Update response types to include AI information
  - _Requirements: 4.1, 4.4, 5.4_

- [x] 8.4 Write property test for game state structure consistency
  - **Property 6: Game State Structure Consistency**
  - **Validates: Requirements 4.2, 5.1**

- [x] 8.5 Write property test for move history consistency
  - **Property 8: Move History Consistency**
  - **Validates: Requirements 5.2, 5.5**

- [x] 8.6 Write integration tests for AI game state retrieval
  - Test retrieving games with AI players
  - Test AI player identification in responses
  - Test move history includes AI moves
  - _Requirements: 4.1, 4.4, 5.2, 5.4_

- [ ] 9. Add AI error logging and monitoring
- [ ] 9.1 Implement comprehensive AI error logging
  - Add structured logging for AI move generation
  - Include game state context in error logs
  - Include AI configuration in error logs
  - Add performance metrics logging
  - _Requirements: 7.4, 7.5_

- [ ] 9.2 Write property test for AI error logging context
  - **Property 11: AI Error Logging Context**
  - **Validates: Requirements 7.5**

- [ ] 9.3 Write unit tests for AI error logging
  - Test error log structure
  - Test context inclusion
  - Test performance metric logging
  - _Requirements: 7.4, 7.5_

- [ ] 10. Update WebSocket notifications for AI moves
   (Make sure that we have websockets integrated at the engine level, and not the player vs AI move level. Integrate once. a Move is just a move.)
- [ ] 10.1 Extend WebSocket events for AI moves
  - Ensure AI moves trigger same WebSocket events as human moves
  - Add AI player type information to event payloads
  - Test event format consistency
  - _Requirements: 5.5_

- [ ] 10.2 Write integration tests for AI move notifications
  - Test WebSocket events for AI moves
  - Test event format consistency
  - Test AI failure notifications
  - _Requirements: 5.5, 7.4_

- [ ] 11. Add statistics tracking for AI games
- [ ] 11.1 Update StatsService for AI player support
  - Ensure AI player results are recorded in statistics ( we don't need the AI player in the stats view. These are just bots. Games with AI players should be in stas for the players that participated.)
  - Add AI game indicators to leaderboards
  - Update stats queries to handle AI players
  - _Requirements: 4.3_

- [ ] 11.2 Write integration tests for AI game statistics
  - Test AI game completion recording
  - Test AI player results in leaderboards
  - Test stats queries with AI games
  - _Requirements: 4.3_

- [ ] 12. Create end-to-end tests for AI gameplay
- [ ] 12.1 Write E2E test for complete AI game flow
  - Test creating game with AI player
  - Test human vs AI gameplay
  - Test AI vs AI gameplay
  - Test game completion with AI players
  - _Requirements: All_

- [ ] 13. Update documentation
- [ ] 13.1 Update API documentation
  - Document AI player creation parameters
  - Document AI-related response fields
  - Add examples for AI game creation
  - _Requirements: All_

- [ ] 13.2 Create AI plugin development guide
  - Document how to implement AI strategies for new games
  - Provide examples and best practices
  - Document performance requirements
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Future Enhancements (Not in Current Scope)

- [ ] PostgreSQL AI Player Repository Implementation
  - Create `PostgresAIPlayerRepository` in `src/infrastructure/persistence/PostgresAIPlayerRepository.ts`
  - Add database migration for AI players table
  - Implement all IAIPlayerRepository methods with SQL queries
  - Add integration tests for PostgreSQL implementation
  - Update dependency injection to use PostgreSQL repository in production
  - _Note: Currently using in-memory implementation for development and testing_