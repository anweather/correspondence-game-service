# Deep Linking - Final Solution

## Problem Summary

The deep linking feature wasn't working because of a race condition between two useEffects:

1. **URL Update Effect** - Runs when `currentGame` changes
2. **Deep Link Loading Effect** - Reads gameId from URL and loads the game

### The Bug

On page refresh:
1. Component mounts with `currentGame = null`
2. **URL Update Effect runs first** and sees `currentGame` is null
3. It clears the URL from `/#/player?gameId=abc` to `/#/player`
4. **Deep Link Effect runs second** but the gameId is already gone from the URL
5. No game loads

## Root Cause

The URL Update Effect was clearing the URL on initial mount before the Deep Link Effect could read the gameId parameter.

## Solution

Skip the URL Update Effect on initial mount using a ref:

```typescript
const isInitialMount = useRef(true);

useEffect(() => {
  // Skip URL updates on initial mount to preserve deep link
  if (isInitialMount.current) {
    isInitialMount.current = false;
    return;
  }

  // Now safe to update URL based on currentGame
  if (currentGame) {
    const newHash = `#/player?gameId=${currentGame.gameId}`;
    window.history.replaceState({}, '', `${window.location.pathname}${newHash}`);
  } else {
    const newHash = '#/player';
    window.history.replaceState({}, '', `${window.location.pathname}${newHash}`);
  }
}, [currentGame]);
```

## Key Changes

### 1. Added Initial Mount Guard
```typescript
const isInitialMount = useRef(true);
```

This ref tracks whether it's the first render. On the first render, we skip URL updates to preserve any gameId in the URL.

### 2. Cleaned Up Deep Link Effect
```typescript
useEffect(() => {
  // Only attempt to load from URL if logged in and no game loaded
  if (!playerName || currentGame) {
    return;
  }

  // Parse query params from hash
  const hash = window.location.hash;
  const queryStart = hash.indexOf('?');
  
  if (queryStart === -1) {
    return;
  }

  const queryString = hash.substring(queryStart + 1);
  const params = new URLSearchParams(queryString);
  const gameIdParam = params.get('gameId');
  
  if (gameIdParam) {
    loadGame(gameIdParam);
  }
}, [playerName, currentGame, loadGame]);
```

Simplified logic:
- Early return if not logged in or game already loaded
- Parse gameId from hash
- Load game if gameId exists

### 3. Hash-Based URL Format
```typescript
// Correct format for hash-based routing
const shareLink = `${origin}${pathname}#/player?gameId=${gameId}`;
// Result: http://localhost:3000/#/player?gameId=abc123
```

Query parameters must be inside the hash for React Router hash mode.

## What Was Removed

- ❌ Removed `hasAttemptedDeepLink` ref (unnecessary - `!currentGame` check is sufficient)
- ❌ Removed console.log statements (debugging code)
- ❌ Removed complex conditional logic (simplified)

## What Was Kept

- ✅ `isInitialMount` ref (essential for the fix)
- ✅ URL update effect (updates URL when game loads/unloads)
- ✅ Deep link effect (loads game from URL on mount)
- ✅ Hash-based URL format (required for React Router)

## Files Modified

**web-client/src/views/PlayerView.tsx**
- Added `isInitialMount` ref
- Added guard in URL update effect
- Simplified deep link effect
- Fixed URL format to use hash-based routing

## Testing

### Test 1: Refresh While in Game
1. Login and join a game
2. URL shows: `/#/player?gameId=abc123`
3. Refresh page (F5)
4. ✅ Game loads automatically

### Test 2: Deep Link in Fresh Tab
1. Copy game URL
2. Open in incognito window
3. Login with a name
4. ✅ Game loads automatically

### Test 3: Create Game
1. Login and create a game
2. ✅ URL updates to include gameId
3. Refresh
4. ✅ Game loads automatically

### Test 4: Logout
1. In a game, click Logout
2. ✅ URL clears to `/#/player`
3. ✅ Returns to login screen

## Why This Solution Works

### Execution Order on Refresh

**Before (Broken):**
```
1. Mount with currentGame=null
2. URL Update Effect runs → Clears URL to /#/player
3. Deep Link Effect runs → No gameId in URL, nothing loads
```

**After (Fixed):**
```
1. Mount with currentGame=null
2. URL Update Effect runs → Skips (initial mount)
3. Deep Link Effect runs → Reads gameId from URL, loads game
4. Game loads, currentGame updates
5. URL Update Effect runs → Updates URL (not initial mount anymore)
```

### Why Initial Mount Guard is Necessary

The URL Update Effect needs to run on subsequent renders to:
- Add gameId when a game is created/joined
- Clear gameId when logging out
- Keep URL in sync with game state

But on initial mount, we need to preserve the URL as-is so the Deep Link Effect can read it.

## Edge Cases Handled

✅ **Refresh with gameId** - Game loads from URL
✅ **Fresh tab with gameId** - Shows login, then loads game
✅ **Create game** - URL updates with gameId
✅ **Join game** - URL updates with gameId
✅ **Logout** - URL clears
✅ **No gameId in URL** - Shows create/join screen
✅ **Invalid gameId** - Shows error, can create/join other games

## Summary

The fix is minimal and surgical:
- **One ref added**: `isInitialMount`
- **One guard added**: Skip URL update on initial mount
- **Root cause solved**: URL preserved on mount for deep linking

This ensures the URL is the source of truth for which game to load, making the app bookmarkable, shareable, and refresh-safe.

