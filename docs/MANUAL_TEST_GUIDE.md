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

---

# Player Workflow Manual Testing Guide

## Overview
This guide walks you through testing the complete player workflow, including creating games, joining games with multiple players, making moves, and verifying turn-based gameplay. This test requires using two different browser sessions (e.g., regular and incognito mode).

## Prerequisites
- Server is running at http://localhost:3000
- Web client is built and served by the Express server
- Two browser windows/sessions available (regular + incognito, or two different browsers)
- Admin workflow testing completed (optional but recommended)

## Test Scenario: Two-Player Tic-Tac-Toe Game

### Setup: Prepare Two Browser Sessions

**Browser Session 1 (Player 1):**
1. Open your primary browser
2. Navigate to: **http://localhost:3000/#/player**
3. Keep this window open

**Browser Session 2 (Player 2):**
1. Open an incognito/private window (or different browser)
2. Navigate to: **http://localhost:3000/#/player**
3. Position windows side-by-side for easy testing

---

### Step 1: Create Game as Player 1

**In Browser Session 1:**

1. You should see the Player View with game setup options
2. Locate the **"Create New Game"** section
3. Enter player name: **"Alice"**
4. Select game type: **"tic-tac-toe"**
5. Click **"Create Game"** button

**Expected Result:**
- Game is created successfully
- You see a success message with the game ID (e.g., "Game created! ID: abc123")
- The view automatically switches to show the game board
- Game details display:
  - Game ID
  - Game Type: tic-tac-toe
  - Your player name: Alice
  - Message: "Waiting for players..." or similar
  - Empty tic-tac-toe board
- Player list shows only Alice
- Move input is disabled (waiting for more players)

**Important:** Copy or note down the **Game ID** - you'll need it for Player 2 to join!

---

### Step 2: Join Game as Player 2

**In Browser Session 2:**

1. You should see the Player View with game setup options
2. Locate the **"Join Existing Game"** section
3. Enter player name: **"Bob"**
4. Enter the **Game ID** from Step 1
5. Click **"Join Game"** button

**Expected Result:**
- Join is successful
- You see a success message
- The view switches to show the game board
- Game details display:
  - Same Game ID as Player 1
  - Game Type: tic-tac-toe
  - Your player name: Bob
  - Player list shows both Alice and Bob
  - Board is empty
- Move input section appears

**In Browser Session 1 (Alice's window):**
1. Click the **"Refresh"** button (or wait for auto-refresh if implemented)

**Expected Result:**
- Player list now shows both Alice and Bob
- Game status updates to show game is ready
- Move input becomes enabled if it's Alice's turn

---

### Step 3: Verify Turn Indicator

**In Both Browser Sessions:**

Check the game details to see whose turn it is.

**Expected Result:**
- Current player indicator shows which player's turn it is
- In the player whose turn it is:
  - Move input controls are enabled
  - Message shows "Your turn!" or similar
- In the other player's window:
  - Move input controls are disabled
  - Message shows "Waiting for [other player]'s turn" or similar
- Player list highlights the current player

---

### Step 4: Make First Move (Player 1's Turn)

**Assuming it's Alice's turn, in Browser Session 1:**

1. Locate the move input section
2. Click on the **top-left cell** (position 0,0) of the tic-tac-toe grid
3. The cell should highlight to show selection
4. Click **"Submit Move"** button

**Expected Result in Browser Session 1:**
- Move is submitted successfully
- Board updates to show "X" in the top-left cell
- Current player changes to Bob
- Move input becomes disabled
- Message shows "Waiting for Bob's turn"
- Move history shows the move

**In Browser Session 2 (Bob's window):**
1. Click **"Refresh"** button to update the game state

**Expected Result:**
- Board updates to show "X" in the top-left cell
- Current player indicator shows it's Bob's turn
- Move input becomes enabled
- Message shows "Your turn!"

---

### Step 5: Make Second Move (Player 2's Turn)

**In Browser Session 2 (Bob's window):**

1. Click on the **center cell** (position 1,1) of the grid
2. Click **"Submit Move"** button

**Expected Result in Browser Session 2:**
- Move is submitted successfully
- Board updates to show "O" in the center cell
- Current player changes back to Alice
- Move input becomes disabled
- Message shows "Waiting for Alice's turn"
- Move history shows both moves

**In Browser Session 1 (Alice's window):**
1. Click **"Refresh"** button

**Expected Result:**
- Board updates to show both "X" and "O"
- Current player indicator shows it's Alice's turn
- Move input becomes enabled

---

### Step 6: Continue Playing Until Game Completion

Continue alternating moves between the two players:

**Alice's moves (Browser Session 1):**
- Move 3: Top-middle (0,1)
- Move 5: Top-right (0,2) - **Winning move!**

**Bob's moves (Browser Session 2):**
- Move 4: Bottom-left (2,0)

**After Each Move:**
1. Submit the move in the active player's window
2. Click "Refresh" in the other player's window
3. Verify board updates correctly
4. Verify turn indicator switches

**Expected Result After Winning Move:**
- Game detects the winning condition
- Winner is displayed in both windows
- Game status changes to "completed"
- Move input is disabled in both windows
- Final board state shows the winning line
- Move history shows all moves

---

### Step 7: Test Move Validation

**Create a new game and test invalid moves:**

1. Create a new game with two players (repeat Steps 1-2)
2. Player 1 makes a move in a cell
3. Player 2 tries to make a move in the **same cell**

**Expected Result:**
- Error message appears: "Invalid move" or "Cell already occupied"
- Move is rejected
- Board does not update
- Turn does not change
- Player can try again with a different cell

---

### Step 8: Test Out-of-Turn Move Attempt

**In the player's window whose turn it is NOT:**

1. Try to click on an empty cell
2. Try to submit a move

**Expected Result:**
- Move input controls are disabled
- Submit button is disabled or not visible
- Message clearly indicates it's not your turn
- No move is submitted to the server

---

### Step 9: Test Concurrent Move Attempts (Optimistic Locking)

This tests what happens when both players try to make a move at the same time.

**Setup:**
1. Create a new game with two players
2. Player 1 makes a move
3. **Do NOT refresh Player 2's window yet**

**In Browser Session 2 (Bob's window - stale state):**
1. Try to make a move (the game state is outdated)
2. Click "Submit Move"

**Expected Result:**
- Server rejects the move with a 409 Conflict error
- Error message appears: "Game state changed. Please refresh and try again."
- Board does not update
- Player is prompted to refresh

**After Refreshing:**
1. Click "Refresh" button
2. Board updates to show current state
3. Player can now make a valid move

---

### Step 10: Test Board Rendering Updates

**Verify visual board updates:**

1. Play through several moves
2. After each move and refresh, verify:
   - X and O symbols appear correctly
   - Symbols are in the correct positions
   - Board is visually clear and readable
   - Occupied cells are visually distinct
   - Winning line is highlighted (if implemented)

**Expected Result:**
- Board renders correctly after each move
- SVG or visual representation is accurate
- No visual glitches or rendering errors
- Board is responsive and scales properly

---

### Step 11: Test Game History and State Persistence

**Test that game state persists:**

1. Play a few moves in a game
2. Note the current game ID
3. Close Browser Session 2 (Bob's window)
4. Reopen a new incognito window
5. Navigate to **http://localhost:3000/#/player**
6. Join the same game using the Game ID and player name "Bob"

**Expected Result:**
- Game state is preserved
- Board shows all previous moves
- Move history is intact
- Can continue playing from where you left off
- Player ID is restored from localStorage (if implemented)

---

### Step 12: Test Error Handling

**Test various error scenarios:**

**Invalid Game ID:**
1. In a new browser session, try to join a game with ID: "invalid-game-id"

**Expected Result:**
- Error message: "Game not found" or similar
- User remains on the join game screen
- Can try again with a valid ID

**Empty Player Name:**
1. Try to create or join a game with an empty player name

**Expected Result:**
- Validation error appears
- Form submission is prevented
- User is prompted to enter a name

**Network Error Simulation:**
1. Stop the server (Ctrl+C in terminal)
2. Try to make a move or refresh

**Expected Result:**
- Error message: "Unable to connect to server" or similar
- User is informed of the connection issue
- Application doesn't crash

---

### Step 13: Test Multiple Games

**Test managing multiple games:**

**In Browser Session 1:**
1. Create Game A with Alice
2. Note Game A's ID

**In Browser Session 2:**
1. Join Game A with Bob
2. Make a few moves

**In Browser Session 1:**
1. Create Game B with Alice (new game)
2. Note Game B's ID

**In a third browser session (or new incognito):**
1. Join Game B with Charlie

**Expected Result:**
- Both games exist independently
- Each game maintains its own state
- Players can participate in multiple games
- Game IDs correctly identify each game
- No state leakage between games

---

### Step 14: Test Responsive Design

**Test on different screen sizes:**

1. Resize browser windows to different widths:
   - Desktop: 1024px+
   - Tablet: 768px-1023px
   - Mobile: <768px

**Expected Result:**
- Layout adapts to screen size
- All controls remain accessible
- Board scales appropriately
- Text remains readable
- No horizontal scrolling
- Touch targets are appropriately sized on mobile

---

## Verification Checklist

### Game Creation (Player View)
- [ ] Create game form is displayed
- [ ] Player name input works
- [ ] Game type selection works
- [ ] Create game button works
- [ ] Game ID is displayed after creation
- [ ] Success message appears
- [ ] View switches to game board automatically

### Game Joining (Player View)
- [ ] Join game form is displayed
- [ ] Player name input works
- [ ] Game ID input works
- [ ] Join game button works
- [ ] Success message appears
- [ ] View switches to game board automatically
- [ ] Error handling for invalid game ID
- [ ] Error handling for full games

### Turn-Based Gameplay
- [ ] Turn indicator shows current player
- [ ] Move input enabled only for current player
- [ ] Move input disabled for other players
- [ ] Turn changes after each move
- [ ] Both players can make moves in sequence
- [ ] Game state updates correctly

### Move Validation
- [ ] Cannot make move in occupied cell
- [ ] Cannot make move out of turn
- [ ] Invalid moves show error messages
- [ ] Valid moves are accepted
- [ ] Error messages are clear and helpful

### Board Rendering
- [ ] Board displays correctly initially
- [ ] Board updates after each move
- [ ] X and O symbols appear correctly
- [ ] Board is visually clear and readable
- [ ] Board scales responsively
- [ ] SVG rendering works properly

### Move History
- [ ] Move history displays all moves
- [ ] Moves show player name and action
- [ ] Moves show timestamp or turn number
- [ ] History updates after each move
- [ ] History scrolls if many moves

### Player List
- [ ] All players are displayed
- [ ] Current player is highlighted
- [ ] Player names are shown
- [ ] Turn order is clear
- [ ] List updates when players join

### Game Completion
- [ ] Game detects winning condition
- [ ] Winner is displayed
- [ ] Game status changes to completed
- [ ] No more moves can be made
- [ ] Final board state is shown

### Error Handling
- [ ] Invalid game ID shows error
- [ ] Empty player name shows validation error
- [ ] Network errors are handled gracefully
- [ ] Concurrent move attempts handled (409 error)
- [ ] Error messages are user-friendly
- [ ] Application doesn't crash on errors

### State Persistence
- [ ] Game state persists across refreshes
- [ ] Player ID stored in localStorage
- [ ] Can rejoin game after closing browser
- [ ] Game history is preserved

### Multi-Browser Testing
- [ ] Two players can play simultaneously
- [ ] Each player sees their own view
- [ ] Refresh updates game state
- [ ] No state conflicts between players
- [ ] Both players see same board state (after refresh)

### Responsive Design
- [ ] Works on desktop (1024px+)
- [ ] Works on tablet (768px-1023px)
- [ ] Works on mobile (<768px)
- [ ] Layout adapts appropriately
- [ ] All controls remain accessible

---

## Common Issues and Troubleshooting

### Issue: Cannot join game
**Solution:**
- Verify game ID is correct (copy-paste recommended)
- Ensure game is not full
- Check that server is running
- Try refreshing the page

### Issue: Board doesn't update after opponent's move
**Solution:**
- Click "Refresh" button to update game state
- Check browser console for errors
- Verify network connection

### Issue: Move rejected with "out of turn" error
**Solution:**
- Verify it's your turn (check turn indicator)
- Click "Refresh" to get latest game state
- Wait for opponent to make their move

### Issue: Optimistic locking error (409)
**Solution:**
- Click "Refresh" to get latest game state
- Try making the move again
- This is expected behavior when game state changes

### Issue: Player ID not persisting
**Solution:**
- Check that localStorage is enabled in browser
- Check browser console for errors
- Try clearing localStorage and rejoining game

---

## Requirements Coverage

This test covers the following requirements:

- **4.1**: Player can create a new game
- **4.2**: Player can select game type
- **4.3**: Player receives game ID after creation
- **4.4**: Player sees join instructions
- **4.5**: Error handling for game creation

- **5.1**: Player can enter game ID to join
- **5.2**: Player can join with player name
- **5.3**: Player ID is stored for subsequent moves
- **5.4**: View navigates to game board after joining
- **5.5**: Error handling for invalid game ID or full game

- **6.1**: Player can view current game state
- **6.2**: Board renders visually
- **6.3**: Turn indicator shows current player
- **6.4**: Player knows if it's their turn
- **6.5**: Player can refresh board state

- **7.1**: Move input enabled on player's turn
- **7.2**: Game-appropriate move interface
- **7.3**: Move submission with player ID
- **7.4**: Board updates after successful move
- **7.5**: Error handling for invalid moves

---

## Test Completion

Once you have completed all steps and verified all checklist items, the player workflow testing is complete. Document any issues found and report them for resolution.

**Server URL:** http://localhost:3000/#/player
**Test Date:** _________________
**Tester:** _________________
**Browser 1:** _________________
**Browser 2:** _________________
**Result:** ☐ Pass ☐ Fail (with notes)

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________


---

# Graceful Shutdown Manual Testing Guide

## Overview
This guide walks you through testing the graceful shutdown functionality of the server, ensuring that in-flight requests complete before the service stops and that new requests are properly rejected during shutdown.

## Prerequisites
- Server source code is available
- Node.js and npm are installed
- Terminal access to send signals to the server process

## Test Scripts

Three test scripts are provided in the `scripts/` directory:

1. **test-graceful-shutdown.sh** - Basic shutdown test with no in-flight requests
2. **test-graceful-shutdown-with-requests.sh** - Shutdown test with active requests
3. **test-shutdown-rejection.sh** - Tests that new requests are rejected during shutdown

---

## Test Scenario 1: Basic Graceful Shutdown

### Objective
Verify that the server shuts down gracefully when receiving SIGTERM with no active requests.

### Steps

1. **Run the test script:**
   ```bash
   ./scripts/test-graceful-shutdown.sh
   ```

2. **Observe the output**

**Expected Result:**
```
Testing graceful shutdown...

Starting server...
Waiting for server to start...
✓ Server started (PID: XXXXX)

Test 1: Shutdown with no in-flight requests
Sending SIGTERM...
✓ Server shut down gracefully

Shutdown log:
SIGTERM received, starting graceful shutdown...
Step 1/4: Stopping acceptance of new requests...
✓ New requests will be rejected with 503 Service Unavailable
Step 2/4: Closing HTTP server...
✓ HTTP server closed
Step 3/4: No in-flight requests to wait for
Step 4/4: Closing database connections...
✓ Graceful shutdown completed in Xms

Test completed!
```

### Verification Checklist
- [ ] Server starts successfully
- [ ] SIGTERM signal is received
- [ ] All 4 shutdown steps are logged
- [ ] Server stops accepting new requests
- [ ] HTTP server closes
- [ ] Database connections close
- [ ] Server exits with code 0
- [ ] Shutdown completes in under 1 second (no requests)

---

## Test Scenario 2: Shutdown with In-Flight Requests

### Objective
Verify that the server waits for in-flight requests to complete before shutting down.

### Steps

1. **Run the test script:**
   ```bash
   ./scripts/test-graceful-shutdown-with-requests.sh
   ```

2. **Observe the output**

**Expected Result:**
```
Testing graceful shutdown with in-flight requests...

Starting server...
Waiting for server to start...
✓ Server started (PID: XXXXX)

Test: Shutdown with in-flight request
Making a request to /health endpoint...
Sending SIGTERM while request is in progress...
✓ Server shut down gracefully

Shutdown log:
SIGTERM received, starting graceful shutdown...
Step 1/4: Stopping acceptance of new requests...
✓ New requests will be rejected with 503 Service Unavailable
Step 2/4: Closing HTTP server...
✓ HTTP server closed
Step 3/4: No in-flight requests to wait for
Step 4/4: Closing database connections...
✓ Graceful shutdown completed in Xms

Test completed!
```

### Verification Checklist
- [ ] Server starts successfully
- [ ] Request is initiated before shutdown
- [ ] SIGTERM signal is received during request
- [ ] Server waits for request to complete
- [ ] All 4 shutdown steps are logged
- [ ] Database connections close after requests complete
- [ ] Server exits gracefully

---

## Test Scenario 3: Request Rejection During Shutdown

### Objective
Verify that new requests are rejected with 503 Service Unavailable during the shutdown process.

### Steps

1. **Run the test script:**
   ```bash
   ./scripts/test-shutdown-rejection.sh
   ```

2. **Observe the output**

**Expected Result:**
```
Testing request rejection during shutdown...

Starting server...
Waiting for server to start...
✓ Server started (PID: XXXXX)

Test 1: Making request before shutdown...
✓ Request succeeded with status 200

Test 2: Initiating shutdown and attempting new request...
Attempting request during shutdown...
✓ Request correctly rejected with 503 Service Unavailable
✓ Server shut down successfully

Test completed!
```

### Verification Checklist
- [ ] Server starts successfully
- [ ] Initial request succeeds with 200 OK
- [ ] Shutdown is initiated
- [ ] New request during shutdown is rejected
- [ ] Rejection returns 503 Service Unavailable OR connection refused
- [ ] Server completes shutdown successfully

---

## Test Scenario 4: Manual Shutdown Test

### Objective
Manually test graceful shutdown with interactive control.

### Steps

1. **Start the server in development mode:**
   ```bash
   npm run dev
   ```

2. **Wait for server to start** (you should see startup messages)

3. **In another terminal, make a request:**
   ```bash
   curl http://localhost:3000/health
   ```

   **Expected Result:** Request succeeds with 200 OK

4. **Send SIGTERM to the server:**
   ```bash
   # Find the process ID
   ps aux | grep "ts-node"
   
   # Send SIGTERM (replace XXXXX with actual PID)
   kill -TERM XXXXX
   ```

   **Alternative:** Press `Ctrl+C` in the terminal running the server

5. **Observe the shutdown logs in the server terminal**

**Expected Result:**
```
SIGTERM received, starting graceful shutdown...
Step 1/4: Stopping acceptance of new requests...
✓ New requests will be rejected with 503 Service Unavailable
Step 2/4: Closing HTTP server...
✓ HTTP server closed
Step 3/4: No in-flight requests to wait for
Step 4/4: Closing database connections...
✓ Database connection closed
✓ Repository connection pool closed

✓ Graceful shutdown completed in Xms
```

### Verification Checklist
- [ ] Server receives SIGTERM signal
- [ ] Shutdown process logs all 4 steps
- [ ] New request acceptance stops
- [ ] HTTP server closes
- [ ] Database connections close cleanly
- [ ] Process exits with code 0

---

## Test Scenario 5: Shutdown Timeout Test

### Objective
Verify that the server respects the 30-second timeout for in-flight requests.

### Manual Test Steps

1. **Modify a route to simulate a slow request** (temporary test code):
   
   Add to `src/adapters/rest/healthRoutes.ts`:
   ```typescript
   router.get('/slow', async (_req, res) => {
     // Simulate a 35-second request (longer than timeout)
     await new Promise(resolve => setTimeout(resolve, 35000));
     res.json({ message: 'slow response' });
   });
   ```

2. **Start the server:**
   ```bash
   npm run dev
   ```

3. **In another terminal, make a slow request:**
   ```bash
   curl http://localhost:3000/slow &
   ```

4. **Immediately send SIGTERM:**
   ```bash
   kill -TERM <server-pid>
   ```

5. **Observe the shutdown logs**

**Expected Result:**
```
SIGTERM received, starting graceful shutdown...
Step 1/4: Stopping acceptance of new requests...
✓ New requests will be rejected with 503 Service Unavailable
Step 2/4: Closing HTTP server...
✓ HTTP server closed
Step 3/4: Waiting for 1 in-flight request(s) to complete (30s timeout)...
⚠ Timeout reached, 1 request(s) still in-flight
Step 4/4: Closing database connections...
✓ Database connection closed

✓ Graceful shutdown completed in ~30000ms
```

### Verification Checklist
- [ ] Server waits for in-flight requests
- [ ] Timeout is enforced (30 seconds)
- [ ] Warning is logged when timeout is reached
- [ ] Server continues shutdown after timeout
- [ ] Database connections close even with timeout
- [ ] Process exits successfully

**Note:** Remove the test code after completing this test.

---

## Test Scenario 6: Docker Container Shutdown

### Objective
Verify graceful shutdown works correctly in a Docker container environment.

### Prerequisites
- Docker is installed
- Dockerfile is created (from task 8)
- Docker image is built

### Steps

1. **Build the Docker image:**
   ```bash
   docker build -t async-boardgame-service .
   ```

2. **Run the container:**
   ```bash
   docker run -d --name test-shutdown -p 3000:3000 async-boardgame-service
   ```

3. **Verify server is running:**
   ```bash
   curl http://localhost:3000/health
   ```

4. **Send SIGTERM via Docker:**
   ```bash
   docker stop test-shutdown
   ```

5. **Check container logs:**
   ```bash
   docker logs test-shutdown
   ```

**Expected Result in Logs:**
```
SIGTERM received, starting graceful shutdown...
Step 1/4: Stopping acceptance of new requests...
✓ New requests will be rejected with 503 Service Unavailable
Step 2/4: Closing HTTP server...
✓ HTTP server closed
Step 3/4: No in-flight requests to wait for
Step 4/4: Closing database connections...
✓ Graceful shutdown completed in Xms
```

6. **Verify container stopped gracefully:**
   ```bash
   docker ps -a | grep test-shutdown
   ```

   **Expected:** Container status shows "Exited (0)"

7. **Clean up:**
   ```bash
   docker rm test-shutdown
   ```

### Verification Checklist
- [ ] Container starts successfully
- [ ] Health check responds
- [ ] Docker stop sends SIGTERM
- [ ] Graceful shutdown logs appear
- [ ] Container exits with code 0
- [ ] No forced termination (SIGKILL)

---

## Requirements Coverage

This testing guide covers the following requirements:

- **10.1**: Application stops accepting new requests on SIGTERM
- **10.2**: Backend waits for in-flight requests with 30-second timeout
- **10.3**: Database connections close cleanly during shutdown
- **10.4**: Shutdown progress and completion are logged
- **10.5**: Docker sends SIGTERM and waits for graceful shutdown

---

## Common Issues and Troubleshooting

### Issue: Server doesn't respond to SIGTERM
**Solution:**
- Verify the process is running: `ps aux | grep node`
- Ensure you're sending the signal to the correct PID
- Check that signal handlers are registered in code

### Issue: Database connections don't close
**Solution:**
- Verify database connection exists before shutdown
- Check that `close()` methods are implemented
- Review error logs for connection issues

### Issue: Timeout not working correctly
**Solution:**
- Verify timeout value is set to 30000ms (30 seconds)
- Check that `waitForCompletion()` method is called
- Ensure in-flight request counter is working

### Issue: New requests not rejected during shutdown
**Solution:**
- Verify `inFlightTracker.startShutdown()` is called
- Check middleware is registered in app
- Test with curl to see actual response code

### Issue: Test scripts fail to start server
**Solution:**
- Run `npm install` to ensure dependencies are installed
- Check that PORT 3001 is not already in use
- Verify `npm run dev` works manually
- Check for TypeScript compilation errors

---

## Test Completion

Once you have completed all test scenarios and verified all checklist items, the graceful shutdown testing is complete.

**Test Date:** _________________
**Tester:** _________________
**Environment:** ☐ Development ☐ Docker ☐ Production
**Result:** ☐ Pass ☐ Fail (with notes)

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
