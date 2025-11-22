# Deep Linking Test Guide

## What Was Fixed

The deep linking feature now properly updates the URL when you're in a game, so you can:
1. **Refresh the page** - Game stays loaded
2. **Bookmark the game** - Direct access later
3. **Share the URL** - Others can join directly

## How It Works

### URL Updates Automatically
When you create or join a game, the URL automatically updates to include the gameId:

**Before (no game):**
```
http://localhost:3000/#/player
```

**After (game loaded):**
```
http://localhost:3000/#/player?gameId=977b71a4-7733-4006-8b66-e317a02d166b
```

### URL Clears When Logging Out
When you logout, the URL clears back to:
```
http://localhost:3000/#/player
```

---

## Test Scenarios

### Test 1: URL Updates When Creating Game

1. Login as "Alice"
2. Click "Create Tic-Tac-Toe Game"
3. **Check the URL bar** - Should now show `?gameId=...`
4. Copy the URL from the address bar
5. Refresh the page (F5 or Cmd+R)
6. **Expected:** Game loads automatically, you're still in the game

✅ **Pass Criteria:** URL contains gameId parameter after creating game

---

### Test 2: URL Updates When Joining Game

1. Login as "Bob"
2. Enter a game ID or select from dropdown
3. Click "Join Game"
4. **Check the URL bar** - Should now show `?gameId=...`
5. Refresh the page
6. **Expected:** Game loads automatically

✅ **Pass Criteria:** URL contains gameId parameter after joining game

---

### Test 3: Bookmark and Return

1. Login as "Alice"
2. Create or join a game
3. **Bookmark the page** (Cmd+D or Ctrl+D)
4. Close the browser tab
5. Open the bookmark
6. Login again (if needed)
7. **Expected:** Game loads automatically from bookmarked URL

✅ **Pass Criteria:** Can return to game via bookmark

---

### Test 4: Share Link Button

1. Login and create a game
2. Click "📋 Share Link" button
3. Open a new incognito window
4. Paste the URL
5. Login as "Bob"
6. **Expected:** Game loads automatically
7. Join the game
8. **Expected:** Can play with Alice

✅ **Pass Criteria:** Share link works end-to-end

---

### Test 5: Paste Full URL in Join Form

1. Login as "Bob"
2. Copy a full game URL: `http://localhost:3000/#/player?gameId=abc123`
3. Paste the **entire URL** into the "Or enter Game ID manually" field
4. Click "Join Game"
5. **Expected:** Extracts gameId from URL and joins successfully

✅ **Pass Criteria:** Can paste full URL, not just gameId

---

### Test 6: URL Clears on Logout

1. Login and join a game
2. URL should show `?gameId=...`
3. Click "Logout"
4. **Check URL bar** - Should be clean: `/#/player` (no gameId)
5. **Expected:** URL is cleared

✅ **Pass Criteria:** URL clears when logging out

---

### Test 7: Multiple Tabs with Different Games

1. Login as "Alice" in Tab 1
2. Create Game A
3. Note the URL with gameId
4. Open new tab (Tab 2)
5. Navigate to player view
6. Login as "Alice" (same name)
7. Create Game B
8. Note the URL with different gameId
9. Switch back to Tab 1
10. Refresh Tab 1
11. **Expected:** Tab 1 loads Game A
12. Switch to Tab 2 and refresh
13. **Expected:** Tab 2 loads Game B

✅ **Pass Criteria:** Each tab maintains its own game URL

---

### Test 8: Deep Link Without Login

1. Copy a game URL
2. Open in new incognito window
3. **Expected:** See login screen first
4. Login with a name
5. **Expected:** Game loads automatically after login

✅ **Pass Criteria:** Login screen appears first, then game loads

---

### Test 9: Invalid Game ID in URL

1. Manually edit URL to: `?gameId=invalid-id-12345`
2. Refresh the page
3. **Expected:** Error message: "Failed to load game" or "Game not found"
4. Can still create or join other games

✅ **Pass Criteria:** Graceful error handling for invalid gameId

---

### Test 10: URL Persistence Across Moves

1. Login and join a game
2. Make a move
3. **Check URL** - Should still have gameId
4. Refresh page
5. **Expected:** Game loads with all moves intact
6. Make another move
7. Refresh again
8. **Expected:** All moves still there

✅ **Pass Criteria:** URL stays consistent through gameplay

---

## Quick Automated Test

Run this script to create a test game and get a shareable URL:

```bash
./scripts/test-deep-linking.sh
```

This will output a URL like:
```
http://localhost:3000/#/player?gameId=977b71a4-7733-4006-8b66-e317a02d166b
```

Try opening it in your browser!

---

## Technical Details

### URL Update Logic

```typescript
// Updates URL whenever currentGame changes
useEffect(() => {
  if (currentGame) {
    // Add gameId to URL
    const newUrl = `${window.location.pathname}?gameId=${currentGame.gameId}${window.location.hash}`;
    window.history.replaceState({}, '', newUrl);
  } else {
    // Clear gameId from URL
    const newUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, '', newUrl);
  }
}, [currentGame]);
```

### Deep Link Loading Logic

```typescript
// Loads game from URL on mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const gameIdParam = params.get('gameId');
  
  if (gameIdParam && playerName && !currentGame) {
    loadGame(gameIdParam);
  }
}, [playerName, currentGame, loadGame]);
```

### URL Parsing in Join Form

```typescript
// Extracts gameId from pasted URL
if (extractedGameId.includes('gameId=')) {
  try {
    const url = new URL(extractedGameId.startsWith('http') ? extractedGameId : `http://localhost${extractedGameId}`);
    const params = new URLSearchParams(url.search);
    const paramGameId = params.get('gameId');
    if (paramGameId) {
      extractedGameId = paramGameId;
    }
  } catch {
    // Use original value if parsing fails
  }
}
```

---

## Benefits

### For Players
- ✅ **Refresh-safe** - Won't lose your game
- ✅ **Bookmarkable** - Save favorite games
- ✅ **Shareable** - Easy to send to friends
- ✅ **Multi-tab** - Different games in different tabs

### For Development
- ✅ **Testable** - Easy to share test games
- ✅ **Debuggable** - Can see gameId in URL
- ✅ **RESTful** - Proper URL-based navigation
- ✅ **Stateless** - URL is source of truth

---

## Common Issues & Solutions

### Issue: URL doesn't update after creating game
**Solution:** Check browser console for errors. Ensure `currentGame` is set properly.

### Issue: Game doesn't load from URL
**Solution:** Make sure you're logged in first. The game only loads after login.

### Issue: URL shows old gameId
**Solution:** The URL updates when `currentGame` changes. Check that the game is actually loaded.

### Issue: Pasting URL in join form doesn't work
**Solution:** Make sure you're pasting the full URL including `http://` or the path starting with `/`

---

## Success Criteria

All features working correctly when:
- ✅ URL updates when game loads
- ✅ URL clears when game unloads
- ✅ Refresh preserves game state
- ✅ Bookmarks work
- ✅ Share links work
- ✅ Can paste full URLs in join form
- ✅ Multiple tabs work independently

---

## Next Steps

After verifying these tests pass:
1. Test on different browsers (Chrome, Firefox, Safari)
2. Test on mobile devices
3. Test with slow network connections
4. Consider adding toast notification when link is copied
5. Consider adding QR code generation for mobile sharing

