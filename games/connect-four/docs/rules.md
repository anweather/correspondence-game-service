# Connect Four Game Rules

## Overview

Connect Four is a classic two-player connection game played on a vertical 7×6 grid. Players take turns dropping colored discs into columns, with gravity pulling each disc to the lowest available position. The objective is to be the first to form a line of four consecutive discs horizontally, vertically, or diagonally.

## Game Setup

- **Players**: Exactly 2 players
- **Board**: 7 columns × 6 rows vertical grid (42 spaces total)
- **Discs**: 
  - Player 1: Red discs
  - Player 2: Yellow discs
- **Starting Position**: Empty board with all spaces available
- **Gravity**: Discs automatically fall to the lowest empty position in the selected column

## Objective

Be the first player to connect four of your colored discs in a horizontal, vertical, or diagonal line.

## Board Layout

The board is oriented vertically with columns and rows:

```
Column:  0   1   2   3   4   5   6
Row 0:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]  ← Top
Row 1:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 2:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 3:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 4:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 5:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]  ← Bottom (gravity)
```

- **Columns**: Numbered 0-6 from left to right
- **Rows**: Numbered 0-5 from top to bottom
- **Gravity**: Discs fall downward (toward row 5)

## Win Conditions

A player wins by achieving four consecutive discs of their color in any of the following patterns:

### Horizontal Wins
Four consecutive discs in the same row across any columns.

**Examples**:
- Row 5, columns 0-3: (5,0), (5,1), (5,2), (5,3)
- Row 3, columns 2-5: (3,2), (3,3), (3,4), (3,5)
- Any row with four consecutive discs

### Vertical Wins
Four consecutive discs in the same column across any rows.

**Examples**:
- Column 3, rows 2-5: (2,3), (3,3), (4,3), (5,3)
- Column 0, rows 0-3: (0,0), (1,0), (2,0), (3,0)
- Any column with four consecutive discs

### Diagonal Wins (Ascending)
Four consecutive discs in a diagonal line from bottom-left to top-right.

**Examples**:
- (5,0), (4,1), (3,2), (2,3)
- (5,3), (4,4), (3,5), (2,6)
- (3,1), (2,2), (1,3), (0,4)

### Diagonal Wins (Descending)
Four consecutive discs in a diagonal line from top-left to bottom-right.

**Examples**:
- (0,0), (1,1), (2,2), (3,3)
- (2,3), (3,4), (4,5), (5,6)
- (1,1), (2,2), (3,3), (4,4)

## Draw Condition

The game ends in a draw (tie) when:
- All 42 spaces on the board are completely filled
- Neither player has achieved four consecutive discs in any direction

## Turn Order

1. Player 1 (Red) always moves first
2. Players alternate turns throughout the game
3. Each turn consists of dropping one disc into a selected column
4. The disc automatically falls to the lowest empty row in that column
5. Once a disc is placed, it cannot be moved or removed
6. The game continues until a win condition or draw condition is met

## Valid Moves

A move is considered valid if and only if:
1. It is the player's turn
2. The selected column number is between 0 and 6 (inclusive)
3. The selected column is not completely full (has at least one empty space)

## Invalid Moves

A move is invalid and will be rejected if:
1. It is not the player's turn
2. The column number is outside the valid range (less than 0 or greater than 6)
3. The selected column is completely full (all 6 rows occupied)
4. The game has already ended (win or draw)

## Gravity Mechanics

Connect Four features automatic gravity mechanics:

1. **Player Selection**: Player selects only the column (0-6)
2. **Automatic Placement**: The game engine automatically determines the row
3. **Lowest Position**: Disc falls to the lowest empty row in the selected column
4. **Stacking**: New discs stack on top of existing discs in the same column

**Example**:
```
Initial column 3:        After dropping red disc:
Row 0: [ ]               Row 0: [ ]
Row 1: [ ]               Row 1: [ ]
Row 2: [ ]               Row 2: [ ]
Row 3: [ ]               Row 3: [ ]
Row 4: [Y]               Row 4: [Y]
Row 5: [R]               Row 5: [R]  ← Disc lands here
                         
After dropping yellow:   
Row 0: [ ]
Row 1: [ ]
Row 2: [ ]
Row 3: [Y]  ← Disc lands here
Row 4: [Y]
Row 5: [R]
```

## Game Flow

1. **Initialization**: Game starts with an empty 7×6 board
2. **Player 1's Turn**: Player 1 (Red) makes the first move by selecting a column
3. **Disc Placement**: The red disc falls to the lowest empty row in that column
4. **Win Check**: System checks if the move created four in a row
5. **Turn Switch**: If no win, turn passes to Player 2 (Yellow)
6. **Alternating Turns**: Players continue alternating until game ends
7. **Game End**: Game concludes when a player wins or the board is full
8. **Result**: Winner is declared, or game is marked as a draw

## Win Detection

The game checks for wins after each move by examining:
- The horizontal line through the placed disc
- The vertical line through the placed disc
- The ascending diagonal through the placed disc
- The descending diagonal through the placed disc

This optimized approach only checks patterns that include the most recently placed disc, rather than scanning the entire board.

## Strategy Notes

While not part of the formal rules, players should be aware:

### Column Strategy
- **Center columns (3, 4)**: More opportunities for diagonal wins
- **Edge columns (0, 6)**: Fewer winning pattern possibilities
- **Middle columns (2, 3, 4, 5)**: Participate in more potential winning lines

### Tactical Concepts
- **Blocking**: Always check if opponent has three in a row
- **Threats**: Create situations where you have multiple ways to win
- **Building**: Stack discs to create vertical threats
- **Forcing Moves**: Make moves that force opponent to respond

### Opening Strategy
- Center control is generally advantageous
- Building in the middle columns provides more flexibility
- Avoid filling columns too quickly early in the game

## Differences from Tic-Tac-Toe

Connect Four differs from Tic-Tac-Toe in several key ways:
- **Board Size**: 7×6 (42 spaces) vs 3×3 (9 spaces)
- **Win Condition**: Four in a row vs three in a row
- **Gravity**: Discs fall to lowest position vs free placement
- **Column Selection**: Players choose column only vs choosing exact position
- **Game Length**: Typically 7-42 moves vs 5-9 moves
- **Complexity**: More strategic depth due to larger board and gravity

## Common Questions

**Q: Can I place a disc in a specific row?**
A: No, you can only select the column. Gravity automatically places the disc in the lowest empty row.

**Q: What happens if I select a full column?**
A: The move will be rejected with an error message indicating the column is full.

**Q: Can a disc be removed after placement?**
A: No, once a disc is placed, it remains in that position for the rest of the game.

**Q: Can the game end before all spaces are filled?**
A: Yes, the game ends immediately when a player achieves four in a row.

**Q: Is it possible to have multiple winning patterns at once?**
A: Yes, a single move can create multiple four-in-a-row patterns, but the game still ends with that player as the winner.

**Q: What if both players could win on the same turn?**
A: This is impossible because the game ends immediately when the current player creates four in a row.

## Rule Variations (Not Implemented)

The following variations exist in other versions of Connect Four but are **not** implemented in this version:
- Pop-out (removing bottom discs)
- Power-up discs with special abilities
- Larger or smaller board sizes
- Five-in-a-row win condition
- More than two players

This implementation follows the classic Connect Four rules as originally designed.
