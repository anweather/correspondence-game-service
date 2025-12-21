# REST API Documentation

This document provides comprehensive documentation for the Async Boardgame Service REST API.

## Base URL

```
http://localhost:3000/api
```

## Authentication

The API supports optional authentication using [Clerk](https://clerk.com). Authentication is **disabled by default** for local development and can be enabled for production deployments.

### Authentication Modes

**Development Mode (Default):**
- `AUTH_ENABLED=false` in environment configuration
- No authentication required for any endpoints
- Player IDs can be any string value
- Ideal for local development and testing

**Production Mode:**
- `AUTH_ENABLED=true` in environment configuration
- Protected endpoints require valid Clerk session tokens
- Tokens must be included in the `Authorization` header
- User identities are managed through Clerk

### Making Authenticated Requests

When authentication is enabled, include the Clerk session token in the Authorization header:

```bash
curl -X POST http://localhost:3000/api/games \
  -H "Authorization: Bearer <clerk_session_token>" \
  -H "Content-Type: application/json" \
  -d '{"gameType": "tic-tac-toe"}'
```

### Protected vs Public Endpoints

When `AUTH_ENABLED=true`:

**Protected Endpoints** (require authentication):
- `POST /api/games` - Create a new game
- `POST /api/games/:gameId/moves` - Make a move
- `POST /api/games/:gameId/join` - Join a game

**Public Endpoints** (no authentication required):
- `GET /api/games` - List games
- `GET /api/games/:gameId` - View game state
- `GET /api/games/:gameId/board.svg` - View board rendering
- `GET /api/games/:gameId/board.png` - View board rendering
- `GET /api/games/:gameId/moves` - View move history
- `GET /api/game-types` - List available game types
- `GET /health` - Health check

### Authentication Errors

When authentication is enabled and a request fails authentication:

**401 Unauthorized - Missing Token:**
```json
{
  "success": false,
  "error": {
    "message": "Authentication required",
    "code": "AUTHENTICATION_REQUIRED"
  }
}
```

**401 Unauthorized - Invalid Token:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid authentication token",
    "code": "INVALID_TOKEN"
  }
}
```

**403 Forbidden - Not Authorized:**
```json
{
  "success": false,
  "error": {
    "message": "Forbidden: Not a participant in this game",
    "code": "FORBIDDEN"
  }
}
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

**Authentication:** Required when `AUTH_ENABLED=true`

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
    "aiPlayers": [
      {
        "name": "AI Bot",
        "strategyId": "perfect-play",
        "difficulty": "hard"
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
- `config.players` (optional): Array of initial human players
- `config.aiPlayers` (optional): Array of AI players to create
  - `name` (required): Display name for the AI player
  - `strategyId` (optional): AI strategy to use (defaults to game's default strategy)
  - `difficulty` (optional): Difficulty level (e.g., "easy", "hard")
  - `configuration` (optional): AI-specific configuration parameters
- `config.customSettings` (optional): Game-specific configuration

**Response:**
```json
{
  "success": true,
  "data": {
    "gameId": "game-123",
    "gameType": "tic-tac-toe",
    "lifecycle": "active",
    "players": [
      {
        "id": "player1",
        "name": "Alice",
        "joinedAt": "2025-11-19T00:00:00.000Z",
        "metadata": {
          "isAI": false
        }
      },
      {
        "id": "ai-bot-456",
        "name": "AI Bot",
        "joinedAt": "2025-11-19T00:00:00.000Z",
        "metadata": {
          "isAI": true,
          "strategyId": "perfect-play",
          "difficulty": "hard"
        }
      }
    ],
    "currentPlayerIndex": 0,
    "phase": "main",
    "board": {...},
    "moveHistory": [],
    "metadata": {
      "hasAIPlayers": true,
      "aiPlayerCount": 1
    },
    "version": 1,
    "createdAt": "2025-11-19T00:00:00.000Z",
    "updatedAt": "2025-11-19T00:00:00.000Z"
  }
}
```

**Example (without authentication):**
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

**Example (with AI players):**
```bash
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -d '{
    "gameType": "tic-tac-toe",
    "config": {
      "players": [
        {"id": "player1", "name": "Alice"}
      ],
      "aiPlayers": [
        {
          "name": "AI Bot",
          "strategyId": "perfect-play",
          "difficulty": "hard"
        }
      ]
    }
  }'
```

**Example (AI vs AI game):**
```bash
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -d '{
    "gameType": "tic-tac-toe",
    "config": {
      "aiPlayers": [
        {
          "name": "AI Player 1",
          "strategyId": "perfect-play",
          "difficulty": "hard"
        },
        {
          "name": "AI Player 2",
          "strategyId": "easy",
          "difficulty": "easy"
        }
      ]
    }
  }'
```

**Example (with authentication):**
```bash
curl -X POST http://localhost:3000/api/games \
  -H "Authorization: Bearer <clerk_session_token>" \
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
    "players": [
      {
        "id": "player1",
        "name": "Alice",
        "joinedAt": "2025-11-19T00:00:00.000Z",
        "metadata": {
          "isAI": false
        }
      },
      {
        "id": "ai-bot-456",
        "name": "AI Bot",
        "joinedAt": "2025-11-19T00:00:00.000Z",
        "metadata": {
          "isAI": true,
          "strategyId": "perfect-play",
          "difficulty": "hard"
        }
      }
    ],
    "currentPlayerIndex": 0,
    "board": {...},
    "moveHistory": [
      {
        "playerId": "player1",
        "timestamp": "2025-11-19T00:00:00.000Z",
        "action": "place",
        "parameters": {"row": 0, "col": 0}
      },
      {
        "playerId": "ai-bot-456",
        "timestamp": "2025-11-19T00:00:30.000Z",
        "action": "place",
        "parameters": {"row": 1, "col": 1}
      }
    ],
    "metadata": {
      "hasAIPlayers": true,
      "aiPlayerCount": 1
    },
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

**Authentication:** Required when `AUTH_ENABLED=true`

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

**Example (without authentication):**
```bash
curl -X POST http://localhost:3000/api/games/game-123/join \
  -H "Content-Type: application/json" \
  -d '{"id": "player3", "name": "Charlie"}'
```

**Example (with authentication):**
```bash
curl -X POST http://localhost:3000/api/games/game-123/join \
  -H "Authorization: Bearer <clerk_session_token>" \
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

## AI Player Features

The API supports creating games with AI (computer-controlled) players that can participate alongside human players or play against each other.

### AI Player Configuration

When creating a game, you can specify AI players in the `config.aiPlayers` array:

```json
{
  "gameType": "tic-tac-toe",
  "config": {
    "players": [
      {"id": "human1", "name": "Alice"}
    ],
    "aiPlayers": [
      {
        "name": "AI Bot",
        "strategyId": "perfect-play",
        "difficulty": "hard",
        "configuration": {
          "thinkingTime": 500
        }
      }
    ]
  }
}
```

**AI Player Parameters:**
- `name` (required): Display name for the AI player
- `strategyId` (optional): Specific AI strategy to use. If not provided, uses the game's default strategy
- `difficulty` (optional): Difficulty level (game-specific values like "easy", "medium", "hard")
- `configuration` (optional): Additional AI-specific configuration parameters

### Available AI Strategies

Different game types support different AI strategies. You can check available strategies by examining the game type metadata or consulting the game-specific documentation.

**Tic-Tac-Toe AI Strategies:**
- `perfect-play`: Optimal play using minimax algorithm (never loses)
- `easy`: Random valid move selection
- `random`: Fallback random strategy (available for all games)

### AI Player Identification

AI players are automatically assigned unique IDs and can be identified in API responses through their metadata:

```json
{
  "id": "ai-bot-456",
  "name": "AI Bot",
  "joinedAt": "2025-11-19T00:00:00.000Z",
  "metadata": {
    "isAI": true,
    "strategyId": "perfect-play",
    "difficulty": "hard"
  }
}
```

### Automatic AI Moves

AI players automatically make moves when it becomes their turn. The system:

1. Detects when it's an AI player's turn
2. Generates a move using the configured strategy
3. Validates the move using the same rules as human players
4. Applies the move to the game state
5. Advances to the next player's turn

This process is transparent to API clients - AI moves appear in the move history and game state updates just like human moves.

### Game Metadata for AI Games

Games containing AI players include additional metadata:

```json
{
  "metadata": {
    "hasAIPlayers": true,
    "aiPlayerCount": 1
  }
}
```

This allows clients to:
- Filter games by AI presence
- Display appropriate UI indicators
- Adjust gameplay expectations

### Error Handling for AI Players

AI players may encounter errors during move generation:

- **Timeout**: AI takes too long to generate a move
- **Invalid Move**: AI generates a move that violates game rules
- **Strategy Failure**: AI strategy encounters an internal error

When AI errors occur:
1. The system logs detailed error information
2. Retry logic attempts to recover (up to 3 attempts for invalid moves)
3. If recovery fails, the game may end with an error state
4. Human players are notified through the standard notification system

### Performance Considerations

AI move generation is designed to be fast:
- Default timeout: 1 second per move
- Tic-tac-toe perfect play: typically < 100ms
- Complex games may have longer timeouts

For real-time gameplay, AI moves are processed asynchronously and don't block API responses.

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

**Authentication:** Required when `AUTH_ENABLED=true`

**Authorization:** When authenticated, the user must be a participant in the game

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
- `401 Unauthorized`: Authentication required (when AUTH_ENABLED=true)
- `403 Forbidden`: Not player's turn, player not in game, or not authorized
- `404 Not Found`: Game not found
- `409 Conflict`: Version mismatch (optimistic locking failure)

**Example (without authentication):**
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

**Example (with authentication):**
```bash
curl -X POST http://localhost:3000/api/games/game-123/moves \
  -H "Authorization: Bearer <clerk_session_token>" \
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
      "playerId": "ai-bot-456",
      "timestamp": "2025-11-19T00:00:30.000Z",
      "action": "place",
      "parameters": {"row": 1, "col": 1}
    },
    {
      "playerId": "player1",
      "timestamp": "2025-11-19T00:01:00.000Z",
      "action": "place",
      "parameters": {"row": 2, "col": 2}
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
| 400 | `INVALID_AI_CONFIG` | AI player configuration is invalid |
| 400 | `AI_STRATEGY_NOT_FOUND` | Specified AI strategy is not available for this game type |
| 401 | `AUTHENTICATION_REQUIRED` | Authentication required but not provided |
| 401 | `INVALID_TOKEN` | Authentication token is invalid or malformed |
| 401 | `TOKEN_EXPIRED` | Authentication token has expired |
| 403 | `UNAUTHORIZED_MOVE` | Player not authorized to make this move |
| 403 | `FORBIDDEN` | User is authenticated but not authorized for this resource |
| 404 | `GAME_NOT_FOUND` | Game with specified ID does not exist |
| 404 | `PLAYER_NOT_FOUND` | Player with specified ID does not exist |
| 409 | `CONCURRENCY_ERROR` | Version mismatch (optimistic locking) |
| 409 | `GAME_FULL` | Game has reached maximum player capacity |
| 500 | `INTERNAL_ERROR` | Internal server error |
| 500 | `AI_MOVE_GENERATION_ERROR` | AI player failed to generate a valid move |
| 500 | `AI_TIMEOUT_ERROR` | AI player exceeded time limit for move generation |

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

## Getting Started with Authentication

### For Local Development (No Authentication)

1. Copy `.env.example` to `.env`
2. Ensure `AUTH_ENABLED=false` (default)
3. Start the server: `npm run dev`
4. Make API requests without authentication headers

### For Production (With Authentication)

1. **Set up Clerk:**
   - Create account at [https://clerk.com](https://clerk.com)
   - Create a new application
   - Configure OAuth providers (Discord, Google, GitHub)
   - Get your API keys from the dashboard

2. **Configure Backend:**
   ```bash
   # In .env
   AUTH_ENABLED=true
   CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
   CLERK_SECRET_KEY=sk_test_your_key_here
   ```

3. **Configure Web Client:**
   ```bash
   # In web-client/.env
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
   ```

4. **Test Authentication:**
   - Start the server: `npm run dev`
   - Open web client: `http://localhost:5173`
   - Click "Sign In" and authenticate with OAuth provider
   - Create games and make moves (tokens handled automatically by web client)

For detailed setup instructions, see [CLERK_SETUP_GUIDE.md](../CLERK_SETUP_GUIDE.md).
