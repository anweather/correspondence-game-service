# Implementation Plan

- [x] 1. Set up project structure and shared module
  - Create directory structure following the established pattern
  - Define TypeScript interfaces in `shared/types.ts`
  - Define constants in `shared/constants.ts` (board dimensions, colors, game metadata)
  - Create barrel export in `shared/index.ts`
  - _Requirements: 1.1, 1.2, 10.2, 10.3, 10.4, 10.5_

- [x] 2. TDD: Game metadata module
- [x] 2.1 RED: Write tests for metadata functions
  - Test `getGameType()` returns "connect-four"
  - Test `getGameName()` returns "Connect Four"
  - Test `getMinPlayers()` and `getMaxPlayers()` return 2
  - Test `getDescription()` returns non-empty string
  - _Requirements: 10.2, 10.3, 10.4, 10.5_

- [x] 2.2 GREEN: Implement metadata module
  - Create `engine/metadata.ts` with pure functions
  - Implement all metadata functions to pass tests
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2.3 REFACTOR: Clean up metadata implementation
  - Extract constants if needed
  - Ensure code is clean and maintainable

- [x] 3. TDD: Game initialization module
- [x] 3.1 RED: Write tests for board initialization
  - **Property 1: Board initialization creates correct structure**
  - **Validates: Requirements 1.1**
  - Test board has 6 rows and 7 columns
  - Test all cells are initially empty

- [x] 3.2 RED: Write tests for player color assignment
  - **Property 2: Player color assignment is deterministic**
  - **Validates: Requirements 1.2**
  - Test first player gets red, second gets yellow

- [x] 3.3 RED: Write tests for initial game state
  - **Property 3: First player starts**
  - **Validates: Requirements 1.3**
  - **Property 4: Games start in progress**
  - **Validates: Requirements 1.4**
  - Test first player is active
  - Test game status is "in_progress"
  - Test initialization with < 2 players fails
  - _Requirements: 1.3, 1.4, 1.5_

- [x] 3.4 GREEN: Implement initialization module
  - Create `engine/initialization.ts`
  - Implement `createEmptyBoard()` function
  - Implement `assignPlayerColors()` function
  - Implement `initializeGame()` function
  - All tests should pass
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3.5 REFACTOR: Clean up initialization code
  - Extract helper functions if needed
  - Ensure immutability patterns are clear

- [x] 4. TDD: Gravity mechanics module
- [x] 4.1 RED: Write tests for gravity mechanics
  - **Property 9: Gravity places discs at lowest position**
  - **Validates: Requirements 3.1**
  - Test disc lands at bottom of empty column
  - Test disc lands on top of existing discs
  - Test finding lowest empty row

- [x] 4.2 RED: Write tests for disc placement
  - **Property 10: Disc placement updates board correctly**
  - **Validates: Requirements 3.4**
  - Test board updates with correct color at correct position
  - Test other positions remain unchanged
  - _Requirements: 3.1, 3.4_

- [x] 4.3 GREEN: Implement gravity module
  - Create `engine/gravity.ts`
  - Implement `findLowestEmptyRow()` function
  - Implement `applyGravity()` function
  - All tests should pass

- [x] 4.4 REFACTOR: Optimize gravity calculations
  - Ensure efficient bottom-to-top scanning
  - Clean up edge case handling

- [x] 5. TDD: Move validation module
- [x] 5.1 RED: Write tests for turn validation
  - **Property 5: Wrong turn moves are rejected**
  - **Validates: Requirements 2.1**
  - Test moves by wrong player are rejected

- [x] 5.2 RED: Write tests for column validation
  - **Property 6: Full column moves are rejected**
  - **Validates: Requirements 2.3**
  - Test negative column numbers rejected
  - Test column >= 7 rejected
  - Test full columns rejected
  - Test valid columns accepted
  - _Requirements: 2.2, 2.3_

- [x] 5.3 RED: Write tests for validation responses
  - **Property 7: Invalid moves return descriptive errors**
  - **Validates: Requirements 2.4**
  - **Property 8: Valid moves pass validation**
  - **Validates: Requirements 2.5**
  - Test error messages are descriptive
  - Test valid moves return success
  - _Requirements: 2.4, 2.5_

- [x] 5.4 GREEN: Implement validation module
  - Create `engine/validation.ts`
  - Implement `isValidColumn()` function
  - Implement `isColumnFull()` function
  - Implement `isPlayerTurn()` function
  - Implement `validateMove()` with descriptive errors
  - All tests should pass
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5.5 REFACTOR: Improve validation error messages
  - Ensure all error messages are clear and actionable
  - Extract error message constants if needed

- [x] 6. TDD: Win detection logic
- [x] 6.1 RED: Write tests for win detection
  - **Property 11: Horizontal wins are detected**
  - **Validates: Requirements 4.1**
  - **Property 12: Vertical wins are detected**
  - **Validates: Requirements 4.2**
  - **Property 13: Ascending diagonal wins are detected**
  - **Validates: Requirements 4.3**
  - **Property 14: Descending diagonal wins are detected**
  - **Validates: Requirements 4.4**
  - Test all four win directions with various patterns
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6.2 GREEN: Implement win detection functions
  - Create `engine/rules.ts`
  - Implement `checkDirection()` helper function
  - Implement `checkWinFromPosition()` function
  - Tests should pass

- [x] 6.3 REFACTOR: Optimize win detection
  - Ensure efficient direction checking
  - Clean up pattern matching logic

- [x] 7. TDD: Game completion and draw detection
- [x] 7.1 RED: Write tests for game completion
  - **Property 15: Winning moves complete the game**
  - **Validates: Requirements 4.5**
  - **Property 16: Full board without winner is a draw**
  - **Validates: Requirements 5.2**
  - Test game completes on win with correct winner
  - Test game completes on full board with no winner
  - _Requirements: 4.5, 5.1, 5.2_

- [x] 7.2 GREEN: Implement game completion logic
  - Implement `isBoardFull()` function
  - Implement `getWinner()` function
  - Implement `isGameOver()` function
  - Tests should pass

- [x] 7.3 REFACTOR: Clean up completion logic
  - Ensure clear separation between win and draw detection

- [x] 8. TDD: Move application and turn management
- [x] 8.1 RED: Write tests for move application
  - **Property 17: Valid moves alternate turns**
  - **Validates: Requirements 6.1**
  - **Property 18: Completed games don't change turns**
  - **Validates: Requirements 6.2**
  - **Property 19: Game state indicates current turn**
  - **Validates: Requirements 6.3**
  - Test turns alternate after valid moves
  - Test completed games don't change turns
  - Test current turn is always clear
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 8.2 RED: Write tests for immutability
  - **Property 28: Move application is immutable**
  - **Validates: Requirements 9.1**
  - **Property 29: Invalid moves don't change state**
  - **Validates: Requirements 9.3**
  - Test original state unchanged after move
  - Test invalid moves don't mutate state
  - _Requirements: 9.1, 9.3_

- [x] 8.3 GREEN: Implement move application
  - Implement `applyMove()` function with immutable updates
  - Integrate gravity, win detection, turn switching
  - All tests should pass
  - _Requirements: 6.1, 6.2, 9.1, 9.3_

- [x] 8.4 REFACTOR: Optimize move application
  - Ensure clean immutable patterns
  - Optimize state copying if needed

- [ ] 9. Checkpoint - Ensure all core logic tests pass
  - Run all tests for modules 1-8
  - Verify all property tests pass with 100+ iterations
  - Ask user if questions arise

- [ ] 10. TDD: SVG rendering module
- [ ] 10.1 RED: Write tests for SVG structure
  - **Property 20: Rendering produces valid SVG structure**
  - **Validates: Requirements 7.1**
  - Test SVG has correct 7×6 grid structure
  - Test grid lines are present
  - _Requirements: 7.1, 7.5_

- [ ] 10.2 RED: Write tests for disc rendering
  - **Property 21: Empty cells render as white circles**
  - **Validates: Requirements 7.2**
  - **Property 22: Red discs render correctly**
  - **Validates: Requirements 7.3**
  - **Property 23: Yellow discs render correctly**
  - **Validates: Requirements 7.4**
  - Test empty cells render as white
  - Test red discs render at correct positions
  - Test yellow discs render at correct positions
  - _Requirements: 7.2, 7.3, 7.4_

- [ ] 10.3 RED: Write tests for win highlighting
  - **Property 24: Winning patterns are highlighted**
  - **Validates: Requirements 7.6**
  - Test winning discs are highlighted
  - _Requirements: 7.6_

- [ ] 10.4 GREEN: Implement rendering module
  - Create `engine/renderer.ts`
  - Implement `createGridLayer()` function
  - Implement `renderDisc()` helper function
  - Implement `createDiscLayer()` function
  - Implement `createWinHighlight()` function
  - Implement `renderBoard()` main function
  - All tests should pass
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 10.5 REFACTOR: Optimize SVG generation
  - Ensure efficient layering
  - Clean up SVG element creation

- [ ] 11. TDD: Main engine class integration
- [ ] 11.1 RED: Write integration tests
  - **Property 30: Game state is complete**
  - **Validates: Requirements 9.4**
  - Test complete game flow: init → moves → win
  - Test complete game flow: init → moves → draw
  - Test invalid move handling throughout
  - Test state completeness at each step
  - _Requirements: 9.4, All_

- [ ] 11.2 GREEN: Implement main engine class
  - Create `engine/ConnectFourEngine.ts`
  - Extend `BaseGameEngine` abstract class
  - Implement all interface methods by delegating to modules
  - Wire together all modules
  - All integration tests should pass
  - _Requirements: 10.1_

- [ ] 11.3 REFACTOR: Clean up engine orchestration
  - Ensure clean delegation patterns
  - Optimize module interactions

- [ ] 12. Checkpoint - Ensure all backend tests pass
  - Run complete backend test suite
  - Verify all property tests pass with 100+ iterations
  - Ask user if questions arise

- [ ] 13. TDD: UI move input component
- [ ] 13.1 RED: Write tests for UI structure
  - Test 7 column buttons are rendered
  - Test buttons have correct labels/indices
  - _Requirements: 8.1_

- [ ] 13.2 RED: Write tests for UI button states
  - **Property 25: Full columns disable UI buttons**
  - **Validates: Requirements 8.2**
  - **Property 26: UI disables buttons when not player's turn**
  - **Validates: Requirements 8.3**
  - Test full columns disable buttons
  - Test buttons disabled when not player's turn
  - _Requirements: 8.2, 8.3_

- [ ] 13.3 RED: Write tests for UI interactions
  - **Property 27: UI submits correct column on click**
  - **Validates: Requirements 8.4**
  - Test clicking button submits correct column
  - Test hover effects are present
  - _Requirements: 8.4, 8.5_

- [ ] 13.4 GREEN: Implement UI component
  - Create `ui/components/ConnectFourMoveInput.tsx`
  - Create `ui/components/ConnectFourMoveInput.module.css`
  - Render 7 column buttons
  - Implement click handlers
  - Implement disabled state logic
  - Add hover effects
  - All UI tests should pass
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 13.5 REFACTOR: Improve UI component
  - Extract button component if needed
  - Optimize re-renders
  - Improve accessibility

- [ ] 14. Create documentation
  - Create `games/connect-four/README.md` following Tic-Tac-Toe pattern
  - Create `games/connect-four/docs/rules.md` with detailed game rules
  - Create `games/connect-four/docs/gameplay.md` with API examples
  - Document move format and coordinate system
  - _Requirements: All_

- [ ] 15. Register plugin with game service
  - Import ConnectFourEngine in plugin registry
  - Register the engine with game type "connect-four"
  - Update any game type lists or documentation
  - _Requirements: 10.1, 10.2_

- [ ] 16. Final checkpoint - Full system test
  - Run complete test suite (backend + frontend)
  - Verify integration with existing game service
  - Test through REST API endpoints
  - Create a test game and play through to completion
  - Ask user if questions arise
