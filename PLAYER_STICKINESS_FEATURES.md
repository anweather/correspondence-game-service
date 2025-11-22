# Player Stickiness Features

## Overview
Two new features have been added to improve the player experience:

1. **Simple Login System** - Session-based player identity
2. **Deep Linking** - URL parameters to directly access games

---

## Feature 1: Simple Login System

### Description
Players now enter their name once at the start of their session. The name is stored in localStorage and persists across page refreshes within the same browser session/tab.

### User Flow

1. **First Visit**
   - Player navigates to `http://localhost:3000/#/player`
   - Sees a login screen: "Welcome to Async Boardgame"
   - Enters their name (e.g., "Alice")
   - Clicks "Continue"
   - Name is saved to localStorage

2. **After Login**
   - Player sees: "Welcome, Alice" with a Logout button
   - Can create or join games without re-entering name
   - Name persists across page refreshes

3. **Logout**
   - Click "Logout" button in header
   - Clears player session (name, ID, current game)
   - Returns to login screen

### Implementation Details

**Context Changes:**
- Added `login(name: string)` function
- Added `logout()` function
- Modified `createGame()` - no longer takes player name parameter
- Modified `joinGame()` - no longer takes player name parameter
- Both functions now use the logged-in player name from context

**Storage:**
- Player name stored in: `localStorage['player.name']`
- Player ID stored in: `localStorage['player.id']`
- Current game stored in: `localStorage['player.currentGame']`

**UI Changes:**
- New login screen before game setup
- Logout button in header (all screens)
- Simplified create/join forms (no name input needed)

---

## Feature 2: Deep Linking

### Description
Players can share a direct link to a specific game. When another player clicks the link, they're taken directly to that game (after logging in).

### User Flow

1. **Creating a Shareable Link**
   - Player is in an active game
   - Clicks "📋 Share Link" button in header
   - Link is copied to clipboard
   - Format: `http://localhost:3000/#/player?gameId=<game-id>`

2. **Using a Shared Link**
   - Player 2 receives link from Player 1
   - Clicks link or pastes in browser
   - If not logged in: sees login screen first
   - After login: automatically loads the game from URL
   - Can immediately join the game

3. **Manual Deep Link**
   - Players can also manually construct URLs
   - Format: `http://localhost:3000/#/player?gameId=09302ce6-a8b6-45b9-b30d-00ab3113517a`
   - Useful for bookmarking favorite games

### Implementation Details

**URL Parameter:**
- Parameter name: `gameId`
- Example: `?gameId=09302ce6-a8b6-45b9-b30d-00ab3113517a`

**Auto-Load Logic:**
```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const gameIdParam = params.get('gameId');
  
  if (gameIdParam && playerName && !currentGame) {
    // Auto-load game from URL if player is logged in
    loadGame(gameIdParam);
  }
}, [playerName, currentGame, loadGame]);
```

**Share Button:**
- Located in header (right side)
- Only visible when a game is loaded
- Uses `navigator.clipboard.writeText()` to copy link
- Icon: 📋 Share Link

---

## Testing Instructions

### Test 1: Login Flow

1. Open browser and navigate to `http://localhost:3000/#/player`
2. Verify login screen appears
3. Enter name "Alice" and click "Continue"
4. Verify you see "Welcome, Alice"
5. Refresh the page
6. Verify you're still logged in as Alice
7. Click "Logout"
8. Verify you return to login screen
9. Verify localStorage is cleared

### Test 2: Create Game with Login

1. Login as "Alice"
2. Click "Create Tic-Tac-Toe Game"
3. Verify game is created
4. Verify you're automatically joined as Alice
5. Verify "📋 Share Link" button appears in header

### Test 3: Deep Linking - Same Browser

1. While in a game, click "📋 Share Link"
2. Open a new incognito/private window
3. Paste the URL
4. Verify you see the login screen
5. Login as "Bob"
6. Verify the game loads automatically
7. Click "Join Game" to join as Bob
8. Verify you can play

### Test 4: Deep Linking - Manual URL

1. Create a game and note the game ID
2. Construct URL: `http://localhost:3000/#/player?gameId=<game-id>`
3. Open in new browser/incognito
4. Login with a name
5. Verify game loads automatically
6. Join and play

### Test 5: Session Persistence

1. Login as "Alice"
2. Create a game
3. Make a few moves
4. Close the browser tab
5. Reopen `http://localhost:3000/#/player`
6. Verify you're still logged in as Alice
7. Verify you can continue playing

### Test 6: Multiple Games

1. Login as "Alice"
2. Create Game A
3. Copy the share link for Game A
4. Create Game B (new game)
5. Copy the share link for Game B
6. Open Game A link in new tab
7. Verify Game A loads
8. Open Game B link in another new tab
9. Verify Game B loads
10. Verify both games work independently

---

## Benefits

### For Players
- **Convenience**: Enter name once, not for every game
- **Persistence**: Name saved across page refreshes
- **Easy Sharing**: One-click link copying
- **Quick Access**: Direct links to specific games
- **Bookmarking**: Can bookmark favorite games

### For Development
- **Cleaner UX**: Separation of identity and game actions
- **Better State Management**: Clear login/logout flow
- **Shareable**: Easy to share games for testing
- **URL-based Navigation**: RESTful approach to game access

---

## Technical Notes

### Browser Compatibility
- `localStorage` - Supported in all modern browsers
- `navigator.clipboard` - Requires HTTPS or localhost
- `URLSearchParams` - Supported in all modern browsers

### Security Considerations
- No password required (simple name-based identity)
- Player IDs are generated client-side
- Suitable for casual gaming, not sensitive data
- For production, consider adding authentication

### Future Enhancements
- Toast notification when link is copied
- QR code generation for mobile sharing
- Email/SMS sharing options
- Player avatars based on name
- Game history for logged-in players
- "Remember me" checkbox for persistent login

---

## API Changes

### PlayerContext

**New Functions:**
```typescript
login(name: string): void
logout(): void
```

**Modified Functions:**
```typescript
// Before:
createGame(gameType: string, playerName: string): Promise<void>
joinGame(gameId: string, playerName: string): Promise<void>

// After:
createGame(gameType: string): Promise<void>
joinGame(gameId: string): Promise<void>
```

### PlayerView

**New UI Elements:**
- Login screen (shown when `!playerName`)
- Logout button (in header)
- Share Link button (in header when game loaded)

**Removed UI Elements:**
- Player name input in create game form
- Player name input in join game form

---

## Files Modified

1. `web-client/src/context/PlayerContext.tsx`
   - Added login/logout functions
   - Modified createGame/joinGame signatures
   - Updated to use playerName from context

2. `web-client/src/views/PlayerView.tsx`
   - Added login screen
   - Added logout button
   - Added share link button
   - Added deep linking logic (useEffect)
   - Simplified create/join forms

3. `web-client/src/views/PlayerView.module.css`
   - Added `.loginContainer` styles
   - Added `.loginSection` styles
   - Added `.logoutButton` styles
   - Added `.shareButton` styles
   - Added `.headerLeft` and `.headerRight` styles
   - Updated responsive styles

4. `web-client/src/context/__tests__/PlayerContext.test.tsx`
   - Added login/logout tests
   - Updated createGame tests
   - Updated joinGame tests
   - Added "require login" tests

---

## Demo Scenario

**Scenario: Alice invites Bob to play**

1. Alice opens `http://localhost:3000/#/player`
2. Alice logs in as "Alice"
3. Alice creates a new Tic-Tac-Toe game
4. Alice clicks "📋 Share Link"
5. Alice sends link to Bob via chat/email
6. Bob clicks the link
7. Bob sees login screen
8. Bob logs in as "Bob"
9. Game automatically loads
10. Bob joins the game
11. Alice and Bob play together!

**Result:** Seamless experience from invitation to gameplay.

---

## Conclusion

These two features significantly improve the player experience by:
- Reducing friction (login once vs. every game)
- Enabling easy game sharing
- Supporting bookmarking and direct access
- Maintaining session state across refreshes

The implementation is minimal, clean, and follows React best practices with proper use of context, hooks, and localStorage.

