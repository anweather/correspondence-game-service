# Tic-Tac-Toe Game Rules

## Overview

Tic-Tac-Toe (also known as Noughts and Crosses) is a classic two-player strategy game played on a 3x3 grid. Players take turns marking spaces with their symbol (X or O), aiming to be the first to get three of their marks in a row.

## Game Setup

- **Players**: Exactly 2 players
- **Board**: 3x3 grid (9 spaces total)
- **Symbols**: 
  - Player 1: X
  - Player 2: O
- **Starting Position**: Empty board with all spaces available

## Objective

Be the first player to place three of your marks in a horizontal, vertical, or diagonal row.

## Win Conditions

A player wins by achieving three marks in a row in any of the following patterns:

### Horizontal Rows
- Top row: positions (0,0), (0,1), (0,2)
- Middle row: positions (1,0), (1,1), (1,2)
- Bottom row: positions (2,0), (2,1), (2,2)

### Vertical Columns
- Left column: positions (0,0), (1,0), (2,0)
- Middle column: positions (0,1), (1,1), (2,1)
- Right column: positions (0,2), (1,2), (2,2)

### Diagonals
- Top-left to bottom-right: positions (0,0), (1,1), (2,2)
- Top-right to bottom-left: positions (0,2), (1,1), (2,0)

## Draw Condition

The game ends in a draw (tie) when:
- All 9 spaces on the board are filled
- Neither player has achieved three marks in a row

## Turn Order

1. Player 1 (X) always moves first
2. Players alternate turns throughout the game
3. Each turn consists of placing one mark in an empty space
4. Once a space is marked, it cannot be changed or overwritten
5. The game continues until a win condition or draw condition is met

## Valid Moves

A move is considered valid if and only if:
1. It is the player's turn
2. The target space is within the board boundaries (row and column between 0-2)
3. The target space is currently empty (not already marked by either player)

## Invalid Moves

A move is invalid and will be rejected if:
1. It is not the player's turn
2. The row or column is outside the valid range (0-2)
3. The target space is already occupied by any mark
4. The game has already ended (win or draw)

## Game Flow

1. **Initialization**: Game starts with an empty 3x3 board
2. **Player 1's Turn**: Player 1 (X) makes the first move
3. **Alternating Turns**: Players continue alternating until game ends
4. **Game End**: Game concludes when a player wins or the board is full
5. **Result**: Winner is declared, or game is marked as a draw

## Strategy Notes

While not part of the formal rules, players should be aware:
- The center position (1,1) is strategically valuable as it participates in 4 win patterns
- Corner positions (0,0), (0,2), (2,0), (2,2) each participate in 3 win patterns
- Edge positions (0,1), (1,0), (1,2), (2,1) each participate in 2 win patterns
- With perfect play from both players, the game will always end in a draw
