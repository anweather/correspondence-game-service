# Yahtzee Plugin Implementation Plan

## Overview

This implementation plan converts the Yahtzee plugin design into a series of TDD-focused coding tasks. Each task follows the Red-Green-Refactor cycle, building incrementally toward a complete Yahtzee game plugin that integrates with the existing boardgame service architecture.

## Implementation Tasks

- [x] 1. Set up Yahtzee plugin project structure and core interfaces
  - Create directory structure for Yahtzee plugin following existing game patterns
  - Define Yahtzee-specific types and constants
  - Set up basic plugin registration structure
  - _Requirements: 6.1, 6.4_

- [ ] 2. Implement core DiceEngine utility in domain layer
  - [ ] 2.1 Write unit tests for DiceEngine class
    - Write failing tests for seeded random generation
    - Write failing tests for N dice with M sides interface
    - Write failing tests for stateless behavior
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 2.2 Create DiceEngine class with seeded random generation
    - Implement DiceEngine class in `src/domain/game-utils/DiceEngine.ts`
    - Make unit tests pass with minimal implementation
    - Refactor for clean, reusable design
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 2.3 Write property test for DiceEngine deterministic behavior
    - **Property 5: Dice engine deterministic behavior**
    - **Validates: Requirements 5.1, 5.2, 5.4**

- [ ] 3. Implement Yahtzee metadata and constants
  - [ ] 3.1 Write unit tests for metadata module
    - Write failing tests for game type identification
    - Write failing tests for player limit validation
    - Write failing tests for game description
    - _Requirements: 6.1_

  - [ ] 3.2 Create metadata module with game information
    - Implement metadata functions to make tests pass
    - Define Yahtzee constants (categories, scoring values, game limits)
    - Refactor for clarity and maintainability
    - _Requirements: 6.1_

- [ ] 4. Implement Yahtzee scoring calculations
  - [ ] 4.1 Write unit tests for scoring module
    - Write failing tests for each of the 13 category calculations
    - Write failing tests for upper section bonus logic
    - Write failing tests for edge cases and invalid combinations
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 3.2, 3.3_

  - [ ] 4.2 Create scoring module with all category calculations
    - Implement scoring functions to make unit tests pass
    - Include upper section bonus calculation logic
    - Refactor for clean, maintainable scoring logic
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 3.2, 3.3_

  - [ ] 4.3 Write property test for upper section scoring and bonus
    - **Property 7: Upper section scoring and bonus calculation**
    - **Validates: Requirements 3.2, 3.3, 7.1**

  - [ ] 4.4 Write property test for lower section scoring accuracy
    - **Property 8: Lower section scoring accuracy**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8**

- [ ] 5. Implement game initialization and scorecard management
  - [ ] 5.1 Write unit tests for initialization module
    - Write failing tests for game state creation with multiple players
    - Write failing tests for scorecard initialization
    - Write failing tests for turn order establishment
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 5.2 Create initialization module with game state setup
    - Implement initialization functions to make tests pass
    - Initialize game state with empty scorecards for all players
    - Set up initial dice state and turn management using DiceEngine
    - Refactor for clean initialization logic
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 5.3 Write property test for game initialization completeness
    - **Property 1: Game initialization completeness**
    - **Validates: Requirements 1.2, 1.3**

- [ ] 6. Implement move validation logic
  - [ ] 6.1 Write unit tests for validation module
    - Write failing tests for dice roll move validation
    - Write failing tests for scoring move validation
    - Write failing tests for turn order validation
    - Write failing tests for ValidationResult object structure
    - _Requirements: 2.2, 2.4, 3.4, 6.2_

  - [ ] 6.2 Create validation module for dice and scoring moves
    - Implement validation functions to make tests pass
    - Validate dice roll moves (re-roll selections, roll limits)
    - Validate scoring moves (category availability, turn order)
    - Return proper ValidationResult objects
    - Refactor for clean validation logic
    - _Requirements: 2.2, 2.4, 3.4, 6.2_

  - [ ] 6.3 Write property test for category usage uniqueness
    - **Property 3: Category usage uniqueness**
    - **Validates: Requirements 3.4**

  - [ ] 6.4 Write property test for API compatibility
    - **Property 10: API compatibility**
    - **Validates: Requirements 6.2, 6.3**

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement game rules and state transitions
  - [ ] 8.1 Write unit tests for rules module
    - Write failing tests for dice roll move application
    - Write failing tests for scoring move application
    - Write failing tests for turn advancement logic
    - Write failing tests for game completion detection
    - _Requirements: 2.1, 2.3, 3.1, 3.5, 1.5_

  - [ ] 8.2 Create rules module for move application
    - Implement rules functions to make tests pass
    - Apply dice roll moves with selective re-rolling using DiceEngine
    - Apply scoring moves with scorecard updates and turn advancement
    - Handle game completion detection and winner determination
    - Refactor for clean rules logic
    - _Requirements: 2.1, 2.3, 3.1, 3.5, 1.5_

  - [ ] 8.3 Write property test for turn management consistency
    - **Property 2: Turn management consistency**
    - **Validates: Requirements 1.4, 2.4, 3.5**

  - [ ] 8.4 Write property test for dice keep selection preservation
    - **Property 6: Dice keep selection preservation**
    - **Validates: Requirements 2.2, 2.3**

  - [ ] 8.5 Write property test for game completion detection
    - **Property 4: Game completion detection**
    - **Validates: Requirements 1.5**

- [ ] 9. Implement SVG rendering system
  - [ ] 9.1 Write unit tests for renderer module
    - Write failing tests for dice rendering with keep indicators
    - Write failing tests for scorecard rendering
    - Write failing tests for current player indication
    - Write failing tests for SVG structure and completeness
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 9.2 Create renderer module for game state visualization
    - Implement rendering functions to make tests pass
    - Render dice with visual keep indicators
    - Display scorecards for all players with current player indication
    - Show game phase information and available actions
    - Generate complete SVG representation of game state
    - Refactor for clean rendering logic
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 9.3 Write property test for rendering completeness
    - **Property 9: Rendering completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ] 10. Implement main YahtzeeEngine facade
  - [ ] 10.1 Write unit tests for YahtzeeEngine class
    - Write failing tests for BaseGameEngine method implementations
    - Write failing tests for module delegation and coordination
    - Write failing tests for game lifecycle management
    - _Requirements: 6.1, 6.3, 6.5_

  - [ ] 10.2 Create YahtzeeEngine class extending BaseGameEngine
    - Implement YahtzeeEngine to make tests pass
    - Implement all required GameEnginePlugin methods
    - Delegate to specialized modules for functionality
    - Handle game lifecycle and coordination between modules
    - Refactor for clean facade pattern
    - _Requirements: 6.1, 6.3, 6.5_

  - [ ] 10.3 Write integration tests for YahtzeeEngine
    - Test full game flow from creation to completion
    - Test multi-player turn management
    - _Requirements: 6.1, 6.3, 6.5_

- [ ] 11. Register plugin with service architecture
  - [ ] 11.1 Write unit tests for plugin registration
    - Write failing tests for PluginRegistry integration
    - Write failing tests for plugin discovery
    - Write failing tests for game creation through registry
    - _Requirements: 6.4, 6.5_

  - [ ] 11.2 Integrate YahtzeeEngine with PluginRegistry
    - Implement registration code to make tests pass
    - Register Yahtzee plugin with existing service infrastructure
    - Ensure compatibility with REST API endpoints
    - Test plugin discovery and game creation
    - Refactor for clean integration
    - _Requirements: 6.4, 6.5_

  - [ ] 11.3 Write end-to-end tests for API integration
    - Test game creation, move submission, and state retrieval via REST API
    - Test error handling and validation through API layer
    - _Requirements: 6.5_

- [ ] 12. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Testing Notes

- Follow strict TDD Red-Green-Refactor cycle: Write failing tests first, implement minimal code to pass, then refactor
- All property-based tests use fast-check library with minimum 100 iterations
- Each property test is tagged with the format: `**Feature: yahtzee-plugin, Property {number}: {property_text}**`
- Unit tests focus on specific examples, edge cases, and individual function behavior
- Integration tests verify module interactions and API compatibility
- Run full test suite before each commit to ensure no regressions