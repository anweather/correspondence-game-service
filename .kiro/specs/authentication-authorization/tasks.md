# Implementation Plan

## Overview

This implementation plan converts the Clerk-based authentication design into actionable coding tasks. The plan follows **strict TDD (Test-Driven Development)** principles and hexagonal architecture, implementing Clerk as an adapter while keeping domain and application layers authentication-agnostic.

**CRITICAL TDD WORKFLOW**:
Every task follows Red-Green-Refactor:
1. **RED**: Write failing tests first (marked with "RED" in task list)
2. **GREEN**: Write minimal code to pass tests (marked with "GREEN" in task list)
3. **REFACTOR**: Improve code while keeping tests green

Tests are NOT optional - they are the specification for the implementation.

## Task List

- [x] 1. Set up Clerk account and configure authentication providers
  - Create Clerk account at https://clerk.com
  - Create new Clerk application
  - Configure OAuth providers (Discord, Google, GitHub) in Clerk dashboard
  - Copy publishable and secret keys
  - Add keys to `.env.example` with documentation
  - _Requirements: 1.1, 1.4, 7.1, 7.2_

- [x] 2. Install Clerk dependencies and update configuration
  - Install `@clerk/express` for backend
  - Install `@clerk/clerk-react` for web client
  - Extend `AppConfig` interface with Clerk configuration
  - Update `loadConfig()` to read `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
  - Add validation for Clerk keys when `AUTH_ENABLED=true`
  - _Requirements: 7.1, 7.3, 7.6_

- [x] 2.1 Write unit tests for Clerk configuration loading (RED)
  - Test configuration loading with valid Clerk keys
  - Test validation failure when AUTH_ENABLED=true but keys missing
  - Test AUTH_ENABLED=false bypasses validation
  - Tests should FAIL initially (no implementation yet)
  - _Requirements: 7.1, 7.3, 7.6_

- [x] 3. Create generic authentication interfaces in domain layer
  - [x] 3.1 Define `AuthenticatedUser` interface
    - Create `src/domain/interfaces/authentication.ts`
    - Define generic `AuthenticatedUser` type (id, externalId, username, email)
    - Define `ExternalAuthUser` type for external auth providers
    - _Requirements: 4.1, 4.4_

  - [x] 3.2 Define `AuthenticationService` interface
    - Define `findOrCreatePlayer()` method signature
    - Define `getUserById()` method signature
    - Add JSDoc comments explaining generic nature
    - _Requirements: 4.1, 4.4_

  - [x] 3.3 Write property test for AuthenticatedUser structure (RED)
    - **Property 12: PlayerIdentity structure completeness**
    - **Validates: Requirements 6.4**
    - Test that any AuthenticatedUser has required fields
    - Verify test FAILS before implementing
    - _Requirements: 6.4_

- [x] 4. Extend PlayerIdentity model for external auth
  - [x] 4.1 Add external auth fields to PlayerIdentity
    - Add `externalAuthProvider` field (string: 'clerk', 'custom-oauth', etc.)
    - Add `externalAuthId` field (string: Clerk user ID or other provider ID)
    - Add `email` field (optional string)
    - Keep model generic (no Clerk-specific fields)
    - _Requirements: 2.7, 6.4_

  - [x] 4.2 Update PlayerIdentityRepository interface
    - Add `findByExternalId(provider: string, externalId: string)` method
    - Update `create()` to accept external auth fields
    - _Requirements: 6.1_

  - [x] 4.3 Write unit tests for PlayerIdentity model (RED)
    - Test PlayerIdentity creation with external auth fields
    - Test field validation
    - Verify tests FAIL before implementation
    - _Requirements: 6.4_

- [x] 5. Implement database migration for authentication
  - Create migration `003_add_authentication.sql`
  - Add `external_auth_provider` column to `player_identities`
  - Add `external_auth_id` column to `player_identities`
  - Add `email` column to `player_identities`
  - Create unique index on `(external_auth_provider, external_auth_id)`
  - Add `creator_player_id` foreign key to `games` table
  - _Requirements: 6.1, 6.2, 6.5_

- [x] 6. Implement PlayerIdentityRepository with external auth support
  - [x] 6.1 Implement `findByExternalId()` method
    - Query by provider and external ID
    - Return PlayerIdentity or null
    - _Requirements: 6.1_

  - [x] 6.2 Update `create()` method
    - Accept external auth fields
    - Validate required fields
    - Insert into database
    - _Requirements: 6.1_

  - [x] 6.3 Write unit tests for repository methods (RED)
    - Test findByExternalId with existing and non-existing players
    - Test create with external auth fields
    - Test unique constraint on (provider, externalId)
    - Verify tests FAIL before implementation
    - _Requirements: 6.1_

  - [x] 6.4 Write property test for player creation (RED)
    - **Property 9: PlayerIdentity creation on authentication**
    - **Validates: Requirements 6.1**
    - Test that any external auth user results in PlayerIdentity creation
    - Verify test FAILS before implementation
    - _Requirements: 6.1_

- [x] 7. Implement Clerk authentication adapter
  - [x] 7.1 Create ClerkAuthenticationService
    - Create `src/adapters/rest/auth/clerk/ClerkAuthenticationService.ts`
    - Implement `AuthenticationService` interface
    - Implement `findOrCreatePlayer()` using Clerk SDK
    - Implement `getUserById()` using Clerk SDK
    - Map Clerk User to domain types
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 6.1_

  - [x] 7.2 Write unit tests for ClerkAuthenticationService (RED)
    - Mock Clerk SDK
    - Test findOrCreatePlayer creates new player
    - Test findOrCreatePlayer retrieves existing player
    - Test getUserById with valid and invalid IDs
    - Test Clerk User mapping to domain types
    - Verify tests FAIL before implementation
    - _Requirements: 6.1, 9.2, 9.4_

  - [x] 7.3 Write property test for Clerk user mapping (RED)
    - **Property 5: OAuth provider data persistence**
    - **Validates: Requirements 2.7**
    - Test that any Clerk user maps to PlayerIdentity with provider data
    - _Requirements: 2.7_

- [x] 8. Implement authentication middleware
  - [x] 8.1 Create Clerk middleware wrapper
    - Create `src/adapters/rest/auth/clerkMiddleware.ts`
    - Wrap Clerk's `clerkMiddleware()` function
    - Extract user from Clerk session
    - Map to generic `AuthenticatedUser` type
    - Populate `req.user` with generic type
    - Handle AUTH_ENABLED=false bypass
    - _Requirements: 1.1, 1.2, 4.2, 4.3_

  - [x] 8.2 Create requireAuth middleware
    - Create `src/adapters/rest/auth/requireAuth.ts`
    - Check for `req.user` presence
    - Return 401 if not authenticated
    - Use generic `AuthenticatedUser` type
    - _Requirements: 1.2, 5.2, 5.3, 8.1_

  - [x] 8.3 Create requireGameParticipant middleware
    - Check user is participant in game
    - Return 403 if not authorized
    - Use domain logic for authorization
    - _Requirements: 6.3, 8.5_

  - [x] 8.4 Write unit tests for middleware (RED)
    - Test clerkMiddleware with valid Clerk session
    - Test clerkMiddleware with invalid session
    - Test AUTH_ENABLED=false bypass
    - Test requireAuth with authenticated and unauthenticated requests
    - Test requireGameParticipant authorization logic
    - Verify tests FAIL before implementation
    - _Requirements: 1.1, 1.2, 4.3, 6.3, 9.4_

  - [x] 8.5 Write property test for auth bypass (RED)
    - **Property 1: Authentication bypass when disabled**
    - **Validates: Requirements 1.1**
    - Test that any request succeeds when AUTH_ENABLED=false
    - Verify test FAILS before implementation
    - _Requirements: 1.1_

  - [x] 8.6 Write property test for auth enforcement (RED)
    - **Property 2: Authentication enforcement when enabled**
    - **Validates: Requirements 1.2, 5.5, 7.2**
    - Test that any protected route rejects unauthenticated requests
    - Verify test FAILS before implementation
    - _Requirements: 1.2_

  - [x] 8.7 Write property test for request context population (RED)
    - **Property 8: Request context population**
    - **Validates: Requirements 4.3**
    - Test that any authenticated request has user context
    - Verify test FAILS before implementation
    - _Requirements: 4.3_

- [x] 9. Integrate authentication middleware into Express app (GREEN)
  - Update `createApp()` to add Clerk middleware
  - Apply middleware before route handlers
  - Ensure middleware order: logging → Clerk → routes
  - Handle AUTH_ENABLED configuration
  - Make tests from 8.4-8.7 pass
  - _Requirements: 1.1, 1.2, 4.2_

- [x] 9.1 Write integration tests for middleware integration (RED)
  - Test middleware is applied in correct order
  - Test authenticated requests flow through middleware
  - Test unauthenticated requests are rejected
  - Verify tests FAIL before implementation
  - _Requirements: 1.2, 9.5_

- [x] 10. Update game routes to use authentication
  - [x] 10.1 Protect game creation endpoint
    - Apply `requireAuth` middleware to POST /api/games
    - Extract `req.user` in route handler
    - Pass user to GameManagerService
    - _Requirements: 5.2, 6.2_

  - [x] 10.2 Protect game move endpoint
    - Apply `requireAuth` and `requireGameParticipant` to POST /api/games/:gameId/moves
    - Validate user is participant
    - _Requirements: 5.3, 6.3_

  - [x] 10.3 Keep game retrieval public
    - Do NOT apply requireAuth to GET /api/games/:gameId
    - Allow spectators to view games
    - _Requirements: 5.4_

  - [x] 10.4 Write integration tests for protected routes (RED)
    - Test game creation requires authentication
    - Test game moves require authentication and participation
    - Test game retrieval works without authentication
    - Verify tests FAIL before implementation
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 10.5 Write property test for game ownership (RED)
    - **Property 10: Game ownership association**
    - **Validates: Requirements 6.2**
    - Test that any game created by authenticated user is associated with that user
    - Verify test FAILS before implementation
    - _Requirements: 6.2_

  - [x] 10.6 Write property test for game participant authorization (RED)
    - **Property 11: Game participant authorization**
    - **Validates: Requirements 6.3**
    - Test that any move by non-participant is rejected
    - Verify test FAILS before implementation
    - _Requirements: 6.3_

- [x] 11. Update GameManagerService to handle authenticated users
  - [x] 11.1 Update createGame method
    - Accept optional `creatorPlayerId` parameter
    - Associate game with creator when provided
    - Store creator_player_id in database
    - _Requirements: 6.2_

  - [x] 11.2 Update makeMove method
    - Accept `playerId` parameter
    - Validate player is participant in game
    - Return 403 error if not authorized
    - _Requirements: 6.3_

  - [x] 11.3 Write unit tests for GameManagerService changes (RED)
    - Test createGame with and without creator
    - Test makeMove authorization logic
    - Test makeMove rejection for non-participants
    - Verify tests FAIL before implementation
    - _Requirements: 6.2, 6.3_

- [x] 12. Implement error handling for authentication
  - [x] 12.1 Create authentication error types
    - Create `AuthenticationRequiredError` (401)
    - Create `InvalidTokenError` (401)
    - Create `ForbiddenError` (403)
    - Add to domain errors
    - _Requirements: 8.1, 8.2, 8.5_

  - [x] 12.2 Update error handler middleware
    - Handle authentication errors
    - Return appropriate status codes and messages
    - Log errors without exposing sensitive data
    - _Requirements: 8.1, 8.2, 8.5, 8.6_

  - [x] 12.3 Write unit tests for error handling (RED)
    - Test error responses for missing token
    - Test error responses for invalid token
    - Test error responses for forbidden access
    - Test error logging
    - Verify tests FAIL before implementation
    - _Requirements: 8.1, 8.2, 8.5, 8.6_

  - [x] 12.4 Write property test for auth failure logging (RED)
    - **Property 15: Authentication failure logging**
    - **Validates: Requirements 8.6**
    - Test that any auth failure is logged without sensitive data
    - Verify test FAILS before implementation
    - _Requirements: 8.6_

- [x] 13. Checkpoint - Ensure all backend tests pass
  - Run full test suite: `npm run test:run`
  - Verify all authentication tests pass
  - Verify existing tests still pass
  - Fix any broken tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Set up Clerk in web client
  - [x] 14.1 Install and configure Clerk React
    - Install `@clerk/clerk-react` in web-client
    - Create Clerk provider wrapper
    - Add `VITE_CLERK_PUBLISHABLE_KEY` to web-client `.env`
    - Wrap App with `<ClerkProvider>`
    - _Requirements: 11.1, 11.2_

  - [x] 14.2 Add Clerk components to UI
    - Add `<SignIn>` component to login page/modal
    - Add `<UserButton>` component to header
    - Add `<SignedIn>` and `<SignedOut>` conditional rendering
    - _Requirements: 11.1_

  - [x] 14.3 Update API client to include Clerk token
    - Modify `gameClient.ts` to get Clerk session token
    - Include token in Authorization header
    - Handle token expiration
    - _Requirements: 11.4_

  - [x] 14.4 Write tests for web client auth integration (RED)
    - Test Clerk provider setup
    - Test authenticated API requests include token
    - Test unauthenticated state
    - Verify tests FAIL before implementation
    - _Requirements: 11.1, 11.4_

- [x] 15. Update web client UI for authentication
  - [x] 15.1 Add authentication state to UI
    - Show login button when signed out
    - Show user button when signed in
    - Conditionally show "Create Game" based on auth
    - _Requirements: 11.1_

  - [x] 15.2 Handle authentication errors in UI
    - Show error messages for 401 responses
    - Prompt re-authentication on token expiration
    - Handle 403 forbidden errors
    - _Requirements: 11.5_

  - [x] 15.3 Write tests for UI authentication state (RED)
    - Test UI shows correct state when signed in/out
    - Test error handling for auth failures
    - Verify tests FAIL before implementation
    - _Requirements: 11.1, 11.5_

- [x] 16. Update documentation
  - Update README with Clerk setup instructions
  - Document environment variables
  - Add authentication section to API documentation
  - Document how to disable auth for local development
  - _Requirements: 1.1, 7.1_

- [ ] 17. Final checkpoint - End-to-end testing
  - Test complete authentication flow manually
  - Test game creation with authentication
  - Test game moves with authorization
  - Test public game viewing
  - Test AUTH_ENABLED=false mode
  - Ensure all tests pass, ask the user if questions arise.

## Testing Strategy

### TDD Red-Green-Refactor Workflow

**CRITICAL**: Every implementation task MUST follow this workflow:

1. **RED**: Write failing tests first
   - Tests should fail because implementation doesn't exist yet
   - Verify tests actually fail (don't skip this!)
   - Tests define the expected behavior

2. **GREEN**: Write minimal code to make tests pass
   - Implement just enough to pass the tests
   - Don't add extra features
   - Get to green as quickly as possible

3. **REFACTOR**: Improve code quality while keeping tests green
   - Clean up implementation
   - Remove duplication
   - Improve naming and structure
   - Tests must stay green throughout

### Unit Tests (Required)
- Configuration loading and validation
- PlayerIdentity model and repository
- ClerkAuthenticationService (with mocked Clerk SDK)
- Authentication middleware
- Error handling
- GameManagerService authorization logic

### Property-Based Tests (Required)
Each property test will run 100+ iterations using fast-check:

1. **Property 1**: Auth bypass when disabled (Requirements 1.1)
2. **Property 2**: Auth enforcement when enabled (Requirements 1.2)
3. **Property 5**: OAuth provider data persistence (Requirements 2.7)
4. **Property 8**: Request context population (Requirements 4.3)
5. **Property 9**: PlayerIdentity creation (Requirements 6.1)
6. **Property 10**: Game ownership association (Requirements 6.2)
7. **Property 11**: Game participant authorization (Requirements 6.3)
8. **Property 12**: PlayerIdentity structure (Requirements 6.4)
9. **Property 15**: Auth failure logging (Requirements 8.6)

### Integration Tests (Required)
- Middleware integration in Express app
- Protected route enforcement
- Game creation and move authorization
- Web client authentication flow

### Manual Testing (Required)
- Complete OAuth flow with Discord/Google/GitHub
- Game creation and moves with authentication
- Public game viewing without authentication
- AUTH_ENABLED=false development mode

## Notes

- **TDD is mandatory**: Write tests BEFORE implementation
- All Clerk-specific code must stay in `src/adapters/rest/auth/clerk/`
- Domain and application layers must use generic interfaces only
- Tests should mock Clerk SDK to avoid external dependencies
- Property tests should use fast-check generators
- Verify tests fail in RED phase before implementing
- All tests must pass before moving to next task
- Commit after each major task completion with all tests passing
