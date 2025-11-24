# Clerk Integration Design Summary

## Key Changes from Custom OAuth

### Architecture
- **Clerk as Adapter**: All Clerk code isolated in `src/adapters/rest/auth/clerk/`
- **Generic Interfaces**: Domain uses `AuthenticatedUser` and `AuthenticationService` interfaces
- **Swappable**: Can replace Clerk with custom OAuth/Auth0 by implementing same interfaces
- **Clean Boundaries**: No Clerk imports in domain/application layers

### Components

**Domain Layer** (Clerk-agnostic):
- `AuthenticatedUser` interface
- `AuthenticationService` interface
- `PlayerIdentity` model (generic, stores externalAuthProvider + externalAuthId)

**Adapter Layer** (Clerk-specific):
- `ClerkAuthenticationService` - implements `AuthenticationService`
- `clerkMiddleware()` - wraps Clerk's middleware
- `requireAuth()` - generic authorization middleware
- Maps Clerk User → domain `AuthenticatedUser`

**Web Client**:
- Clerk React components (`<SignIn>`, `<UserButton>`, `<ClerkProvider>`)
- No custom auth UI needed
- Clerk handles all OAuth flows

### Configuration

**Environment Variables**:
```bash
AUTH_ENABLED=true
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**vs Custom OAuth** (would need):
```bash
AUTH_ENABLED=true
JWT_SECRET=...
SESSION_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_CALLBACK_URL=...
GOOGLE_CLIENT_ID=...
# ... etc for each provider
```

### Benefits

1. **Speed**: 2-4 hours vs 3-5 days
2. **Simplicity**: 2 env vars vs 10+ for custom OAuth
3. **UI**: Pre-built components vs custom implementation
4. **Security**: Clerk handles compliance, updates, edge cases
5. **Features**: MFA, webhooks, user management dashboard included
6. **Flexibility**: Can still swap to custom OAuth later

### Trade-offs

1. **External Dependency**: Relies on Clerk service
2. **Cost**: Free up to 10K MAUs, then $25/mo + usage
3. **Data**: User data stored on Clerk (we sync to PlayerIdentity)
4. **Control**: Less control over auth flow details

### Migration Path

If we need to move away from Clerk later:
1. Implement `AuthenticationService` with custom OAuth/Auth0
2. Replace `ClerkAuthenticationService` with new implementation
3. Update middleware to use new service
4. Domain and application layers unchanged
5. Migrate user data from Clerk to new system

## Implementation Effort

**With Clerk**: ~4-6 hours
- Install Clerk SDKs
- Configure Clerk app
- Implement adapter layer
- Add middleware
- Update web client
- Write tests

**Custom OAuth**: ~3-5 days
- All of above plus:
- Implement OAuth flows
- Build auth UI
- Handle edge cases
- More extensive testing
- OAuth provider registration

## Recommendation

✅ **Use Clerk** for this project:
- Faster prototyping
- Production-ready security
- Clean architecture maintained
- Can migrate later if needed
