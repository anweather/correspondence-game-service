# Task: Implement Sentinel User Authentication Bypass for Blackbox Testing

## Objective
Enable blackbox tests to run against live dev/staging servers by implementing sentinel user IDs that bypass authentication without requiring server configuration flags.

## Current Status
- ✅ AUTH_ENABLED flag removal completed (119 → 16 failed tests)
- ✅ Core authentication infrastructure working
- ❌ Blackbox tests failing with 401 Unauthorized against live servers
- ❌ E2E tests failing with same authentication issues

## Requirements

### 1. Sentinel User Pattern Recognition
- **Pattern**: User IDs starting with `test-` or `blackbox-` bypass authentication
- **Examples**: `test-user-1`, `blackbox-player-alice`, `test-demo-bob`
- **Environment Safety**: Only works in development/staging (not production)

### 2. Implementation Approach
- **Create bypass middleware** that runs before `clerkMiddleware`
- **Intercept sentinel users** and populate `req.user` directly
- **Maintain security** by environment checking

### 3. Files to Modify

#### A. Create Sentinel User Middleware
- **File**: `src/adapters/rest/auth/sentinelUserMiddleware.ts`
- **Purpose**: Detect sentinel user patterns and create mock authenticated users
- **Logic**:
  ```typescript
  // Pseudo-code
  if (userId.startsWith('test-') || userId.startsWith('blackbox-')) {
    if (isProductionEnvironment()) {
      return next(); // No bypass in production
    }
    req.user = createMockUser(userId);
    return next();
  }
  ```

#### B. Update App Configuration
- **File**: `src/adapters/rest/app.ts`
- **Change**: Add sentinel middleware before clerkMiddleware
- **Order**: `sentinelUserMiddleware` → `clerkMiddleware` → routes

#### C. Update API Client
- **File**: `tests/blackbox/apiClient.ts`
- **Change**: Ensure it uses sentinel user IDs for blackbox tests
- **Current**: Already uses `x-test-user-id` header (good!)

### 4. Environment Detection Options

#### Option A: NODE_ENV Check
```typescript
const isProductionEnvironment = () => process.env.NODE_ENV === 'production';
```

#### Option B: Explicit Environment Variable
```typescript
const isProductionEnvironment = () => process.env.ALLOW_SENTINEL_USERS !== 'true';
```

#### Option C: Domain-Based Detection
```typescript
const isProductionEnvironment = () => {
  const hostname = process.env.HOSTNAME || 'localhost';
  return hostname.includes('prod') || hostname.includes('api.yourdomain.com');
};
```

### 5. Security Considerations
- ✅ **Production Safety**: Sentinel users disabled in production
- ✅ **Pattern Restriction**: Only specific prefixes allowed
- ✅ **Environment Gating**: Multiple safety checks
- ✅ **Audit Trail**: Log sentinel user usage for monitoring

### 6. Testing Strategy

#### Unit Tests
- Test sentinel user detection logic
- Test environment safety checks
- Test mock user creation

#### Integration Tests
- Test middleware integration with existing auth flow
- Test that production environment blocks sentinel users

#### Blackbox Tests
- Update existing blackbox tests to use sentinel user IDs
- Test against live dev server with authentication enabled

### 7. Implementation Steps

1. **Create `sentinelUserMiddleware.ts`**
   - Implement pattern detection
   - Add environment safety checks
   - Create mock user objects

2. **Update `app.ts`**
   - Add sentinel middleware to middleware chain
   - Ensure correct order (before clerkMiddleware)

3. **Update blackbox tests**
   - Ensure user IDs follow sentinel pattern
   - Add environment variable configuration

4. **Test implementation**
   - Run unit tests for new middleware
   - Run blackbox tests against dev server
   - Verify production safety

### 8. Success Criteria
- ✅ Blackbox tests pass against live dev server with auth enabled
- ✅ E2E tests pass against live staging server
- ✅ Sentinel users blocked in production environment
- ✅ No impact on existing authentication flow
- ✅ All existing tests continue to pass

### 9. Files to Create/Modify

**New Files:**
- `src/adapters/rest/auth/sentinelUserMiddleware.ts`
- `tests/unit/adapters/rest/auth/sentinelUserMiddleware.test.ts`

**Modified Files:**
- `src/adapters/rest/app.ts`
- `tests/blackbox/gameFlow.blackbox.test.ts` (ensure sentinel user IDs)
- `tests/e2e/aiGameplay.e2e.test.ts` (ensure sentinel user IDs)

### 10. Example Usage

**Development Server:**
```bash
# Start server normally (auth enabled)
npm run dev

# Run blackbox tests against live server
BLACKBOX_API_URL=http://localhost:3000 npm run test:run -- tests/blackbox/
```

**Staging Server:**
```bash
# Run blackbox tests against staging
BLACKBOX_API_URL=https://staging.yourapi.com npm run test:run -- tests/blackbox/
```

**Production Server:**
```bash
# Sentinel users automatically disabled - tests would fail (as expected)
```

## Notes
- This approach maintains security while enabling flexible testing
- No server configuration flags needed
- Works with existing `x-test-user-id` header approach
- Provides clear separation between test and production environments