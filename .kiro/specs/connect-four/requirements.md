# Requirements Document

## Introduction

Connect Four is a classic two-player connection game in which players take turns dropping colored discs into a vertical grid. The objective is to be the first to form a horizontal, vertical, or diagonal line of four of one's own discs. This implementation will serve as a game plugin for the Async Boardgame Service, following the established plugin architecture pattern demonstrated by Tic-Tac-Toe.

## Glossary

- **Game_Engine**: The backend system that manages game state, validates moves, and enforces rules
- **Board**: A 7-column by 6-row vertical grid where discs are placed
- **Disc**: A colored token representing a player's piece (Red or Yellow)
- **Column**: A vertical stack of cells where discs can be dropped
- **Gravity_Mechanic**: The rule that discs fall to the lowest available position in a column
- **Win_Pattern**: Four consecutive discs of the same color in any direction (horizontal, vertical, or diagonal)
- **UI_Component**: The React-based frontend interface for player interaction
- **Move_Input**: The player's selection of which column to drop their disc into

## Requirements

### Requirement 1: Game Initialization

**User Story:** As a game service, I want to initialize a Connect Four game with two players, so that a new game can begin with a clean board state.

#### Acceptance Criteria

1. WHEN the Game_Engine receives a request to initialize a Connect Four game THEN the Game_Engine SHALL create a 7-column by 6-row empty Board
2. WHEN initializing a game THEN the Game_Engine SHALL assign the first player as Red and the second player as Yellow
3. WHEN initializing a game THEN the Game_Engine SHALL set the first player (Red) as the active player
4. WHEN initializing a game THEN the Game_Engine SHALL set the game status to "in_progress"
5. WHEN initializing a game with fewer than 2 players THEN the Game_Engine SHALL reject the initialization

### Requirement 2: Move Validation

**User Story:** As a game engine, I want to validate player moves before applying them, so that only legal moves are accepted.

#### Acceptance Criteria

1. WHEN a player attempts to drop a disc THEN the Game_Engine SHALL verify it is that player's turn
2. WHEN a player selects a column THEN the Game_Engine SHALL verify the column number is between 0 and 6 inclusive
3. WHEN a player selects a column THEN the Game_Engine SHALL verify the column is not completely filled
4. WHEN a move fails validation THEN the Game_Engine SHALL return a validation error with a descriptive message
5. WHEN a move passes all validation checks THEN the Game_Engine SHALL return a success indicator

### Requirement 3: Gravity Mechanics

**User Story:** As a game engine, I want to apply gravity to dropped discs, so that pieces fall to the lowest available position in the selected column.

#### Acceptance Criteria

1. WHEN a player drops a disc into a column THEN the Game_Engine SHALL place the disc in the lowest empty row of that column
2. WHEN a column has existing discs THEN the Game_Engine SHALL place the new disc directly above the topmost existing disc
3. WHEN calculating disc position THEN the Game_Engine SHALL scan from bottom to top to find the first empty cell
4. WHEN a disc is placed THEN the Game_Engine SHALL update the Board state with the player's color at the calculated position

### Requirement 4: Win Detection

**User Story:** As a game engine, I want to detect when a player has won, so that the game can end and declare a winner.

#### Acceptance Criteria

1. WHEN a disc is placed THEN the Game_Engine SHALL check for four consecutive discs horizontally
2. WHEN a disc is placed THEN the Game_Engine SHALL check for four consecutive discs vertically
3. WHEN a disc is placed THEN the Game_Engine SHALL check for four consecutive discs diagonally (ascending)
4. WHEN a disc is placed THEN the Game_Engine SHALL check for four consecutive discs diagonally (descending)
5. WHEN four consecutive discs of the same color are detected THEN the Game_Engine SHALL set the game status to "completed" and record the winner
6. WHEN checking for wins THEN the Game_Engine SHALL only check patterns that include the most recently placed disc

### Requirement 5: Draw Detection

**User Story:** As a game engine, I want to detect when the game ends in a draw, so that games without a winner can be properly concluded.

#### Acceptance Criteria

1. WHEN all 42 cells on the Board are filled THEN the Game_Engine SHALL check if there is a winner
2. WHEN the Board is full and no winner exists THEN the Game_Engine SHALL set the game status to "completed" with no winner
3. WHEN the Board is full and a winner exists THEN the Game_Engine SHALL set the game status to "completed" with the winner recorded

### Requirement 6: Turn Management

**User Story:** As a game engine, I want to alternate turns between players, so that each player gets a fair opportunity to play.

#### Acceptance Criteria

1. WHEN a valid move is applied THEN the Game_Engine SHALL switch the active player to the other player
2. WHEN the game is completed THEN the Game_Engine SHALL not change the active player
3. WHEN querying game state THEN the Game_Engine SHALL indicate which player's turn it is

### Requirement 7: Board Rendering

**User Story:** As a game service, I want to render the game board as SVG, so that clients can display the current game state visually.

#### Acceptance Criteria

1. WHEN rendering the Board THEN the Game_Engine SHALL generate an SVG representation of the 7×6 grid
2. WHEN rendering the Board THEN the Game_Engine SHALL display empty cells as white circles
3. WHEN rendering the Board THEN the Game_Engine SHALL display Red player discs as red circles
4. WHEN rendering the Board THEN the Game_Engine SHALL display Yellow player discs as yellow circles
5. WHEN rendering the Board THEN the Game_Engine SHALL include grid lines to separate columns and rows
6. WHEN rendering a completed game with a winner THEN the Game_Engine SHALL highlight the winning four discs

### Requirement 8: Move Input Interface

**User Story:** As a player, I want an intuitive interface to select which column to drop my disc into, so that I can easily make my move.

#### Acceptance Criteria

1. WHEN the UI_Component is displayed THEN the UI_Component SHALL show seven clickable column buttons
2. WHEN a column is full THEN the UI_Component SHALL disable that column's button
3. WHEN it is not the player's turn THEN the UI_Component SHALL disable all column buttons
4. WHEN a player clicks a column button THEN the UI_Component SHALL submit a move with the selected column number
5. WHEN a player hovers over a column button THEN the UI_Component SHALL provide visual feedback

### Requirement 9: Game State Consistency

**User Story:** As a game engine, I want to maintain immutable game state, so that state transitions are predictable and testable.

#### Acceptance Criteria

1. WHEN applying a move THEN the Game_Engine SHALL create a new game state object
2. WHEN applying a move THEN the Game_Engine SHALL not modify the original game state object
3. WHEN a move is invalid THEN the Game_Engine SHALL return the original game state unchanged
4. WHEN querying game state THEN the Game_Engine SHALL return a complete snapshot of the current state

### Requirement 10: Plugin Integration

**User Story:** As a game service, I want Connect Four to integrate seamlessly with the existing plugin system, so that it can be used alongside other games.

#### Acceptance Criteria

1. WHEN the Game_Engine is instantiated THEN the Game_Engine SHALL implement the BaseGameEngine interface
2. WHEN queried for metadata THEN the Game_Engine SHALL return game type as "connect-four"
3. WHEN queried for metadata THEN the Game_Engine SHALL return minimum players as 2
4. WHEN queried for metadata THEN the Game_Engine SHALL return maximum players as 2
5. WHEN queried for metadata THEN the Game_Engine SHALL return a human-readable game name and description
