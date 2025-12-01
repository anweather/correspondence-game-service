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
