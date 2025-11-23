# Implementation Plan

- [x] 1. Set up workspace structure and configuration
  - Create `games/tic-tac-toe/` directory structure with subdirectories for shared, engine, and ui modules
  - Create package.json for tic-tac-toe game with proper exports configuration
  - Update root package.json to include workspaces configuration
  - Update root tsconfig.json with path aliases for game imports
  - Update web-client bundler configuration (vite.config.ts) to resolve game modules
  - Update Jest configuration to handle game module imports in tests
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 2. Create shared module with types and constants
  - Create `games/tic-tac-toe/shared/types.ts` with TicTacToeMove and TicTacToeMetadata interfaces
  - Create `games/tic-tac-toe/shared/constants.ts` with game constants (BOARD_SIZE, WIN_PATTERNS, etc.)
  - Create `games/tic-tac-toe/shared/index.ts` barrel export
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Create engine metadata module (extract from existing code)
  - Create `games/tic-tac-toe/engine/metadata.ts` with game metadata functions
  - **Copy and move** getGameType, getMinPlayers, getMaxPlayers, getDescription methods from existing TicTacToeEngine class
  - Add getGameName function for human-readable name
  - _Requirements: 3.1, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Create engine initialization module (extract from existing code)
  - Create `games/tic-tac-toe/engine/initialization.ts` with initialization logic
  - **Copy and move** initializeGame method logic from existing TicTacToeEngine class
  - Extract board creation logic into helper function createEmptyBoard
  - Update to use shared constants for board size
  - _Requirements: 3.2, 5.1, 5.2, 5.3, 5.4_

- [x] 5. Create engine validation module (extract from existing code)
  - Create `games/tic-tac-toe/engine/validation.ts` with validation logic
  - **Copy and move** validateMove method logic from existing TicTacToeEngine class
  - Extract inline validation checks into helper functions: isValidPosition, isSpaceOccupied, isPlayerTurn
  - Ensure validation functions are pure (no state mutation)
  - _Requirements: 3.3, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Create engine rules module (extract from existing code)
  - Create `games/tic-tac-toe/engine/rules.ts` with game rules logic
  - **Copy and move** applyMove, isGameOver, getWinner methods from existing TicTacToeEngine class
  - Extract win detection logic into helper functions: checkWinPattern, isBoardFull
  - Use shared WIN_PATTERNS constant for win detection
  - Ensure immutable state transitions are preserved
  - _Requirements: 3.4, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 7. Create engine renderer module (extract from existing code)
  - Create `games/tic-tac-toe/engine/renderer.ts` with rendering logic
  - **Copy and move** renderBoard method logic from existing TicTacToeEngine class
  - Extract rendering logic into helper functions: createGridLayer, createTokenLayer, renderXToken, renderOToken
  - _Requirements: 3.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 8. Update TicTacToeEngine class to use modules
  - Create `games/tic-tac-toe/engine/TicTacToeEngine.ts` that extends BaseGameEngine
  - Import all module functions
  - Implement interface methods by delegating to module functions
  - Maintain backward compatibility with existing API
  - Create `games/tic-tac-toe/engine/index.ts` barrel export
  - _Requirements: 3.6, 3.7, 16.1, 16.2_


- [ ] 9. Move UI move input component (reuse existing code)
  - Create `games/tic-tac-toe/ui/components/` directory
  - **Copy** existing `web-client/src/components/games/tic-tac-toe/TicTacToeMoveInput.tsx` to new location
  - Update imports to use shared types from `@games/tic-tac-toe/shared`
  - **Copy** existing `TicTacToeMoveInput.module.css` to new location
  - Create `games/tic-tac-toe/ui/index.ts` barrel export
  - _Requirements: 9.1, 9.2, 9.4, 9.5, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 10. Create game documentation
  - Create `games/tic-tac-toe/docs/` directory
  - Create `games/tic-tac-toe/docs/rules.md` with detailed game rules
  - Create `games/tic-tac-toe/docs/gameplay.md` with gameplay instructions and examples
  - Document move format, valid parameters, and win conditions
  - _Requirements: 15.6, 15.7, 15.8_

- [ ] 11. Update plugin registry imports
  - Update `src/application/PluginRegistry.ts` to import from `@games/tic-tac-toe/engine`
  - Update `src/index.ts` or plugin initialization to use new import path
  - Verify engine is properly registered and discoverable
  - _Requirements: 13.1, 13.3, 13.4_

- [ ] 12. Update UI component registry imports
  - Update `web-client/src/components/games/index.ts` to import from `@games/tic-tac-toe/ui`
  - Update component registration to use new UI components
  - Verify components are properly registered
  - _Requirements: 13.2, 13.3, 13.4_

- [ ] 13. Migrate and update engine tests (reuse existing tests)
  - Create `games/tic-tac-toe/engine/__tests__/` directory
  - **Copy** existing `tests/unit/adapters/plugins/TicTacToeEngine.test.ts` to new location
  - Optionally split monolithic test into module-specific test files (metadata.test.ts, initialization.test.ts, etc.) for better organization
  - Update imports to use new module paths (`@games/tic-tac-toe/engine`)
  - Add tests for any new helper functions if needed
  - Verify all existing tests pass without modification to test logic
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 14. Migrate and update UI component tests (reuse existing tests)
  - Create `games/tic-tac-toe/ui/__tests__/` directory
  - **Copy** existing TicTacToeMoveInput.test.tsx to new location
  - Update imports to use new module paths (`@games/tic-tac-toe/ui`, `@games/tic-tac-toe/shared`)
  - Verify all existing tests pass without modification to test logic
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 15. Create game package documentation
  - Create `games/tic-tac-toe/README.md` with comprehensive documentation
  - Document package structure and module organization
  - Explain purpose of each module (shared, engine, ui)
  - Provide examples of importing and using the game
  - Document game rules and gameplay instructions
  - Document move format and valid move parameters
  - Explain win conditions and game completion criteria
  - Explain how structure prepares for future npm extraction
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8_

- [ ] 16. Clean up old implementation
  - Remove `src/adapters/plugins/tic-tac-toe/TicTacToeEngine.ts`
  - Remove `tests/unit/adapters/plugins/TicTacToeEngine.test.ts`
  - Remove old `web-client/src/components/games/tic-tac-toe/` directory if it exists
  - Search codebase for any remaining imports from old paths
  - Update any remaining references to use new paths
  - _Requirements: 16.3, 16.4_

- [ ] 17. Verify integration and run full test suite
  - Run full backend test suite and verify all tests pass
  - Run full frontend test suite and verify all tests pass
  - Start backend server and verify it starts without errors
  - Start frontend dev server and verify it starts without errors
  - Create a tic-tac-toe game via API and verify it works
  - Make moves via API and verify they work
  - View game in UI and verify it displays correctly
  - Complete a full game and verify win detection works
  - _Requirements: 16.5, 13.4_
