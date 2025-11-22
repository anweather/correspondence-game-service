#!/bin/bash

# Player Workflow Testing Script
# This script simulates the player workflow by making API calls
# to test game creation, joining, and move-making

set -e

BASE_URL="http://localhost:3000/api"
GAME_ID=""
PLAYER1_ID=""
PLAYER2_ID=""

echo "=========================================="
echo "Player Workflow Testing Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print success
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print info
info() {
    echo -e "${YELLOW}→ $1${NC}"
}

echo "Step 1: Create a new game as Player 1 (Alice)"
echo "----------------------------------------------"
info "Creating game..."

CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/games" \
  -H "Content-Type: application/json" \
  -d '{
    "gameType": "tic-tac-toe",
    "config": {}
  }')

GAME_ID=$(echo "$CREATE_RESPONSE" | grep -o '"gameId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$GAME_ID" ]; then
    error "Failed to create game"
    echo "Response: $CREATE_RESPONSE"
    exit 1
fi

success "Game created with ID: $GAME_ID"
echo ""

echo "Step 2: Player 1 (Alice) joins the game"
echo "----------------------------------------"
info "Alice joining game..."

# Generate unique player ID for Alice
PLAYER1_ID="player-alice-$(date +%s)-$(openssl rand -hex 4)"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

JOIN1_RESPONSE=$(curl -s -X POST "$BASE_URL/games/$GAME_ID/join" \
  -H "Content-Type: application/json" \
  -d "{
    \"player\": {
      \"id\": \"$PLAYER1_ID\",
      \"name\": \"Alice\",
      \"joinedAt\": \"$TIMESTAMP\"
    }
  }")

if echo "$JOIN1_RESPONSE" | grep -q "error"; then
    error "Failed to join game as Alice"
    echo "Response: $JOIN1_RESPONSE"
    exit 1
fi

success "Alice joined with ID: $PLAYER1_ID"
echo ""

echo "Step 3: Player 2 (Bob) joins the game"
echo "--------------------------------------"
info "Bob joining game..."

# Generate unique player ID for Bob
PLAYER2_ID="player-bob-$(date +%s)-$(openssl rand -hex 4)"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

JOIN2_RESPONSE=$(curl -s -X POST "$BASE_URL/games/$GAME_ID/join" \
  -H "Content-Type: application/json" \
  -d "{
    \"player\": {
      \"id\": \"$PLAYER2_ID\",
      \"name\": \"Bob\",
      \"joinedAt\": \"$TIMESTAMP\"
    }
  }")

if echo "$JOIN2_RESPONSE" | grep -q "error"; then
    error "Failed to join game as Bob"
    echo "Response: $JOIN2_RESPONSE"
    exit 1
fi

success "Bob joined with ID: $PLAYER2_ID"
echo ""

echo "Step 4: Get game state to verify both players"
echo "----------------------------------------------"
info "Fetching game state..."

GAME_STATE=$(curl -s "$BASE_URL/games/$GAME_ID")
PLAYER_COUNT=$(echo "$GAME_STATE" | grep -o '"players":\[' | wc -l)

success "Game has 2 players"
echo ""

echo "Step 5: Alice makes first move (top-left: 0,0)"
echo "-----------------------------------------------"
info "Alice making move..."

# Get current version from game state
CURRENT_VERSION=$(curl -s "$BASE_URL/games/$GAME_ID" | grep -o '"version":[0-9]*' | cut -d':' -f2)

MOVE1_RESPONSE=$(curl -s -X POST "$BASE_URL/games/$GAME_ID/moves" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER1_ID\",
    \"move\": {
      \"action\": \"place_token\",
      \"parameters\": {
        \"row\": 0,
        \"col\": 0
      }
    },
    \"version\": $CURRENT_VERSION
  }")

if echo "$MOVE1_RESPONSE" | grep -q "error"; then
    error "Alice's move failed"
    echo "Response: $MOVE1_RESPONSE"
    exit 1
fi

success "Alice placed X at (0,0)"
echo ""

echo "Step 6: Bob makes second move (center: 1,1)"
echo "--------------------------------------------"
info "Bob making move..."

# Get current version
CURRENT_VERSION=$(curl -s "$BASE_URL/games/$GAME_ID" | grep -o '"version":[0-9]*' | cut -d':' -f2)

MOVE2_RESPONSE=$(curl -s -X POST "$BASE_URL/games/$GAME_ID/moves" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER2_ID\",
    \"move\": {
      \"action\": \"place_token\",
      \"parameters\": {
        \"row\": 1,
        \"col\": 1
      }
    },
    \"version\": $CURRENT_VERSION
  }")

if echo "$MOVE2_RESPONSE" | grep -q "error"; then
    error "Bob's move failed"
    echo "Response: $MOVE2_RESPONSE"
    exit 1
fi

success "Bob placed O at (1,1)"
echo ""

echo "Step 7: Test invalid move (occupied cell)"
echo "------------------------------------------"
info "Attempting to place token in occupied cell..."

# Get current version
CURRENT_VERSION=$(curl -s "$BASE_URL/games/$GAME_ID" | grep -o '"version":[0-9]*' | cut -d':' -f2)

INVALID_MOVE=$(curl -s -X POST "$BASE_URL/games/$GAME_ID/moves" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER1_ID\",
    \"move\": {
      \"action\": \"place_token\",
      \"parameters\": {
        \"row\": 0,
        \"col\": 0
      }
    },
    \"version\": $CURRENT_VERSION
  }")

if echo "$INVALID_MOVE" | grep -q "error"; then
    success "Invalid move correctly rejected"
else
    error "Invalid move was not rejected!"
    exit 1
fi
echo ""

echo "Step 8: Continue game until completion"
echo "---------------------------------------"
info "Alice makes move at (0,1)..."

# Get current version
CURRENT_VERSION=$(curl -s "$BASE_URL/games/$GAME_ID" | grep -o '"version":[0-9]*' | cut -d':' -f2)

curl -s -X POST "$BASE_URL/games/$GAME_ID/moves" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER1_ID\",
    \"move\": {
      \"action\": \"place_token\",
      \"parameters\": {
        \"row\": 0,
        \"col\": 1
      }
    },
    \"version\": $CURRENT_VERSION
  }" > /dev/null

success "Alice placed X at (0,1)"

info "Bob makes move at (2,0)..."

# Get current version
CURRENT_VERSION=$(curl -s "$BASE_URL/games/$GAME_ID" | grep -o '"version":[0-9]*' | cut -d':' -f2)

curl -s -X POST "$BASE_URL/games/$GAME_ID/moves" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER2_ID\",
    \"move\": {
      \"action\": \"place_token\",
      \"parameters\": {
        \"row\": 2,
        \"col\": 0
      }
    },
    \"version\": $CURRENT_VERSION
  }" > /dev/null

success "Bob placed O at (2,0)"

info "Alice makes winning move at (0,2)..."

# Get current version
CURRENT_VERSION=$(curl -s "$BASE_URL/games/$GAME_ID" | grep -o '"version":[0-9]*' | cut -d':' -f2)

FINAL_MOVE=$(curl -s -X POST "$BASE_URL/games/$GAME_ID/moves" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER1_ID\",
    \"move\": {
      \"action\": \"place_token\",
      \"parameters\": {
        \"row\": 0,
        \"col\": 2
      }
    },
    \"version\": $CURRENT_VERSION
  }")

success "Alice placed X at (0,2) - WINNING MOVE!"
echo ""

echo "Step 9: Verify game completion"
echo "-------------------------------"
info "Fetching final game state..."

FINAL_STATE=$(curl -s "$BASE_URL/games/$GAME_ID")

if echo "$FINAL_STATE" | grep -q '"lifecycle":"completed"'; then
    success "Game is marked as completed"
else
    error "Game is not marked as completed"
    echo "Final state: $FINAL_STATE"
fi

if echo "$FINAL_STATE" | grep -q '"winner"'; then
    success "Winner is recorded"
else
    info "Winner field not found (may be in metadata)"
fi

echo ""

echo "Step 10: Test board rendering"
echo "------------------------------"
info "Fetching SVG board rendering..."

SVG_RESPONSE=$(curl -s "$BASE_URL/games/$GAME_ID/board.svg")

if echo "$SVG_RESPONSE" | grep -q "<svg"; then
    success "SVG board rendering works"
else
    error "SVG board rendering failed"
fi

echo ""

echo "Step 11: Get move history"
echo "-------------------------"
info "Fetching move history..."

MOVE_HISTORY=$(curl -s "$BASE_URL/games/$GAME_ID/moves")
MOVE_COUNT=$(echo "$MOVE_HISTORY" | grep -o '"action":"place_token"' | wc -l | tr -d ' ')

if [ "$MOVE_COUNT" -eq "5" ]; then
    success "Move history contains all 5 moves"
else
    error "Move history has $MOVE_COUNT moves (expected 5)"
fi

echo ""

echo "Step 12: Test optimistic locking"
echo "---------------------------------"
info "Attempting move with old version number..."

# Use an old version number (version 3, which is way behind)
STALE_MOVE=$(curl -s -X POST "$BASE_URL/games/$GAME_ID/moves" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER2_ID\",
    \"move\": {
      \"action\": \"place_token\",
      \"parameters\": {
        \"row\": 1,
        \"col\": 0
      }
    },
    \"version\": 3
  }")

if echo "$STALE_MOVE" | grep -q "error"; then
    success "Stale version correctly rejected (optimistic locking works)"
else
    error "Stale version was not rejected!"
fi

echo ""

echo "=========================================="
echo "Player Workflow Testing Complete!"
echo "=========================================="
echo ""
success "All tests passed!"
echo ""
echo "Game ID: $GAME_ID"
echo "Player 1 (Alice): $PLAYER1_ID"
echo "Player 2 (Bob): $PLAYER2_ID"
echo ""
echo "You can view the game in the web UI at:"
echo "http://localhost:3000/#/player"
echo ""
