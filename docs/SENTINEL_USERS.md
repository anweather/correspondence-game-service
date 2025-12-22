# Sentinel User Authentication for Testing

## Overview

The Sentinel User middleware provides authentication bypass for testing by recognizing special user ID patterns. This allows blackbox tests and E2E tests to run against live development/staging servers without requiring real authentication tokens.

## How It Works

### Middleware Chain
1. **Sentinel User Middleware** - Runs first, detects sentinel user patterns
2. **Clerk Middleware** - Runs second, handles normal authentication and non-sentinel test users

### Sentinel User Patterns
- **test-*** - Users with IDs starting with `test-` (e.g., `test-user-123`, `test-alice`)
- **blackbox-*** - Users with IDs starting with `blackbox-` (e.g., `blackbox-player-1`, `blackbox-alice`)

### Environment Safety
- **Production**: Sentinel users are automatically blocked (`NODE_ENV=production`)
- **Development/Test**: Sentinel users are allowed (`NODE_ENV=development` or `NODE_ENV=test`)
- **Undefined**: Sentinel users are allowed (default for local development)

## Usage

### In Blackbox Tests
```typescript
// tests/blackbox/gameFlow.blackbox.test.ts
const player1Client = new ApiClient({
  baseUrl: API_BASE_URL,
  userId: 'blackbox-player-1',  // Sentinel user
});

const player2Client = new ApiClient({
  baseUrl: API_BASE_URL,
  userId: 'blackbox-player-2',  // Sentinel user
});
```

### In E2E Tests
```typescript
// tests/e2e/aiGameplay.e2e.test.ts
await request(app)
  .post('/api/games')
  .set('x-test-user-id', 'test-user-alice')  // Sentinel user
  .send(gameData)
  .expect(201);
```

### Running Tests Against Different Environments

#### Local Development Server
```bash
# Start local server (defaults to port 3000)
npm run dev

# Run blackbox tests against local server
BLACKBOX_API_URL=http://localhost:3000 npm run test:blackbox
```

#### Staging Server
```bash
# Run blackbox tests against staging
BLACKBOX_API_URL=https://staging.yourapi.com npm run test:blackbox
```

#### Production Server
```bash
# Sentinel users are blocked in production (tests will fail as expected)
BLACKBOX_API_URL=https://api.yourapi.com npm run test:blackbox
```

## Implementation Details

### Sentinel User Middleware
- **File**: `src/adapters/rest/auth/sentinelUserMiddleware.ts`
- **Position**: Runs before Clerk middleware in the chain
- **Function**: Detects sentinel patterns and creates mock authenticated users

### Mock User Structure
```typescript
{
  id: "test-user-123",
  externalId: "test-user-123", 
  username: "test-user-123",
  email: "test-user-123@sentinel.test"
}
```

### Integration with Clerk Middleware
- Clerk middleware checks if `req.user` is already populated
- If user exists (from sentinel middleware), Clerk middleware skips processing
- If no user exists, Clerk middleware handles normal authentication
- Non-sentinel test users (e.g., `regular-user-123`) are still handled by Clerk middleware

## Security Considerations

### Production Safety
- Sentinel users are automatically blocked when `NODE_ENV=production`
- Multiple safety checks prevent accidental bypass in production
- Audit logging tracks sentinel user usage

### Pattern Restrictions
- Only specific prefixes are allowed (`test-`, `blackbox-`)
- Empty or prefix-only user IDs are rejected
- Case-sensitive matching prevents accidental bypass

### Monitoring
- All sentinel user authentications are logged
- Production blocking attempts are logged as warnings
- Environment information is included in logs

## Testing the Implementation

### Unit Tests
```bash
npm run test:run -- tests/unit/adapters/rest/auth/sentinelUserMiddleware.test.ts
```

### Integration Tests
```bash
npm run test:run -- tests/integration/sentinelUserIntegration.test.ts
```

### Manual Testing
```bash
# Start local server
npm run dev

# Test sentinel user authentication
curl -H "x-test-user-id: test-user-123" http://localhost:3000/api/players/stats

# Test production safety (set NODE_ENV=production first)
NODE_ENV=production npm run dev
curl -H "x-test-user-id: test-user-123" http://localhost:3000/api/players/stats
# Should return 401 Unauthorized
```

## Troubleshooting

### Common Issues

1. **Sentinel users not working**
   - Check that `NODE_ENV` is not set to `production`
   - Verify user ID follows correct pattern (`test-*` or `blackbox-*`)
   - Ensure user ID has content after the prefix

2. **Tests failing with 401**
   - Check server environment configuration
   - Verify `x-test-user-id` header is being sent
   - Check server logs for sentinel user processing

3. **Production deployment concerns**
   - Sentinel middleware is safe for production deployment
   - Environment detection automatically blocks sentinel users
   - No configuration changes needed for production

### Debug Logging
Enable debug logging to see sentinel user processing:
```bash
LOG_LEVEL=debug npm run dev
```

Look for log entries like:
```
INFO: Sentinel user authenticated for testing {"userId":"test-user-123","environment":"development"}
WARN: Sentinel user blocked in production environment {"userId":"test-user-123"}
```