# Admin Workflow Manual Testing Guide

## Overview
This guide walks you through testing the complete admin workflow for game testing, including creating games, adding players, impersonating players, making moves, and verifying game completion.

## Prerequisites
- Server is running at http://localhost:3000
- Web client is built and served by the Express server
- Browser with developer tools (recommended: Chrome or Firefox)

## Test Scenario: Complete Tic-Tac-Toe Game

### Step 1: Access Admin View
1. Open your browser and navigate to: **http://localhost:3000**
2. You should see the Admin View with:
   - Header with "Admin View" title
   - "Refresh" and "Create Game" buttons
   - Filter buttons (All, Active, Completed)
   - Empty game list (if no games exist)
   - "Select a game to view details" message

**Expected Result:** Admin interface loads successfully

---

### Step 2: Create a Test Game
1. Click the **"Create Game"** button in the header
2. Wait for the game to be created

**Expected Result:**
- A new game appears in the game list on the left sidebar
- The game is automatically selected and displayed in the main area
- Game details show:
  - Game ID
  - Game Type: tic-tac-toe
  - Lifecycle: active
  - Current Player Index: 0
  - One player named "Admin" (automatically added)
  - Empty tic-tac-toe board (3x3 grid)
- Player Panel shows the "Admin" player

---

### Step 3: Add Multiple Players
1. In the Player Panel at the bottom, locate the "Add Player" form
2. Enter "Player X" in the input field
3. Click **"Add Player"** button
4. Wait for the player to be added
5. Repeat steps 2-4 to add "Player O"

**Expected Result:**
- Both players appear in the Player Panel list
- Each player shows:
  - Player name
  - Player ID (in parentheses)
  - "Impersonate" button
- Game now has 3 players total (Admin, Player X, Player O)
- Board refreshes to show updated game state

---

### Step 4: Impersonate First Player (Player X)
1. In the Player Panel, find "Player X"
2. Click the **"Impersonate"** button next to Player X

**Expected Result:**
- Player X's list item is highlighted (blue background)
- "Active" indicator appears next to Player X's name
- Move input section appears below the player list showing:
  - Heading: "Make Move as Player X"
  - Tic-tac-toe grid with clickable cells
- Current player indicator shows it's Player X's turn (if they're first)

---

### Step 5: Make First Move as Player X
1. In the move input section, click on the **top-left cell** (position 0,0)
2. Click the **"Submit Move"** button

**Expected Result:**
- The board updates to show "X" in the top-left cell
- Current player index changes to 1 (next player's turn)
- Move history shows the move
- Game version increments
- The cell becomes disabled (can't click again)

---

### Step 6: Switch to Second Player (Player O)
1. In the Player Panel, find "Player O"
2. Click the **"Impersonate"** button next to Player O

**Expected Result:**
- Player O's list item is now highlighted
- "Active" indicator moves to Player O
- Move input section updates to show: "Make Move as Player O"
- Player X is no longer highlighted

---

### Step 7: Make Second Move as Player O
1. In the move input section, click on the **center cell** (position 1,1)
2. Click the **"Submit Move"** button

**Expected Result:**
- The board updates to show "O" in the center cell
- Current player index changes back to 0 (Player X's turn)
- Move history shows both moves
- Game version increments again

---

### Step 8: Continue Playing Until Game Completion
Continue alternating between players and making moves:

**Player X's moves (impersonate Player X for each):**
- Move 3: Top-middle (0,1)
- Move 5: Top-right (0,2) - **Winning move!**

**Player O's moves (impersonate Player O for each):**
- Move 4: Bottom-left (2,0)

**Expected Result After Each Move:**
- Board updates correctly with X or O
- Current player alternates
- Move history grows
- No errors in console

**Expected Result After Winning Move:**
- Game lifecycle changes to "completed"
- Winner is displayed in game details
- Game moves to "Completed" filter category
- No more moves can be made

---

### Step 9: Verify Game Completion Flow
1. Click the **"Completed"** filter button at the top
2. Verify the completed game appears in the list
3. Click the **"Active"** filter button
4. Verify the completed game does NOT appear
5. Click the **"All"** filter button
6. Verify the completed game appears again

**Expected Result:**
- Filters work correctly
- Completed game shows appropriate lifecycle status
- Game details show final board state
- Winner information is displayed

---

### Step 10: Test Multiple Games
1. Click **"Create Game"** to create a second game
2. Add players to the new game
3. Verify you can switch between games in the sidebar
4. Verify each game maintains its own state
5. Test impersonation in the second game

**Expected Result:**
- Multiple games can be managed simultaneously
- Switching between games works correctly
- Each game has independent state
- Player impersonation works for each game

---

### Step 11: Test Delete Game
1. In the game list, hover over a completed game
2. Click the **delete button** (trash icon or delete button)
3. Confirm the deletion in the dialog

**Expected Result:**
- Confirmation dialog appears
- After confirmation, game is removed from the list
- If the deleted game was selected, the main area shows "Select a game to view details"

---

### Step 12: Test Refresh Functionality
1. Select an active game
2. Make a move as an impersonated player
3. Click the **"Refresh"** button in the header

**Expected Result:**
- Game list refreshes
- Selected game reloads with latest state
- No data is lost
- UI updates correctly

---

## Verification Checklist

### Admin View Features
- [ ] Admin view loads successfully
- [ ] Create game button works
- [ ] Refresh button updates game list
- [ ] Filter buttons (All, Active, Completed) work correctly
- [ ] Game list displays all games
- [ ] Game selection works
- [ ] Delete game works with confirmation

### Player Panel Features
- [ ] Player list displays all players
- [ ] Player IDs are shown
- [ ] Add player form works
- [ ] Player names are validated (no empty/whitespace)
- [ ] Impersonate button works for each player
- [ ] Active indicator shows for impersonated player
- [ ] Visual highlighting works for impersonated player
- [ ] Can switch between impersonated players

### Move Input Features
- [ ] Move input appears when player is impersonated
- [ ] Shows correct player name in heading
- [ ] Tic-tac-toe grid is interactive
- [ ] Cells can be clicked to select
- [ ] Selected cell is highlighted
- [ ] Occupied cells are disabled
- [ ] Submit move button works
- [ ] Move input only enabled for current player's turn

### Game Detail Features
- [ ] Game ID is displayed
- [ ] Game type is shown
- [ ] Lifecycle status is correct
- [ ] Current player index updates
- [ ] Board renders correctly
- [ ] Board updates after each move
- [ ] Move history is displayed
- [ ] Game version increments
- [ ] Winner is shown when game completes

### Board Updates
- [ ] Board updates correctly after each move
- [ ] X and O tokens appear in correct positions
- [ ] Cells become disabled after being played
- [ ] Board state persists when switching between players
- [ ] Board state persists when switching between games

### Game Completion
- [ ] Game detects winning condition
- [ ] Lifecycle changes to "completed"
- [ ] Winner is displayed
- [ ] No more moves can be made
- [ ] Completed game appears in correct filter

### Error Handling
- [ ] Cannot make move when not impersonating
- [ ] Cannot make move when not current player's turn
- [ ] Cannot make move in occupied cell
- [ ] Error messages are displayed clearly
- [ ] Errors don't crash the application

---

## Common Issues and Troubleshooting

### Issue: Game list is empty
**Solution:** Click "Create Game" to create a new game

### Issue: Cannot make moves
**Solution:** 
- Ensure you have impersonated a player
- Verify it's the impersonated player's turn
- Check that the cell is not already occupied

### Issue: Board doesn't update
**Solution:**
- Click "Refresh" to reload the game
- Check browser console for errors
- Verify server is running

### Issue: Player not added
**Solution:**
- Ensure player name is not empty
- Check that name doesn't contain only whitespace
- Verify server is responding (check Network tab)
- Each player gets a unique auto-generated ID (fixed in implementation)

---

## Requirements Coverage

This test covers the following requirements:

- **10.1**: Admin can create test games
- **10.2**: Admin can view all games with filtering
- **10.3**: Admin can select and view game details
- **10.4**: Admin can delete games
- **10.5**: Admin can refresh game list
- **11.1**: Admin can add test players to games
- **11.2**: Admin can view player list
- **11.3**: Admin can impersonate players
- **11.4**: Admin can make moves as impersonated player
- **11.5**: Admin can switch between impersonated players

---

## Test Completion

Once you have completed all steps and verified all checklist items, the admin workflow testing is complete. Document any issues found and report them for resolution.

**Server URL:** http://localhost:3000
**Test Date:** _________________
**Tester:** _________________
**Result:** ☐ Pass ☐ Fail (with notes)

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
