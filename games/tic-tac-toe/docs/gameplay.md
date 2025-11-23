# Tic-Tac-Toe Gameplay Guide

## Getting Started

This guide explains how to play Tic-Tac-Toe through the Async Boardgame Service API and UI.

## Move Format

### API Move Structure

Moves are submitted as JSON objects with the following structure:

```json
{
  "action": "place",
  "parameters": {
    "row": 0,
    "col": 0
  }
}
```

### Move Parameters

- **action**: Always `"place"` for Tic-Tac-Toe
- **parameters.row**: Integer from 0 to 2 (0 = top, 1 = middle, 2 = bottom)
- **parameters.col**: Integer from 0 to 2 (0 = left, 1 = center, 2 = right)

### Board Coordinate System

The board uses a zero-indexed coordinate system:

```
     col 0   col 1   col 2
row 0  (0,0) | (0,1) | (0,2)
       ------+-------+------
row 1  (1,0) | (1,1) | (1,2)
       ------+-------+------
row 2  (2,0) | (2,1) | (2,2)
```

## Gameplay Examples

### Example 1: Complete Game with Player 1 Win

**Initial State**: Empty board

**Move 1** - Player 1 (X) plays center:
```json
{ "action": "place", "parameters": { "row": 1, "col": 1 } }
```
```
  |   |  
--+---+--
  | X |  
--+---+--
  |   |  
```

**Move 2** - Player 2 (O) plays top-left:
```json
{ "action": "place", "parameters": { "row": 0, "col": 0 } }
```
```
O |   |  
--+---+--
  | X |  
--+---+--
  |   |  
```

**Move 3** - Player 1 (X) plays top-right:
```json
{ "action": "place", "parameters": { "row": 0, "col": 2 } }
```
```
O |   | X
--+---+--
  | X |  
--+---+--
  |   |  
```

**Move 4** - Player 2 (O) plays bottom-left:
```json
{ "action": "place", "parameters": { "row": 2, "col": 0 } }
```
```
O |   | X
--+---+--
  | X |  
--+---+--
O |   |  
```

**Move 5** - Player 1 (X) plays bottom-right (WINS):
```json
{ "action": "place", "parameters": { "row": 2, "col": 2 } }
```
```
O |   | X
--+---+--
  | X |  
--+---+--
O |   | X
```
**Result**: Player 1 wins with diagonal (0,2) → (1,1) → (2,2)

### Example 2: Draw Game

**Final Board State**:
```
X | O | X
--+---+--
O | O | X
--+---+--
X | X | O
```

**Move Sequence**:
1. Player 1 (X): (0,0) - top-left
2. Player 2 (O): (0,1) - top-center
3. Player 1 (X): (0,2) - top-right
4. Player 2 (O): (1,0) - middle-left
5. Player 1 (X): (1,2) - middle-right
6. Player 2 (O): (1,1) - center
7. Player 1 (X): (2,0) - bottom-left
8. Player 2 (O): (2,2) - bottom-right
9. Player 1 (X): (2,1) - bottom-center

**Result**: Draw - all spaces filled, no three in a row

### Example 3: Invalid Move Scenarios

**Scenario A: Space Already Occupied**

Current board:
```
X |   |  
--+---+--
  |   |  
--+---+--
  |   |  
```

Invalid move (space already taken):
```json
{ "action": "place", "parameters": { "row": 0, "col": 0 } }
```
**Error**: "Space is already occupied"

**Scenario B: Out of Bounds**

Invalid move (row out of range):
```json
{ "action": "place", "parameters": { "row": 3, "col": 1 } }
```
**Error**: "Invalid position: row and column must be between 0 and 2"

**Scenario C: Wrong Turn**

Current board (Player 2's turn):
```
X |   |  
--+---+--
  |   |  
--+---+--
  |   |  
```

Player 1 attempts to move again:
```json
{ "action": "place", "parameters": { "row": 1, "col": 1 } }
```
**Error**: "It is not your turn"

## Using the API

### Creating a Game

```bash
POST /api/games
Content-Type: application/json

{
  "gameType": "tic-tac-toe",
  "players": [
    { "id": "player1", "name": "Alice" },
    { "id": "player2", "name": "Bob" }
  ]
}
```

### Making a Move

```bash
POST /api/games/{gameId}/moves
Content-Type: application/json

{
  "playerId": "player1",
  "move": {
    "action": "place",
    "parameters": {
      "row": 1,
      "col": 1
    }
  }
}
```

### Getting Game State

```bash
GET /api/games/{gameId}
```

Response includes:
- Current board state
- Whose turn it is
- Game status (in_progress, completed)
- Winner (if game is completed)
- SVG rendering of the board

## Using the UI

### Web Client Interface

1. **View Games**: See list of all active games
2. **Select Game**: Click on a game to view details
3. **Make Move**: Click on an empty space to place your mark
4. **Visual Feedback**: 
   - Your mark appears immediately
   - Occupied spaces are disabled
   - Current player's turn is highlighted
5. **Game End**: Winner or draw is displayed when game concludes

### Move Input Component

The `TicTacToeMoveInput` component provides:
- Interactive 3x3 grid
- Visual indication of occupied spaces
- Click-to-place functionality
- Automatic validation of moves
- Disabled state when not your turn

## Tips for Players

1. **Center Control**: The center space (1,1) is the most valuable position
2. **Corner Strategy**: Corners offer more winning opportunities than edges
3. **Block Opponent**: Always check if your opponent has two in a row
4. **Fork Creation**: Try to create situations where you have two ways to win
5. **First Move Advantage**: Player 1 (X) has a slight advantage with perfect play

## Common Questions

**Q: Can I change my move after submitting?**
A: No, once a move is submitted and validated, it cannot be undone.

**Q: What happens if I try to move out of turn?**
A: The move will be rejected with an error message indicating it's not your turn.

**Q: Can the game end before all spaces are filled?**
A: Yes, the game ends immediately when a player gets three in a row.

**Q: What if both players disconnect?**
A: The game state is preserved on the server and can be resumed at any time.

**Q: Is there a time limit for moves?**
A: No, this is an asynchronous game. Players can take as long as they need.
