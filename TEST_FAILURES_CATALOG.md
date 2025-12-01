# Test Failures Catalog

**Total Test Files:** 35 (13 failed, 22 passed)
**Total Tests:** 390 (77 failed, 313 passed)

## Failure Categories

### 1. GameClient Tests (9 failures)
**File:** `web-client/src/api/__tests__/gameClient.test.ts`
**Root Cause:** My changes added Headers object to fetch calls, breaking test expectations

**Failures:**
- `getGameTypes > should fetch and return available game types`
- `createGame > should create a new game and return game state`
- `getGame > should fetch and return a specific game`
- `listGames > should fetch and return paginated game list`
- `listGames > should include query parameters when filters provided`
- `joinGame > should join a new game and return updated game state`
- `deleteGame > should delete a game successfully`
- `makeMove > should submit a move and return updated game state`
- `getMoveHistory > should fetch and return move history`

**Fix Required:** Update test expectations to account for Headers object in fetch calls

---

### 2. Connect Four Engine Tests (13 failures)
**Files:** 
- `games/connect-four/engine/__tests__/ConnectFourEngine.test.ts` (3 failures)
- `games/connect-four/engine/__tests__/moveApplication.test.ts` (10 failures)

**Root Cause:** Module resolution error - `Cannot find module './validation'`

**Failures:**
- Complete game flow tests
- Invalid move handling tests
- State completeness tests
- Turn alternation property tests (5 tests)
- Immutability property tests (5 tests)

**Fix Required:** Fix module import/export issues in Connect Four engine

---

### 3. AdminContext Tests (16 failures)
**File:** `web-client/src/context/__tests__/AdminContext.test.tsx`
**Root Cause:** Clerk provider error - `useAuth can only be used within the <ClerkProvider />`

**Failures:**
- State initialization test
- loadGames tests (3 tests)
- selectGame tests (2 tests)
- createTestGame tests (2 tests)
- addTestPlayer tests (2 tests)
- impersonatePlayer tests (2 tests)
- deleteGame tests (3 tests)
- setFilter test

**Fix Required:** Mock Clerk's useAuth hook properly in tests

---

### 4. AdminView Tests (13 failures)
**File:** `web-client/src/views/__tests__/AdminView.test.tsx`
**Root Cause:** Same Clerk provider error cascading from AdminContext

**Failures:**
- All rendering tests (header, GameList, filters, buttons, etc.)
- State management tests
- Interaction tests

**Fix Required:** Same as AdminContext - mock Clerk properly

---

### 5. PlayerView Tests (18 failures)
**File:** `web-client/src/views/__tests__/PlayerView.test.tsx`
**Root Cause:** Likely Clerk provider error cascading from PlayerContext

**Failures:**
- Game setup screen tests (7 tests)
- Game view tests (7 tests)
- Move submission tests (2 tests)
- Optimistic locking test
- Refresh functionality test

**Fix Required:** Mock Clerk properly in PlayerContext tests

---

### 6. App Tests (6 failures)
**File:** `web-client/src/__tests__/App.test.tsx`
**Root Cause:** Clerk provider error cascading through contexts

**Failures:**
- Rendering tests (3 tests)
- Route wrapping tests (2 tests)
- Navigation test

**Fix Required:** Mock Clerk at App level or in test setup

---

### 7. GameList Tests (2 failures)
**File:** `web-client/src/components/GameList/__tests__/GameList.test.tsx`
**Root Cause:** Test expectations don't match actual rendering

**Failures:**
- `should display turn information` - Looking for "1 (Diana)" but game-2 is completed
- `should display current player name in turn info` - Looking for "Diana" but not rendered

**Fix Required:** Update test data or expectations to match component behavior

---

### 8. Game Engine Tests (5 failures - unrelated to my changes)
**Files:**
- `games/connect-four/engine/__tests__/renderer.test.ts`
- `games/tic-tac-toe/engine/__tests__/TicTacToeEngine.test.ts`
- `games/tic-tac-toe/engine/__tests__/initialization.test.ts`
- `games/tic-tac-toe/engine/__tests__/rules.test.ts`
- `games/tic-tac-toe/engine/__tests__/validation.test.ts`

**Root Cause:** Pre-existing failures, not related to my changes

**Fix Required:** Investigate separately (out of scope for this task)

---

## Priority Fix Order

1. **GameClient Tests** (9 failures) - Direct impact from my changes, easy fix
2. **Clerk Mocking** (53 failures) - Affects AdminContext, AdminView, PlayerView, App tests
3. **GameList Tests** (2 failures) - Simple test data/expectation fix
4. **Connect Four Tests** (13 failures) - Module resolution issue
5. **Game Engine Tests** (5 failures) - Pre-existing, lower priority

---

## Summary

**My Changes Caused:** 9 failures (GameClient tests)
**Cascading Clerk Issues:** 53 failures (AdminContext, AdminView, PlayerView, App)
**Other Issues:** 15 failures (GameList, Connect Four, Game Engines)

**Immediate Action:** Fix GameClient tests, then address Clerk mocking strategy
