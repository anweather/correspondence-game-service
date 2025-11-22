#!/bin/bash

# Deep Linking Test Script
# Tests the new player stickiness features

set -e

BASE_URL="http://localhost:3000/api"

echo "=========================================="
echo "Deep Linking Feature Test"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

info() {
    echo -e "${BLUE}→ $1${NC}"
}

echo "Step 1: Create a test game"
echo "---------------------------"
info "Creating game..."

CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/games" \
  -H "Content-Type: application/json" \
  -d '{"gameType": "tic-tac-toe", "config": {}}')

GAME_ID=$(echo "$CREATE_RESPONSE" | grep -o '"gameId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$GAME_ID" ]; then
    echo "Failed to create game"
    exit 1
fi

success "Game created with ID: $GAME_ID"
echo ""

echo "Step 2: Generate shareable link"
echo "--------------------------------"

SHARE_LINK="http://localhost:3000/#/player?gameId=$GAME_ID"

success "Shareable link generated:"
echo ""
echo "  $SHARE_LINK"
echo ""
info "Note: Query params are in the hash for React Router compatibility"
echo ""

echo "Step 3: Verify game can be loaded via API"
echo "------------------------------------------"
info "Loading game via API..."

GAME_RESPONSE=$(curl -s "$BASE_URL/games/$GAME_ID")

if echo "$GAME_RESPONSE" | grep -q "\"gameId\":\"$GAME_ID\""; then
    success "Game can be loaded via API"
else
    echo "Failed to load game"
    exit 1
fi

echo ""

echo "Step 4: Add a player to the game"
echo "---------------------------------"
info "Adding player Alice..."

PLAYER_ID="player-alice-$(date +%s)-$(openssl rand -hex 4)"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

JOIN_RESPONSE=$(curl -s -X POST "$BASE_URL/games/$GAME_ID/join" \
  -H "Content-Type: application/json" \
  -d "{
    \"player\": {
      \"id\": \"$PLAYER_ID\",
      \"name\": \"Alice\",
      \"joinedAt\": \"$TIMESTAMP\"
    }
  }")

if echo "$JOIN_RESPONSE" | grep -q "Alice"; then
    success "Alice joined the game"
else
    echo "Failed to join game"
    exit 1
fi

echo ""

echo "=========================================="
echo "Deep Linking Test Complete!"
echo "=========================================="
echo ""
success "All API tests passed!"
echo ""
echo "Manual Testing Instructions:"
echo "----------------------------"
echo ""
echo "1. Open your browser and navigate to:"
echo "   $SHARE_LINK"
echo ""
echo "2. You should see the login screen"
echo ""
echo "3. Enter a player name (e.g., 'Bob')"
echo ""
echo "4. After login, the game should load automatically"
echo ""
echo "5. You can join the game and play with Alice"
echo ""
echo "Game ID: $GAME_ID"
echo "Player 1: Alice ($PLAYER_ID)"
echo ""
