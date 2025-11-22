# URL Behavior Guide

## Overview
This guide shows how the URL changes as you navigate through the player view.

---

## URL States

### State 1: Initial Visit (Not Logged In)
```
URL: http://localhost:3000/#/player
```
**Screen:** Login screen
**Action:** Enter name and login

---

### State 2: Logged In (No Game)
```
URL: http://localhost:3000/#/player
```
**Screen:** Create/Join game options
**Action:** Create or join a game

---

### State 3: Game Loaded
```
URL: http://localhost:3000/#/player?gameId=977b71a4-7733-4006-8b66-e317a02d166b
```
**Screen:** Active game view
**Action:** Play the game
**Note:** ✅ URL now includes gameId parameter!

---

### State 4: After Logout
```
URL: http://localhost:3000/#/player
```
**Screen:** Login screen
**Action:** Login again
**Note:** ✅ URL is cleared (no gameId)

---

## URL Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Initial Visit                                              │
│  URL: /#/player                                             │
│  ↓                                                           │
│  Login Screen                                               │
│  ↓                                                           │
│  Enter name "Alice"                                         │
│  ↓                                                           │
│  Still: /#/player                                           │
│  ↓                                                           │
│  Create/Join Screen                                         │
│  ↓                                                           │
│  Click "Create Game"                                        │
│  ↓                                                           │
│  URL UPDATES: /#/player?gameId=abc123                       │
│  ↓                                                           │
│  Game View (with gameId in URL)                             │
│  ↓                                                           │
│  Click "Logout"                                             │
│  ↓                                                           │
│  URL CLEARS: /#/player                                      │
│  ↓                                                           │
│  Back to Login Screen                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Deep Link Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Someone shares link with you                               │
│  URL: /#/player?gameId=abc123                               │
│  ↓                                                           │
│  Open link in browser                                       │
│  ↓                                                           │
│  See Login Screen (gameId in URL but not logged in)         │
│  ↓                                                           │
│  Enter name "Bob"                                           │
│  ↓                                                           │
│  Game loads automatically!                                  │
│  URL stays: /#/player?gameId=abc123                         │
│  ↓                                                           │
│  Join game and play                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Refresh Behavior

### Without gameId in URL
```
Before Refresh: /#/player
After Refresh:  /#/player
Result: Shows create/join screen (if logged in) or login screen
```

### With gameId in URL
```
Before Refresh: /#/player?gameId=abc123
After Refresh:  /#/player?gameId=abc123
Result: Game loads automatically (if logged in)
```

---

## Bookmark Behavior

### Bookmark without gameId
```
Bookmarked URL: /#/player
When opened: Shows login or create/join screen
Use case: Quick access to player view
```

### Bookmark with gameId
```
Bookmarked URL: /#/player?gameId=abc123
When opened: Loads specific game (after login)
Use case: Quick access to favorite game
```

---

## Share Link Behavior

### Copy Share Link
```
1. In game view
2. Click "📋 Share Link"
3. Copies: http://localhost:3000/#/player?gameId=abc123
4. Send to friend
5. Friend opens link
6. Friend logs in
7. Game loads automatically
```

---

## Multi-Tab Behavior

### Tab 1
```
URL: /#/player?gameId=game-A
Game: Tic-Tac-Toe Game A
```

### Tab 2
```
URL: /#/player?gameId=game-B
Game: Tic-Tac-Toe Game B
```

**Result:** Each tab maintains its own game independently!

---

## URL Parameter Details

### Parameter Name
```
gameId
```

### Parameter Value
```
UUID format: 977b71a4-7733-4006-8b66-e317a02d166b
```

### Full URL Structure
```
Protocol: http://
Host: localhost:3000
Path: /
Hash: #/player
Query: ?gameId=977b71a4-7733-4006-8b66-e317a02d166b

Complete: http://localhost:3000/#/player?gameId=977b71a4-7733-4006-8b66-e317a02d166b
```

---

## Browser History Behavior

### Using replaceState (Current Implementation)
```
Action: Create game
Before: /#/player
After:  /#/player?gameId=abc123
Back button: Goes to previous page (not previous URL state)
```

**Why replaceState?**
- Doesn't create extra history entries
- Back button works intuitively
- Cleaner navigation experience

---

## Edge Cases

### Case 1: Invalid gameId in URL
```
URL: /#/player?gameId=invalid-id
Result: Error message, can still create/join other games
```

### Case 2: Game deleted while URL has gameId
```
URL: /#/player?gameId=deleted-game
Result: Error message "Game not found"
Action: Clear URL and show create/join screen
```

### Case 3: Multiple query parameters
```
URL: /#/player?gameId=abc123&other=value
Result: Extracts gameId, ignores other parameters
```

### Case 4: Malformed URL
```
URL: /#/player?gameId=
Result: Empty gameId ignored, shows create/join screen
```

---

## Testing Checklist

- [ ] URL updates when creating game
- [ ] URL updates when joining game
- [ ] URL clears when logging out
- [ ] Refresh loads game from URL
- [ ] Bookmark works
- [ ] Share link works
- [ ] Can paste full URL in join form
- [ ] Multiple tabs work independently
- [ ] Invalid gameId shows error
- [ ] Back button works correctly

---

## Implementation Notes

### When URL Updates
- ✅ After creating game
- ✅ After joining game
- ✅ After loading game from API
- ✅ When currentGame changes

### When URL Clears
- ✅ After logout
- ✅ When currentGame becomes null
- ✅ When leaving game (future feature)

### URL Update Method
```typescript
window.history.replaceState({}, '', newUrl);
```
- Uses `replaceState` (not `pushState`)
- Doesn't create new history entry
- Updates URL without navigation

---

## Future Enhancements

### Possible Additions
1. **Player ID in URL** - `?gameId=abc&playerId=xyz`
2. **View Mode** - `?gameId=abc&mode=spectator`
3. **Move Highlight** - `?gameId=abc&move=5`
4. **Share with Message** - `?gameId=abc&invite=true`

### URL Shortening
- Could implement URL shortener for easier sharing
- Example: `http://localhost:3000/g/abc123`
- Redirect to full URL with parameters

---

## Comparison: Before vs After

### Before (No URL Updates)
```
❌ Refresh loses game
❌ Can't bookmark specific game
❌ Share link goes to home page
❌ Must manually enter game ID
```

### After (With URL Updates)
```
✅ Refresh preserves game
✅ Can bookmark specific game
✅ Share link goes directly to game
✅ Can paste full URL to join
```

---

## Summary

The URL now serves as the **source of truth** for which game you're viewing:

- **No gameId** = No game loaded (show create/join)
- **With gameId** = Specific game loaded (show game view)

This makes the app:
- More **bookmarkable**
- More **shareable**
- More **refresh-safe**
- More **RESTful**

The URL behavior is now consistent with modern web app best practices!

