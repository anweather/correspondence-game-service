# Known Issues - Player View Revamp

This document tracks known issues and improvements needed for the player view revamp feature.

## Priority Issues

### 1. Route Protection for Unauthenticated Users
**Status:** Open  
**Priority:** High  
**Description:** When logged out, all routes should be disabled except those needed to log in. The user should have no permissions to access protected routes.

**Current Behavior:**
- Unauthenticated users can navigate to any route
- Protected content may be visible or cause errors

**Expected Behavior:**
- Unauthenticated users should only access public routes
- Protected routes should redirect to login/home page
- Clear messaging about authentication requirements

**Technical Notes:**
- Need to implement route guards in App.tsx
- Consider using React Router's protected route pattern
- May need to wrap routes with authentication checks

---

### 2. Admin Route Access Control
**Status:** Open  
**Priority:** High  
**Description:** When not logged in as admin, the admin page should redirect to the player view.

**Current Behavior:**
- Non-admin users may be able to access admin routes
- Error handling may not be graceful

**Expected Behavior:**
- Non-admin users attempting to access `/admin` should be redirected to `/`
- Clear error message or notification about insufficient permissions
- Admin status should be checked on route access

**Technical Notes:**
- ProtectedAdminRoute component exists but may need enhancement
- Should check admin status from authentication context
- Consider adding a "403 Forbidden" page for better UX

---

### 3. Vite Dev Server - Profile API 404 Loop
**Status:** Open  
**Priority:** Medium  
**Description:** When running the vite dev server, we get a 404 for `http://localhost:5173/api/players/profile` which leads to an infinite loop of updates and flickering. This only happens on the page where games are listed. Does not happen when running on Docker.

**Current Behavior:**
- Vite dev server shows 404 errors for `/api/players/profile`
- Causes infinite re-render loop
- Page flickers continuously
- Only occurs in Vite dev environment, not in Docker

**Expected Behavior:**
- Profile API should be accessible in dev environment
- No infinite loops or flickering
- Consistent behavior between Vite and Docker

**Technical Notes:**
- Vite is using the same backend as Docker
- Possible issue: player IDs might be different between environments
- May be related to proxy configuration in vite.config.ts
- Could be a CORS or authentication token issue
- Check if profile hook is being called repeatedly
- Investigate useEffect dependencies in components that fetch profile data

**Investigation Steps:**
1. Check vite.config.ts proxy settings
2. Compare player ID generation between environments
3. Review useProfile hook for infinite loop conditions
4. Check if authentication tokens are being properly set in dev
5. Look at network tab to see exact request/response cycle

---

### 4. Header Layout Shift on Clerk Widget Load
**Status:** Open  
**Priority:** Low (Polish)  
**Description:** When the Clerk controls load, the header moves/shifts slightly. We should reserve space for the Clerk widget to prevent layout shift.

**Current Behavior:**
- Header shifts when Clerk UserButton loads
- Causes cumulative layout shift (CLS)
- Poor user experience

**Expected Behavior:**
- Header maintains consistent size during load
- No visible layout shift
- Smooth loading experience

**Technical Notes:**
- Add min-width/min-height to userButton container
- Consider using skeleton loader or placeholder
- May need to measure Clerk widget dimensions
- Could use CSS to reserve space: `min-width: 40px; min-height: 40px;`

**Suggested Fix:**
```css
.userButton {
  display: flex;
  align-items: center;
  min-width: 40px;
  min-height: 40px;
}
```

---

### 5. Login Button in Page Content
**Status:** Open  
**Priority:** Medium  
**Description:** Login page should have a login button in the page content, not just in the header.

**Current Behavior:**
- Sign in button only appears in header
- Users may not notice it
- Not prominent enough for login flow

**Expected Behavior:**
- Large, prominent sign-in button in the main content area
- Clear call-to-action on the login page
- Header sign-in button can remain as secondary option

**Technical Notes:**
- Update PlayerView component for signed-out state
- Add SignInButton component in the main content area
- Consider adding welcome message and benefits of signing in
- Should be visually prominent and centered

**Suggested Implementation:**
- Add a hero section with sign-in CTA
- Include benefits/features list
- Make it clear what users can do after signing in

---

### 6. Join Game 500 Error
**Status:** Open  
**Priority:** High  
**Description:** Joining a game returns a 500 Internal Server Error with "Cannot read properties of undefined (reading 'id')". The error occurs in GameManagerService.js:112 when checking existing players in the joinGame method.

**Current Behavior:**
- POST to `/api/games/[gameId]/join` returns 500 error
- Backend throws TypeError: Cannot read properties of undefined (reading 'id')
- Users cannot join existing games

**Error Details:**
```
XHR POST http://localhost:3001/api/games/[gameId]/join
[HTTP/1.1 500 Internal Server Error]
error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" }

Backend Stack Trace:
TypeError: Cannot read properties of undefined (reading 'id')
    at /app/dist/src/application/services/GameManagerService.js:112:54
    at Array.some (<anonymous>)
    at GameManagerService.joinGame
```

**Expected Behavior:**
- Users should be able to join games successfully
- Proper error handling for edge cases
- Clear error messages if join fails for valid reasons

**Technical Notes:**
- Error occurs at line 112 in GameManagerService.joinGame
- Likely accessing player.id on undefined player object
- Need defensive programming for player data structure
- May be related to player identity/profile data mismatch

**Suggested Fix:**
1. Add null/undefined checks before accessing player.id
2. Validate player data structure before processing
3. Add proper error handling and logging
4. Review player data flow from authentication to game join

---

### 7. Profile Names Not Displayed in Game Lists
**Status:** Open  
**Priority:** Medium  
**Description:** In the "My Games" section, player names show as email addresses instead of display names. This affects the Players list, current turn indicator, and turn history.

**Current Behavior:**
- Email addresses displayed instead of friendly display names
- Affects multiple areas: Players list, current turn, turn history
- Poor user experience with technical identifiers visible

**Expected Behavior:**
- Display names should be shown throughout the game UI
- Email addresses should not be visible to other players
- Consistent display name usage across all game components

**Technical Notes:**
- Game data may not include player profile information
- Need to fetch and map player profiles to game data
- Affects GameDetail, PlayerPanel, and related components
- May need to join player_profiles data with game data

**Suggested Fix:**
1. Update game data fetching to include player profile data
2. Create a mapping function from player IDs to display names
3. Update GameDetail component to use display names
4. Update PlayerPanel to show display names
5. Ensure turn history uses display names instead of IDs
6. Consider caching player profiles to reduce API calls

---

### 8. Notification Toggle Visual Feedback
**Status:** Open  
**Priority:** Low (Polish)  
**Description:** The notification preference toggle in ProfileView doesn't provide visual feedback when clicked. The toggle state changes internally but the UI doesn't reflect the change immediately.

**Current Behavior:**
- Toggle appears to not respond to clicks
- State changes but visual appearance doesn't update
- Users may click multiple times thinking it's broken

**Expected Behavior:**
- Toggle should visually update immediately on click
- Clear on/off states with distinct appearances
- Smooth transition animation between states

**Technical Notes:**
- Issue likely in ProfileView.module.css
- CSS `:checked` state may not be properly styled
- Could be CSS selector specificity issue
- May need to add transition animations

**Suggested Fix:**
1. Review CSS toggle implementation in ProfileView.module.css
2. Ensure `:checked` pseudo-class has distinct styling
3. Add transition property for smooth state changes
4. Test with different browsers for consistency
5. Consider using a controlled component approach if CSS fix doesn't work

---

### 9. Connect Four Validation Module Missing
**Status:** Open  
**Priority:** High  
**Description:** Connect Four game engine tests are failing due to missing validation module. The `rules.ts` file attempts to require `./validation` which doesn't exist, causing all Connect Four tests to fail.

**Current Behavior:**
- Error: "Cannot find module './validation'"
- Affects all Connect Four engine tests
- Tests for move application, game flow, and state management all fail
- Property-based tests cannot run

**Expected Behavior:**
- Validation module should exist and be properly imported
- All Connect Four tests should pass
- Game engine should function correctly

**Technical Notes:**
- Error occurs in `games/connect-four/engine/rules.ts:168`
- Uses `require('./validation')` to avoid circular dependencies
- Missing file: `games/connect-four/engine/validation.ts`
- Affects multiple test files:
  - `ConnectFourEngine.test.ts`
  - `moveApplication.test.ts`

**Suggested Fix:**
1. Create `games/connect-four/engine/validation.ts` with `validateMove` function
2. Or refactor to use proper ES6 imports and resolve circular dependencies
3. Ensure all Connect Four tests pass after fix
4. Review other game engines for similar issues

---

### 10. Header Component Tests Failing - Missing Clerk Mock
**Status:** Open  
**Priority:** High  
**Description:** All Header component tests (26 tests) are failing because the `SignedIn` component from `@clerk/clerk-react` is not properly mocked in the test setup.

**Current Behavior:**
- Error: "No 'SignedIn' export is defined on the '@clerk/clerk-react' mock"
- All 26 Header component tests fail
- Tests cannot render the Header component

**Expected Behavior:**
- Header component tests should pass
- Clerk components should be properly mocked
- Tests should verify navigation, display name, and notification functionality

**Technical Notes:**
- Error occurs when rendering Header component
- Missing mock for `SignedIn` component in test setup
- May need to update mock in test file or global setup
- Other Clerk components may also need mocking: `UserButton`, `SignInButton`

**Suggested Fix:**
```typescript
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn() }),
  SignedIn: ({ children }: any) => children,
  SignedOut: ({ children }: any) => null,
  UserButton: () => <button data-testid="user-button">User</button>,
}));
```

---

### 11. PlayerView Tests Failing - Missing Welcome Message
**Status:** Open  
**Priority:** Medium  
**Description:** PlayerView tests are failing because the welcome message with player name is not being rendered. Tests expect "Welcome, alice" but the component doesn't display this message.

**Current Behavior:**
- Test expects welcome message: "Welcome, alice"
- Component doesn't render welcome message
- Multiple authentication-related tests fail
- UserButton not appearing in rendered output

**Expected Behavior:**
- PlayerView should display welcome message with player's display name
- UserButton should be rendered when authenticated
- Tests should pass for signed-in state

**Technical Notes:**
- Affects tests in `PlayerView.test.tsx` and `PlayerView.auth.test.tsx`
- May be related to authentication state not being properly set in tests
- Could be a component implementation issue or test setup issue
- UserButton from Clerk may not be rendering in test environment

**Suggested Fix:**
1. Review PlayerView component to ensure welcome message is implemented
2. Check if authentication state is properly passed to component
3. Update tests to match actual component behavior
4. Or update component to match test expectations
5. Ensure Clerk components are properly mocked in tests

---

### 12. App Component Test Failing - Missing Lobby Content
**Status:** Open  
**Priority:** Medium  
**Description:** App component test for lobby route is failing because expected content "browse and join available games" is not found in the rendered output.

**Current Behavior:**
- Test expects text: "browse and join available games"
- LobbyView renders but doesn't include this text
- Test fails when checking for PlayerProvider content

**Expected Behavior:**
- LobbyView should include descriptive text about browsing and joining games
- Test should pass for lobby route rendering

**Technical Notes:**
- Affects `App.test.tsx` line 310
- LobbyView component may need to add descriptive text
- Or test expectations may need to be updated to match actual component

**Suggested Fix:**
1. Add descriptive text to LobbyView component
2. Or update test to check for actual content that exists
3. Ensure test expectations match component implementation

---

### 13. StatsView Loading Check TypeError
**Status:** Open  
**Priority:** High  
**Description:** StatsView component crashes with "can't access property 'length', f is undefined" when checking loading state. The component tries to access `gameHistory.length` when `gameHistory` is undefined.

**Current Behavior:**
- Error: `Uncaught TypeError: can't access property "length", f is undefined`
- Occurs in loading state check: `if (isLoading && !stats && gameHistory.length === 0)`
- Component crashes before rendering loading state
- Users cannot view stats page

**Error Location:**
```typescript
const isLoading = statsLoading || historyLoading;
if (isLoading && !stats && gameHistory.length === 0) {
  return (
    <div className={styles.container}>
      <div className={styles.loading}>Loading statistics...</div>
    </div>
  );
}
```

**Expected Behavior:**
- Component should handle undefined `gameHistory` gracefully
- Loading state should display without errors
- No crashes when data is still loading

**Technical Notes:**
- `gameHistory` is undefined during initial load
- Accessing `.length` on undefined throws TypeError
- Need to add null/undefined check before accessing length
- Similar pattern may exist in other components

**Suggested Fix:**
```typescript
const isLoading = statsLoading || historyLoading;
if (isLoading && !stats && (!gameHistory || gameHistory.length === 0)) {
  return (
    <div className={styles.container}>
      <div className={styles.loading}>Loading statistics...</div>
    </div>
  );
}
```

Or use optional chaining:
```typescript
if (isLoading && !stats && (gameHistory?.length ?? 0) === 0) {
```

**Related Components:**
- Check other views for similar patterns
- GameHistory component may have similar issues
- Any component checking array length should be reviewed

---

## Future Enhancements

### Error Boundary for Profile Loading
- Add error boundary to gracefully handle profile loading failures
- Prevent entire app from crashing on profile errors

### Loading States
- Improve loading states throughout the application
- Add skeleton loaders for better perceived performance

### Offline Support
- Handle offline scenarios gracefully
- Show appropriate messaging when backend is unavailable

---

## Notes

- Issues are tracked here for visibility and planning
- Each issue should eventually become a task or separate spec
- Priority levels: High (blocking), Medium (important), Low (polish)
- Status options: Open, In Progress, Resolved, Won't Fix

---

**Last Updated:** 2024-01-XX  
**Spec:** player-view-revamp
