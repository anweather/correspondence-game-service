# Hash Router Deep Linking Fix

## Problem

The initial implementation put query parameters before the hash:
```
❌ Wrong: http://localhost:3000/?gameId=abc123#/player
```

This caused issues because:
1. On refresh, the browser would lose the query params
2. React Router couldn't see the params (they were outside the hash)
3. URL would reset to `/#/` instead of staying on the game

## Solution

Query parameters must be **inside the hash** for hash-based routing:
```
✅ Correct: http://localhost:3000/#/player?gameId=abc123
```

## What Changed

### 1. URL Construction
```typescript
// Before (WRONG)
const newUrl = `${window.location.pathname}?gameId=${gameId}${window.location.hash}`;
// Result: /?gameId=abc123#/player

// After (CORRECT)
const newHash = `#/player?gameId=${gameId}`;
const newUrl = `${window.location.pathname}${newHash}`;
// Result: /#/player?gameId=abc123
```

### 2. URL Parsing
```typescript
// Before (WRONG)
const params = new URLSearchParams(window.location.search);

// After (CORRECT)
const hash = window.location.hash;
const queryStart = hash.indexOf('?');
if (queryStart !== -1) {
  const queryString = hash.substring(queryStart + 1);
  const params = new URLSearchParams(queryString);
}
```

### 3. Share Link Generation
```typescript
// Before (WRONG)
const shareLink = `${origin}${pathname}?gameId=${gameId}`;

// After (CORRECT)
const shareLink = `${origin}${pathname}#/player?gameId=${gameId}`;
```

## URL Format Explained

### Hash-Based Routing Structure
```
http://localhost:3000/#/player?gameId=abc123
│                      │ │      │
│                      │ │      └─ Query params (inside hash)
│                      │ └─ Route path
│                      └─ Hash symbol
└─ Base URL
```

### Why Query Params Go in the Hash

With hash-based routing (React Router in hash mode):
- Everything after `#` is the "client-side route"
- The browser doesn't send anything after `#` to the server
- React Router only sees what's in the hash
- Query params must be part of the hash to be accessible

### Comparison

**Server-Side Routing (Express, etc.):**
```
http://localhost:3000/player?gameId=abc123
                      └─ Server sees this
```

**Hash-Based Routing (React Router):**
```
http://localhost:3000/#/player?gameId=abc123
                      └─ React Router sees this
```

## Testing

### Test 1: URL Format
1. Login and create a game
2. Check URL bar
3. **Expected:** `http://localhost:3000/#/player?gameId=...`
4. **Not:** `http://localhost:3000/?gameId=...#/player`

### Test 2: Refresh
1. In a game, note the URL
2. Refresh the page (F5)
3. **Expected:** Game loads automatically
4. **Expected:** URL stays the same

### Test 3: Bookmark
1. In a game, bookmark the page
2. Close tab
3. Open bookmark
4. Login if needed
5. **Expected:** Game loads automatically

### Test 4: Share Link
1. Click "📋 Share Link"
2. Check clipboard content
3. **Expected:** `http://localhost:3000/#/player?gameId=...`
4. Open in incognito
5. **Expected:** Works correctly

## Files Modified

- `web-client/src/views/PlayerView.tsx`
  - Updated URL construction in useEffect
  - Updated URL parsing in useEffect
  - Updated share link generation
  - Updated logout handler
  - Updated join form URL parsing

- `scripts/test-deep-linking.sh`
  - Updated to show correct URL format

## Benefits of This Fix

✅ **Refresh-safe** - URL persists correctly
✅ **Bookmarkable** - Bookmarks work as expected
✅ **Shareable** - Share links work properly
✅ **Router-compatible** - Works with React Router hash mode
✅ **Browser-friendly** - Follows hash routing conventions

## Common Pitfalls to Avoid

### ❌ Don't Do This
```typescript
// Query params before hash
window.location.href = '/?gameId=abc#/player';

// Using window.location.search with hash routing
const params = new URLSearchParams(window.location.search);
```

### ✅ Do This Instead
```typescript
// Query params in hash
window.location.href = '/#/player?gameId=abc';

// Parse from hash
const hash = window.location.hash;
const queryString = hash.split('?')[1];
const params = new URLSearchParams(queryString);
```

## URL Examples

### Valid URLs
```
✅ http://localhost:3000/#/player
✅ http://localhost:3000/#/player?gameId=abc123
✅ http://localhost:3000/#/player?gameId=abc123&other=value
✅ http://localhost:3000/#/admin
```

### Invalid URLs (for hash routing)
```
❌ http://localhost:3000/?gameId=abc123#/player
❌ http://localhost:3000/#/?gameId=abc123
❌ http://localhost:3000/player?gameId=abc123
```

## Debugging Tips

### Check Current URL Structure
```javascript
console.log('Full URL:', window.location.href);
console.log('Pathname:', window.location.pathname);
console.log('Hash:', window.location.hash);
console.log('Search:', window.location.search);
```

### Expected Output (Correct)
```
Full URL: http://localhost:3000/#/player?gameId=abc123
Pathname: /
Hash: #/player?gameId=abc123
Search: (empty string)
```

### Expected Output (Incorrect - Old Bug)
```
Full URL: http://localhost:3000/?gameId=abc123#/player
Pathname: /
Hash: #/player
Search: ?gameId=abc123
```

## Summary

The fix ensures query parameters are placed **inside the hash** (`#/player?gameId=...`) rather than before it (`?gameId=...#/player`). This is essential for hash-based routing to work correctly with URL parameters.

Now the deep linking feature works as expected:
- ✅ URLs update correctly when games load
- ✅ Refresh preserves the game state
- ✅ Bookmarks work properly
- ✅ Share links function correctly
- ✅ Compatible with React Router hash mode

