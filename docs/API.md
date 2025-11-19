# REST API Documentation

This document provides comprehensive documentation for the Async Boardgame Service REST API.

## Base URL

```
http://localhost:3000/api
```

## Response Format

All API responses follow a consistent JSON format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

## Game Management Endpoints

### List Available Game Types

Get a list of all registered game types and their metadata.

**Endpoint:** `GET /api/game-types`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "tic-tac-toe",
      "name": "tic-tac-toe",
      "description": "Classic Tic-Tac-Toe game",
      "minPlayers": 2,
      "maxPlayers": 2
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/api/game-types
```

---

### Create a New Game

Create a new game instance.

**Endpoint:** `POST /api/games`

**Request Body:**
```json
{
  "gameType": "tic-tac-toe",
  "config": {
    "players": [
      {
        "id": "player1",
        "name": "Alice"
      },
      {
        "id": "player2",
        "name": "Bob"
      }
    ],
    "customSettings": {
      "boardSize": 3
    }
  }
}
```

**Parameters:**
- `gameType` (required): The type of game to create
- `config.players` (optional): Array of initial players
- `config.customSettings` (optional): Game-specific configuration

**Response:**
```json
{
  "success": true,
  "data": {
    "gameId": "game-123",
    "gameType": "tic-tac-toe",
    "lifecycle": "active",
    "players": [...],
    "currentPlayerIndex": 0,
    "phase": "main",
    "board": {...},
    "moveHistory": [],
    "metadata": {},
    "version": 1,
    "createdAt": "2025-11-19T00:00:00.000Z",
    "updatedAt": "2025-11-19T00:00:00.000Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -d '{
    "gameType": "tic-tac-toe",
    "config": {
      "players": [
        {"id": "player1", "name": "Alice"},
        {"id": "player2", "name": "Bob"}
      ]
    }
  }'
```

---

### Get Game State

Retrieve the current state of a specific game.

**Endpoint:** `GET /api/games/:gameId`

**Parameters:**
- `gameId` (path): The unique identifier of the game

**Response:**
```json
{
  "success": true,
  "data": {
    "gameId": "game-123",
    "gameType": "tic-tac-toe",
    "lifecycle": "active",
    "players": [...],
    "currentPlayerIndex": 0,
    "board": {...},
    "moveHistory": [...],
    "version": 5
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/games/game-123
```

---

### List Games

List games with optional filtering and pagination.

**Endpoint:** `GET /api/games`

**Query Parameters:**
- `playerId` (optional): Filter by player ID
- `gameType` (optional): Filter by game type
- `lifecycle` (optional): Filter by lifecycle state (`created`, `waiting_for_players`, `active`, `completed`, `abandoned`)
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 42,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

**Examples:**
```bash
# List all games
curl http://localhost:3000/api/games

# Filter by player
curl http://localhost:3000/api/games?playerId=player1

# Filter by lifecycle and game type
curl "http://localhost:3000/api/games?lifecycle=active&gameType=tic-tac-toe"

# Pagination
curl "http://localhost:3000/api/games?page=2&pageSize=10"
```

---

### Join a Game

Add a player to an existing game.

**Endpoint:** `POST /api/games/:gameId/join`

**Parameters:**
- `gameId` (path): The unique identifier of the game

**Request Body:**
```json
{
  "id": "player3",
  "name": "Charlie"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gameId": "game-123",
    "players": [
      {"id": "player1", "name": "Alice"},
      {"id": "player2", "name": "Bob"},
      {"id": "player3", "name": "Charlie"}
    ],
    "lifecycle": "active",
    "version": 2
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/games/game-123/join \
  -H "Content-Type: application/json" \
  -d '{"id": "player3", "name": "Charlie"}'
```

---

### Delete a Game

Delete a game instance.

**Endpoint:** `DELETE /api/games/:gameId`

**Parameters:**
- `gameId` (path): The unique identifier of the game

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Game deleted successfully"
  }
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/games/game-123
```

---

## Gameplay Endpoints

### Get Current Game State

Retrieve the current state of a game (alias for GET /api/games/:gameId).

**Endpoint:** `GET /api/games/:gameId/state`

**Parameters:**
- `gameId` (path): The unique identifier of the game

**Response:** Same as GET /api/games/:gameId

**Example:**
```bash
curl http://localhost:3000/api/games/game-123/state
```

---

### Make a Move

Apply a move to a game.

**Endpoint:** `POST /api/games/:gameId/moves`

**Parameters:**
- `gameId` (path): The unique identifier of the game

**Request Body:**
```json
{
  "playerId": "player1",
  "move": {
    "action": "place",
    "parameters": {
      "row": 0,
      "col": 0
    }
  },
  "version": 5
}
```

**Parameters:**
- `playerId` (required): ID of the player making the move
- `move` (required): Move object with action and parameters
- `version` (required): Expected version number for optimistic locking

**Response:**
```json
{
  "success": true,
  "data": {
    "gameId": "game-123",
    "gameType": "tic-tac-toe",
    "lifecycle": "active",
    "currentPlayerIndex": 1,
    "board": {...},
    "moveHistory": [...],
    "version": 6
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid move
- `403 Forbidden`: Not player's turn or player not in game
- `404 Not Found`: Game not found
- `409 Conflict`: Version mismatch (optimistic locking failure)

**Example:**
```bash
curl -X POST http://localhost:3000/api/games/game-123/moves \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "player1",
    "move": {
      "action": "place",
      "parameters": {"row": 0, "col": 0}
    },
    "version": 5
  }'
```

---

### Get Move History

Retrieve the complete move history for a game.

**Endpoint:** `GET /api/games/:gameId/moves`

**Parameters:**
- `gameId` (path): The unique identifier of the game

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "playerId": "player1",
      "timestamp": "2025-11-19T00:00:00.000Z",
      "action": "place",
      "parameters": {"row": 0, "col": 0}
    },
    {
      "playerId": "player2",
      "timestamp": "2025-11-19T00:01:00.000Z",
      "action": "place",
      "parameters": {"row": 1, "col": 1}
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/api/games/game-123/moves
```

---

## Rendering Endpoints

### Get Board as SVG

Retrieve a visual representation of the game board as SVG.

**Endpoint:** `GET /api/games/:gameId/board.svg`

**Parameters:**
- `gameId` (path): The unique identifier of the game

**Response:**
- Content-Type: `image/svg+xml`
- Body: SVG XML document

**Example:**
```bash
curl http://localhost:3000/api/games/game-123/board.svg > board.svg
```

---

### Get Board as PNG

Retrieve a visual representation of the game board as PNG.

**Endpoint:** `GET /api/games/:gameId/board.png`

**Parameters:**
- `gameId` (path): The unique identifier of the game

**Response:**
- Content-Type: `image/png`
- Body: PNG image data

**Example:**
```bash
curl http://localhost:3000/api/games/game-123/board.png > board.png
```

---

## Game Lifecycle States

Games progress through the following lifecycle states:

- **`created`**: Game created but no players have joined
- **`waiting_for_players`**: Some players joined but below minimum required
- **`active`**: Game has minimum players and is in progress
- **`completed`**: Game has ended with a winner or draw
- **`abandoned`**: Game was abandoned before completion

## Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Request validation failed |
| 400 | `INVALID_MOVE` | Move is not valid according to game rules |
| 403 | `UNAUTHORIZED_MOVE` | Player not authorized to make this move |
| 404 | `GAME_NOT_FOUND` | Game with specified ID does not exist |
| 404 | `PLAYER_NOT_FOUND` | Player with specified ID does not exist |
| 409 | `CONCURRENCY_ERROR` | Version mismatch (optimistic locking) |
| 409 | `GAME_FULL` | Game has reached maximum player capacity |
| 500 | `INTERNAL_ERROR` | Internal server error |

## Optimistic Locking

The API uses optimistic locking to handle concurrent updates. Each game state has a `version` number that increments with each change.

When making a move, clients must provide the expected version number. If the version doesn't match (another player made a move), the request fails with a 409 Conflict error.

**Workflow:**
1. Client fetches game state (version: 5)
2. Client prepares move
3. Client submits move with version: 5
4. If version still matches, move is applied (new version: 6)
5. If version doesn't match, client receives 409 error and must retry

**Example Retry Logic:**
```javascript
async function makeMove(gameId, playerId, move) {
  let retries = 3;
  while (retries > 0) {
    const game = await fetch(`/api/games/${gameId}`).then(r => r.json());
    const response = await fetch(`/api/games/${gameId}/moves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        move,
        version: game.data.version
      })
    });
    
    if (response.status === 409) {
      retries--;
      continue;
    }
    
    return response.json();
  }
  throw new Error('Failed to make move after retries');
}
```

## Rate Limiting

Currently, no rate limiting is implemented. This may be added in future versions.

## Authentication

Currently, no authentication is required. Player IDs are provided by clients and trusted. In a production environment, you should implement proper authentication and authorization.
