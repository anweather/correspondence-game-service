# Design Document

## Overview

This document describes the design for adding authentication and authorization to the Async Boardgame Service using **Clerk** as a managed authentication service. The implementation maintains hexagonal architecture principles by treating Clerk as an adapter, keeping the domain and application layers authentication-agnostic. Authentication is optional and controlled via environment variables, allowing local development without authentication while enforcing security in production/Docker environments.

**Why Clerk**:
- Fast implementation (2-4 hours vs 3-5 days for custom OAuth)
- Pre-built UI components for sign-in/sign-up
- Handles OAuth complexity (Discord, Google, GitHub, etc.)
- Free tier supports 10,000 monthly active users
- Production-ready security and compliance
- Can be swapped for custom OAuth later due to hexagonal architecture

The design prioritizes minimal changes to the application core by implementing Clerk as an adapter layer concern. All Clerk-specific code resides in the adapters layer, with the domain and application layers remaining Clerk-agnostic and using generic authentication interfaces.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Web Client                            │
│  - Clerk React components (<SignIn>, <UserButton>)         │
│  - Clerk session management                                 │
│  - Authenticated API requests with Clerk token              │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    REST Adapter Layer                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Clerk Adapter (NEW)                                  │  │
│  │  - ClerkAuthenticationService                        │  │
│  │  - Implements generic AuthenticationService interface│  │
│  │  - Wraps Clerk SDK                                    │  │
│  │  - Maps Clerk User to domain PlayerIdentity          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Authentication Middleware                            │  │
│  │  - Uses Clerk's clerkMiddleware()                    │  │
│  │  - Extracts user from Clerk session                  │  │
│  │  - Populates generic req.user                        │  │
│  │  - Optional enforcement based on AUTH_ENABLED        │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Authorization Middleware                             │  │
│  │  - requireAuth() - generic interface                 │  │
│  │  - requireGameParticipant() - domain logic           │  │
│  │  - Uses generic AuthenticatedUser type               │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Application Layer                           │
│  - GameManagerService (unchanged)                           │
│  - StateManagerService (unchanged)                          │
│  - Uses generic AuthenticatedUser from request context      │
│  - No knowledge of Clerk                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                              │
│  - PlayerIdentity model (generic, no Clerk references)     │
│  - Game models (unchanged)                                  │
│  - Business logic (authentication-agnostic)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                Infrastructure Layer                          │
│  - PlayerIdentityRepository (generic interface)             │
│  - GameRepository (unchanged)                               │
│  - Database persistence                                     │
└─────────────────────────────────────────────────────────────┘

External Service (Clerk)
┌─────────────────────────────────────────────────────────────┐
│                         Clerk                                │
│  - User management                                          │
│  - OAuth provider integration                               │
│  - Session management                                       │
│  - Security and compliance                                  │
└─────────────────────────────────────────────────────────────┘
```

**Key Architectural Principles**:
1. **Clerk is an adapter**: All Clerk-specific code lives in `src/adapters/rest/auth/clerk/`
2. **Generic interfaces**: Domain and application layers use generic `AuthenticatedUser` and `AuthenticationService` interfaces
3. **Swappable**: Can replace Clerk with custom OAuth, Auth0, or any other provider by implementing the same interfaces
4. **Clean boundaries**: No Clerk imports in domain or application layers

### Authentication Flow with Clerk

```
User          Web Client       API Server      Clerk Service
 │                │                │                  │
 │  Click Login   │                │                  │
 │───────────────>│                │                  │
 │                │  Clerk <SignIn> component        │
 │                │  handles OAuth flow              │
 │                │──────────────────────────────────>│
 │                │                │                  │
 │  Authorize     │                │                  │
 │  (Discord/     │                │                  │
 │   Google/      │                │                  │
 │   GitHub)      │                │                  │
 │───────────────────────────────────────────────────>│
 │                │                │                  │
 │                │  Clerk session │                  │
 │                │  established   │                  │
 │                │<──────────────────────────────────│
 │  Authenticated │                │                  │
 │<───────────────│                │                  │
 │                │                │                  │
 │  API Request   │                │                  │
 │  with Clerk    │                │                  │
 │  session token │                │                  │
 │                │───────────────>│                  │
 │                │                │  Verify token    │
 │                │                │─────────────────>│
 │                │                │                  │
 │                │                │  User info       │
 │                │                │<─────────────────│
 │                │                │                  │
 │                │                │  Map to          │
 │                │                │  PlayerIdentity  │
 │                │                │                  │
 │                │  API Response  │                  │
 │                │<───────────────│                  │
 │  Response      │                │                  │
 │<───────────────│                │                  │
```

**Key Differences from Custom OAuth**:
- Clerk handles all OAuth provider integration
- Web client uses Clerk React components (no custom auth UI needed)
- API server validates Clerk session tokens
- Clerk manages user data, we sync to PlayerIdentity as needed

## Components and Interfaces

### 1. Authentication Configuration

**Location**: `src/config/index.ts` (extended)

```typescript
export interface AuthConfig {
  enabled: boolean;
  clerk: {
    publishableKey: string;
    secretKey: string;
  };
}

export interface AppConfig {
  // ... existing fields
  auth: AuthConfig;
}
```

**Responsibilities**:
- Load and validate Clerk configuration from environment variables
- Provide type-safe access to Clerk API keys
- Fail fast if authentication is enabled but Clerk keys are missing
- Simple configuration (just 2 keys vs multiple OAuth providers)

### 2. Generic Authentication Interfaces

**Location**: `src/domain/interfaces/authentication.ts` (NEW - domain layer)

```typescript
/**
 * Generic authenticated user representation
 * Used throughout application and domain layers
 * No knowledge of Clerk or any specific auth provider
 */
export interface AuthenticatedUser {
  id: string; // Internal player ID
  externalId: string; // Clerk user ID or other provider ID
  username: string;
  email?: string;
}

/**
 * Generic authentication service interface
 * Implemented by Clerk adapter, but could be implemented by any auth provider
 */
export interface AuthenticationService {
  /**
   * Find or create PlayerIdentity from external auth provider
   */
  findOrCreatePlayer(externalUser: ExternalAuthUser): Promise<PlayerIdentity>;

  /**
   * Get user information from external ID
   */
  getUserById(externalId: string): Promise<ExternalAuthUser | null>;
}

/**
 * External auth user (from Clerk, Auth0, custom OAuth, etc.)
 */
export interface ExternalAuthUser {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}
```

**Responsibilities**:
- Define generic authentication contracts
- Keep domain layer auth-provider-agnostic
- Enable swapping auth providers without changing domain/application code

### 3. Clerk Authentication Adapter

**Location**: `src/adapters/rest/auth/clerk/ClerkAuthenticationService.ts`

```typescript
import { clerkClient } from '@clerk/express';
import { AuthenticationService, ExternalAuthUser } from '@domain/interfaces/authentication';
import { PlayerIdentity } from '@domain/models';

/**
 * Clerk-specific implementation of AuthenticationService
 * This is the ONLY file that imports Clerk SDK
 */
export class ClerkAuthenticationService implements AuthenticationService {
  constructor(
    private playerIdentityRepository: PlayerIdentityRepository
  ) {}

  async findOrCreatePlayer(externalUser: ExternalAuthUser): Promise<PlayerIdentity> {
    // Check if player exists
    let player = await this.playerIdentityRepository.findByExternalId(
      'clerk',
      externalUser.id
    );

    if (!player) {
      // Create new player
      player = await this.playerIdentityRepository.create({
        primaryUsername: externalUser.username,
        externalAuthProvider: 'clerk',
        externalAuthId: externalUser.id,
        email: externalUser.email,
      });
    }

    return player;
  }

  async getUserById(externalId: string): Promise<ExternalAuthUser | null> {
    try {
      const clerkUser = await clerkClient.users.getUser(externalId);
      return {
        id: clerkUser.id,
        username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress || 'user',
        email: clerkUser.emailAddresses[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      };
    } catch (error) {
      return null;
    }
  }
}
```

**Responsibilities**:
- Wrap Clerk SDK
- Implement generic AuthenticationService interface
- Map Clerk User objects to domain PlayerIdentity
- Isolate all Clerk-specific code to this adapter

### 3. Authentication Middleware

**Location**: `src/adapters/rest/auth/authenticationMiddleware.ts`

```typescript
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Middleware that validates JWT tokens and populates req.user
 * If AUTH_ENABLED is false, this middleware is a no-op
 */
export function authenticationMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void;

/**
 * Middleware that requires authentication
 * Returns 401 if user is not authenticated
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void;

/**
 * Middleware that requires the authenticated user to be a participant in a game
 * Returns 403 if user is not a participant
 */
export function requireGameParticipant(gameIdParam: string = 'gameId') {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void>;
}
```

**Responsibilities**:
- Extract and validate JWT tokens from Authorization header
- Populate `req.user` with authenticated user information
- Provide composable middleware for different authorization levels
- Handle authentication errors gracefully

### 4. Passport Configuration

**Location**: `src/adapters/rest/auth/passportConfig.ts`

```typescript
/**
 * Configure Passport.js with OAuth strategies
 */
export function configurePassport(
  authConfig: AuthConfig,
  authService: AuthenticationService
): void;

/**
 * Register an OAuth strategy with Passport
 */
function registerOAuthStrategy(
  provider: string,
  config: OAuthProviderConfig,
  authService: AuthenticationService
): void;
```

**Responsibilities**:
- Initialize Passport.js with configured OAuth strategies
- Register Discord, Google, and GitHub strategies
- Configure OAuth callback handlers
- Map OAuth profiles to PlayerIdentity

### 5. Authentication Routes

**Location**: `src/adapters/rest/auth/authRoutes.ts`

```typescript
/**
 * Create authentication routes
 * - GET /auth/:provider - Initiate OAuth flow
 * - GET /auth/:provider/callback - OAuth callback handler
 * - POST /auth/logout - Logout endpoint
 * - GET /auth/me - Get current user info
 */
export function createAuthRoutes(
  authService: AuthenticationService
): express.Router;
```

**Responsibilities**:
- OAuth flow initiation endpoints
- OAuth callback handling
- Logout functionality
- Current user information endpoint

### 6. PlayerIdentity Domain Model (Extended)

**Location**: `src/domain/models/PlayerIdentity.ts` (extended)

```typescript
export interface OAuthProvider {
  provider: string; // 'discord', 'google', 'github'
  providerUserId: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  linkedAt: Date;
}

export interface PlayerIdentity {
  id: string; // Internal player ID
  primaryUsername: string;
  oauthProviders: OAuthProvider[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Responsibilities**:
- Store player identity information
- Support multiple OAuth provider associations
- Maintain audit trail (createdAt, updatedAt)

### 7. PlayerIdentityRepository (Extended)

**Location**: `src/infrastructure/persistence/PlayerIdentityRepository.ts`

```typescript
export interface PlayerIdentityRepository {
  /**
   * Find player by OAuth provider and provider user ID
   */
  findByOAuthProvider(
    provider: string,
    providerUserId: string
  ): Promise<PlayerIdentity | null>;

  /**
   * Create a new player identity
   */
  create(player: Omit<PlayerIdentity, 'id'>): Promise<PlayerIdentity>;

  /**
   * Update an existing player identity
   */
  update(player: PlayerIdentity): Promise<PlayerIdentity>;

  /**
   * Find player by internal ID
   */
  findById(id: string): Promise<PlayerIdentity | null>;

  /**
   * Link an OAuth provider to an existing player
   */
  linkOAuthProvider(
    playerId: string,
    oauthProvider: OAuthProvider
  ): Promise<PlayerIdentity>;
}
```

**Responsibilities**:
- Persist player identity data
- Query by OAuth provider credentials
- Support linking multiple OAuth providers to one player
- Handle database operations

## Data Models

### PlayerIdentity Table Schema

```sql
CREATE TABLE player_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_username VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE oauth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES player_identities(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'discord', 'google', 'github'
  provider_user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  avatar_url TEXT,
  linked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_oauth_providers_player_id ON oauth_providers(player_id);
CREATE INDEX idx_oauth_providers_lookup ON oauth_providers(provider, provider_user_id);
```

### JWT Token Payload

```typescript
interface JWTPayload {
  playerId: string;
  username: string;
  provider: string;
  providerUserId: string;
  iat: number; // Issued at
  exp: number; // Expiration
}
```

### Environment Variables

```bash
# Authentication Control
AUTH_ENABLED=true

# JWT Configuration
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRATION=24h
SESSION_SECRET=your-session-secret

# Discord OAuth
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_CALLBACK_URL=http://localhost:3000/auth/discord/callback

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, several properties are redundant or can be combined:

**Redundant Properties**:
- 1.2 and 5.5 both test that protected routes require authentication when enabled
- 1.2 and 7.2 both test AUTH_ENABLED toggle functionality
- 2.3 and 3.4 both test JWT token generation after successful OAuth
- 3.5 and 8.4 both test OAuth error redirects
- 10.4 and 10.5 both test multiple OAuth provider linking
- 2.1 and 11.2 both test OAuth flow initiation

**Combined Properties**:
- Error message properties (8.1, 8.2, 8.3, 8.5) can be combined into a single property about error response format
- Configuration validation properties (1.5, 7.3, 7.6) can be combined into a single property about startup validation
- OAuth callback properties (2.2, 3.3) can be combined into a single property about code exchange

**Unique Properties to Test**:
1. Auth bypass when disabled (1.1)
2. Auth enforcement when enabled (1.2) - covers 5.5, 7.2
3. JWT token validation (2.4)
4. Invalid token rejection (2.5)
5. OAuth provider data storage (2.7)
6. OAuth state CSRF protection (3.6)
7. Request context population (4.3)
8. PlayerIdentity creation on auth (6.1)
9. Game ownership association (6.2)
10. Game participant authorization (6.3)
11. PlayerIdentity structure (6.4)
12. JWT expiration configuration (7.4)
13. Provider enable/disable (7.7)
14. Auth failure logging (8.6)
15. Multiple provider linking (10.4) - covers 10.5
16. OAuth flow (2.1, 2.2, 2.3, 3.3, 3.4) - combined into comprehensive OAuth property

### Correctness Properties

Property 1: Authentication bypass when disabled
*For any* API request, when AUTH_ENABLED is false or not set, the request should succeed without requiring authentication headers
**Validates: Requirements 1.1**

Property 2: Authentication enforcement when enabled
*For any* protected route, when AUTH_ENABLED is true and no valid authentication token is provided, the request should be rejected with a 401 status
**Validates: Requirements 1.2, 5.5, 7.2**

Property 3: JWT token validation accepts valid tokens
*For any* valid JWT token generated by the system, when included in the Authorization header, the request should be authenticated and user identity should be extracted
**Validates: Requirements 2.4**

Property 4: Invalid token rejection
*For any* invalid or expired JWT token (malformed, wrong signature, expired), when included in a request, the system should reject it with a 401 status
**Validates: Requirements 2.5**

Property 5: OAuth provider data persistence
*For any* successful OAuth authentication, the PlayerIdentity should contain the provider name and provider user ID
**Validates: Requirements 2.7**

Property 6: OAuth state CSRF protection
*For any* OAuth callback with mismatched state parameter, the system should reject the authentication attempt
**Validates: Requirements 3.6**

Property 7: OAuth error handling
*For any* OAuth authentication failure, the system should redirect to an error page with a descriptive message
**Validates: Requirements 3.5, 3.7, 8.4**

Property 8: Request context population
*For any* authenticated request, the request context should contain the authenticated user's identity (playerId, username, provider)
**Validates: Requirements 4.3**

Property 9: PlayerIdentity creation on authentication
*For any* successful authentication, the system should create a new PlayerIdentity if one doesn't exist, or retrieve the existing one
**Validates: Requirements 6.1**

Property 10: Game ownership association
*For any* game created by an authenticated user, the game should be associated with that user's PlayerIdentity
**Validates: Requirements 6.2**

Property 11: Game participant authorization
*For any* move attempt by an authenticated user, if the user is not a participant in the game, the request should be rejected with a 403 status
**Validates: Requirements 6.3**

Property 12: PlayerIdentity structure completeness
*For any* PlayerIdentity created from OAuth, it should contain id, primaryUsername, oauthProviders array with provider/providerUserId/username, createdAt, and updatedAt
**Validates: Requirements 6.4**

Property 13: JWT expiration configuration
*For any* JWT_EXPIRATION value set in configuration, tokens generated should expire after that duration
**Validates: Requirements 7.4**

Property 14: Provider enable/disable configuration
*For any* OAuth provider with enabled=false in configuration, the provider's endpoints should return an error indicating the provider is disabled
**Validates: Requirements 7.7**

Property 15: Authentication failure logging
*For any* authentication failure, the system should log the failure with request ID and error type without exposing sensitive information (no tokens, secrets, or passwords in logs)
**Validates: Requirements 8.6**

Property 16: Multiple OAuth provider linking
*For any* PlayerIdentity, the system should support linking multiple OAuth providers (Discord, Google, GitHub) to the same player account
**Validates: Requirements 10.4, 10.5**

Property 17: Complete OAuth flow
*For any* supported OAuth provider, the complete flow (initiation → redirect → callback → code exchange → profile retrieval → JWT generation) should result in a valid session token
**Validates: Requirements 2.1, 2.2, 2.3, 3.3, 3.4**

Property 18: Configuration validation at startup
*For any* invalid authentication configuration (missing JWT_SECRET, missing provider credentials when enabled), the system should fail to start with a descriptive error message
**Validates: Requirements 1.5, 7.3, 7.6**

## Error Handling

### Authentication Errors

**Error Types**:
- `AUTHENTICATION_REQUIRED` (401): No token provided
- `INVALID_TOKEN` (401): Token is malformed or has invalid signature
- `TOKEN_EXPIRED` (401): Token has passed its expiration time
- `FORBIDDEN` (403): User is authenticated but not authorized for the resource
- `OAUTH_ERROR` (500): OAuth provider returned an error
- `CONFIGURATION_ERROR` (500): Authentication configuration is invalid

**Error Response Format**:
```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication required"
  }
}
```

**OAuth Error Handling**:
- OAuth failures redirect to: `/auth/error?message=<encoded_message>`
- Web client displays user-friendly error page
- Errors are logged with request ID for debugging

### Authorization Errors

When a user attempts to perform an action they're not authorized for:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Forbidden: Not a participant in this game"
  }
}
```

## Testing Strategy

### Unit Testing

**Authentication Service Tests**:
- JWT token generation with various payloads
- JWT token verification with valid/invalid/expired tokens
- PlayerIdentity creation from OAuth profiles
- Error handling for invalid inputs

**Middleware Tests**:
- Token extraction from Authorization header
- Request context population
- Error responses for missing/invalid tokens
- Auth bypass when AUTH_ENABLED is false

**Configuration Tests**:
- Environment variable loading
- Configuration validation
- Provider enable/disable logic
- Fail-fast behavior for invalid config

### Property-Based Testing

The system will use **fast-check** (already in package.json) for property-based testing. Each property-based test will run a minimum of 100 iterations.

**Property Test Examples**:

1. **Token Round-Trip Property**:
   - Generate random user data
   - Create JWT token
   - Verify token
   - Decoded data should match original

2. **Auth Bypass Property**:
   - Generate random API requests
   - With AUTH_ENABLED=false, all should succeed
   - With AUTH_ENABLED=true, protected routes should fail without token

3. **Invalid Token Rejection Property**:
   - Generate various invalid tokens (corrupted, expired, wrong signature)
   - All should be rejected with 401

4. **OAuth State Validation Property**:
   - Generate random state values
   - Callback with mismatched state should fail
   - Callback with matching state should succeed

### Integration Testing

**OAuth Flow Tests**:
- Mock OAuth providers (Discord, Google, GitHub)
- Test complete OAuth flow from initiation to JWT generation
- Test error scenarios (denied authorization, invalid code)

**End-to-End Authentication Tests**:
- Test protected route access without authentication
- Test protected route access with valid authentication
- Test game creation and move authorization
- Test multiple provider linking

### Test Utilities

**Location**: `tests/utils/authTestUtils.ts`

```typescript
/**
 * Generate a valid test JWT token
 */
export function generateTestToken(user: Partial<AuthenticatedUser>): string;

/**
 * Create an authenticated test request
 */
export function createAuthenticatedRequest(
  user: Partial<AuthenticatedUser>
): Partial<AuthenticatedRequest>;

/**
 * Mock Passport strategy for testing
 */
export function mockPassportStrategy(
  provider: string,
  profile: OAuthProfile
): void;
```

## Implementation Notes

### Passport.js Strategy Configuration

**Discord Strategy**:
```typescript
passport.use(
  new DiscordStrategy(
    {
      clientID: config.auth.providers.discord.clientId,
      clientSecret: config.auth.providers.discord.clientSecret,
      callbackURL: config.auth.providers.discord.callbackUrl,
      scope: ['identify', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const player = await authService.findOrCreatePlayer('discord', profile.id, {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          avatarUrl: profile.avatar,
        });
        done(null, player);
      } catch (error) {
        done(error);
      }
    }
  )
);
```

**Google Strategy**:
```typescript
passport.use(
  new GoogleStrategy(
    {
      clientID: config.auth.providers.google.clientId,
      clientSecret: config.auth.providers.google.clientSecret,
      callbackURL: config.auth.providers.google.callbackUrl,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const player = await authService.findOrCreatePlayer('google', profile.id, {
          id: profile.id,
          username: profile.displayName,
          email: profile.emails?.[0]?.value,
          avatarUrl: profile.photos?.[0]?.value,
        });
        done(null, player);
      } catch (error) {
        done(error);
      }
    }
  )
);
```

**GitHub Strategy**:
```typescript
passport.use(
  new GitHubStrategy(
    {
      clientID: config.auth.providers.github.clientId,
      clientSecret: config.auth.providers.github.clientSecret,
      callbackURL: config.auth.providers.github.callbackUrl,
      scope: ['user:email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const player = await authService.findOrCreatePlayer('github', profile.id, {
          id: profile.id,
          username: profile.username,
          email: profile.emails?.[0]?.value,
          avatarUrl: profile.photos?.[0]?.value,
        });
        done(null, player);
      } catch (error) {
        done(error);
      }
    }
  )
);
```

### JWT Token Management

**Token Generation**:
- Use `jsonwebtoken` library
- Sign with HS256 algorithm
- Include minimal payload (playerId, username, provider, providerUserId)
- Set expiration based on JWT_EXPIRATION config

**Token Verification**:
- Verify signature using JWT_SECRET
- Check expiration
- Extract and validate payload structure
- Return decoded user information

### Middleware Application Order

```typescript
app.use(express.json());
app.use(cors());
app.use(requestIdMiddleware);
app.use(requestLoggingMiddleware);
app.use(passport.initialize()); // Passport initialization
app.use(authenticationMiddleware); // JWT validation (optional based on AUTH_ENABLED)
app.use(inFlightTracker.middleware);

// Auth routes (public)
app.use('/auth', authRoutes);

// Protected routes
app.use('/api/games', requireAuth, gameRoutes);

// Public routes (spectator access)
app.get('/api/games/:gameId', gameRoutes); // No requireAuth
```

### Database Migration

**Migration File**: `src/infrastructure/persistence/migrations/003_add_authentication.sql`

```sql
-- Create player_identities table
CREATE TABLE IF NOT EXISTS player_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_username VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create oauth_providers table
CREATE TABLE IF NOT EXISTS oauth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES player_identities(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  avatar_url TEXT,
  linked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_oauth_providers_player_id ON oauth_providers(player_id);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_lookup ON oauth_providers(provider, provider_user_id);

-- Add player_id to games table (if not exists)
ALTER TABLE games ADD COLUMN IF NOT EXISTS creator_player_id UUID REFERENCES player_identities(id);
CREATE INDEX IF NOT EXISTS idx_games_creator ON games(creator_player_id);
```

### Environment-Based Configuration

**Development (.env.development)**:
```bash
# Option 1: Disable auth for fastest development
AUTH_ENABLED=false

# Option 2: Enable with Clerk test keys
AUTH_ENABLED=true
CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
```

**Docker/Production (.env.production)**:
```bash
AUTH_ENABLED=true
CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
CLERK_SECRET_KEY=sk_live_your_production_key
```

**That's it!** No OAuth provider registration, no callback URLs, no HTTPS requirements for initial setup. Clerk handles all of that.

### OAuth Provider Registration Requirements

**Important Note**: All OAuth providers have different requirements for development vs production environments. Here's what each provider actually supports:

**GitHub**:
- ✅ **Explicitly supports localhost** for OAuth redirect URIs
- ✅ Supports HTTP for localhost development
- ✅ Can use `http://localhost:PORT` or `http://127.0.0.1:PORT`
- ⚠️ **Production**: Strongly recommends HTTPS but technically allows HTTP
- Registration: https://github.com/settings/developers
- Callback URL examples:
  - Development: `http://localhost:3000/auth/github/callback` ✅
  - Production: `https://yourdomain.com/auth/github/callback` (recommended)
  - Production HTTP: `http://yourdomain.com/auth/github/callback` (allowed but not recommended)

**Discord**:
- ✅ Supports localhost for development
- ✅ Supports HTTP for localhost
- ⚠️ **Production**: Requires HTTPS for non-localhost domains
- Registration: https://discord.com/developers/applications
- Callback URL examples:
  - Development: `http://localhost:3000/auth/discord/callback` ✅
  - Production: `https://yourdomain.com/auth/discord/callback` (HTTPS required)

**Google**:
- ✅ Supports `http://localhost` and `http://127.0.0.1` for development/testing
- ❌ **Production**: Strictly requires HTTPS for any non-localhost domain
- ❌ Requires verified domain ownership for production
- ❌ Requires OAuth consent screen configuration
- Registration: https://console.cloud.google.com/apis/credentials
- Callback URL examples:
  - Development: `http://localhost:3000/auth/google/callback` ✅
  - Production: `https://yourdomain.com/auth/google/callback` (HTTPS strictly required)
- **Additional Requirements**:
  1. Verified domain ownership (via Google Search Console)
  2. Valid HTTPS certificate
  3. Public DNS name
  4. Configured OAuth consent screen with privacy policy and terms of service URLs

**Summary for Production Deployment**:

| Provider | Localhost Dev | HTTP Production | HTTPS Production | Domain Verification |
|----------|---------------|-----------------|------------------|---------------------|
| GitHub   | ✅ Yes        | ⚠️ Allowed*     | ✅ Recommended   | ❌ No               |
| Discord  | ✅ Yes        | ❌ No           | ✅ Required      | ❌ No               |
| Google   | ✅ Yes        | ❌ No           | ✅ Required      | ✅ Yes              |

*GitHub allows HTTP in production but strongly discourages it for security reasons.

**Recommended Deployment Strategy**:

**Option 1: Start with GitHub Only (Easiest)**
- GitHub is the most flexible for initial deployment
- Works with HTTP (though not recommended)
- No domain verification required
- Can deploy immediately without HTTPS setup

**Option 2: GitHub + Discord (Recommended)**
- Requires HTTPS for production
- No domain verification needed
- Good balance of security and ease of setup
- Use Let's Encrypt for free HTTPS

**Option 3: All Three Providers (Full Featured)**
- Requires HTTPS
- Requires domain verification for Google
- Requires OAuth consent screen setup
- Best for production-ready deployment

**Configuration Examples**:

**Development (All providers with localhost)**:
```bash
AUTH_ENABLED=true
JWT_SECRET=dev-secret-min-32-characters-long
JWT_EXPIRATION=24h
SESSION_SECRET=dev-session-secret

# All providers work with localhost
DISCORD_CLIENT_ID=your-discord-dev-client-id
DISCORD_CLIENT_SECRET=your-discord-dev-secret
DISCORD_CALLBACK_URL=http://localhost:3000/auth/discord/callback

GITHUB_CLIENT_ID=your-github-dev-client-id
GITHUB_CLIENT_SECRET=your-github-dev-secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

GOOGLE_CLIENT_ID=your-google-dev-client-id
GOOGLE_CLIENT_SECRET=your-google-dev-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

**Production - Option 1: GitHub Only (No HTTPS required)**:
```bash
AUTH_ENABLED=true
JWT_SECRET=<generate-secure-secret>
JWT_EXPIRATION=24h
SESSION_SECRET=<generate-secure-secret>

# GitHub works with HTTP (though HTTPS recommended)
GITHUB_CLIENT_ID=your-github-prod-client-id
GITHUB_CLIENT_SECRET=your-github-prod-secret
GITHUB_CALLBACK_URL=http://yourdomain.com/auth/github/callback

# Other providers disabled (omit credentials)
```

**Production - Option 2: GitHub + Discord (HTTPS required)**:
```bash
AUTH_ENABLED=true
JWT_SECRET=<generate-secure-secret>
JWT_EXPIRATION=24h
SESSION_SECRET=<generate-secure-secret>

DISCORD_CLIENT_ID=your-discord-prod-client-id
DISCORD_CLIENT_SECRET=your-discord-prod-secret
DISCORD_CALLBACK_URL=https://yourdomain.com/auth/discord/callback

GITHUB_CLIENT_ID=your-github-prod-client-id
GITHUB_CLIENT_SECRET=your-github-prod-secret
GITHUB_CALLBACK_URL=https://yourdomain.com/auth/github/callback

# Google disabled
```

**Production - Option 3: All Providers (HTTPS + Domain Verification)**:
```bash
AUTH_ENABLED=true
JWT_SECRET=<generate-secure-secret>
JWT_EXPIRATION=24h
SESSION_SECRET=<generate-secure-secret>

DISCORD_CLIENT_ID=your-discord-prod-client-id
DISCORD_CLIENT_SECRET=your-discord-prod-secret
DISCORD_CALLBACK_URL=https://yourdomain.com/auth/discord/callback

GOOGLE_CLIENT_ID=your-google-prod-client-id
GOOGLE_CLIENT_SECRET=your-google-prod-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback

GITHUB_CLIENT_ID=your-github-prod-client-id
GITHUB_CLIENT_SECRET=your-github-prod-secret
GITHUB_CALLBACK_URL=https://yourdomain.com/auth/github/callback
```

## Security Considerations

### JWT Security
- Use strong secrets (minimum 32 characters)
- Set reasonable expiration times (24 hours default)
- Use HS256 algorithm (symmetric signing)
- Never expose JWT_SECRET in logs or error messages

### OAuth Security
- Validate state parameter to prevent CSRF
- Use HTTPS in production for callback URLs
- Store client secrets securely (environment variables only)
- Validate OAuth provider responses

### Authorization
- Always verify game participant status before allowing moves
- Check authentication on all protected routes
- Log authorization failures for security monitoring

### Data Protection
- Never log JWT tokens or OAuth secrets
- Hash sensitive data if stored
- Use HTTPS in production
- Implement rate limiting on auth endpoints (future enhancement)

## Dependencies

**Backend Dependencies**:
```json
{
  "dependencies": {
    "@clerk/express": "^1.0.0"
  }
}
```

**Frontend Dependencies** (web-client):
```json
{
  "dependencies": {
    "@clerk/clerk-react": "^5.0.0"
  }
}
```

**Comparison to Custom OAuth**:
- Clerk: 2 packages total
- Custom OAuth: 10+ packages (passport, strategies, jsonwebtoken, express-session, etc.)

## Deployment Considerations

### HTTPS and Domain Setup

**For Production Deployment with Google OAuth**:
1. **Domain Registration**: Register a domain name (e.g., boardgames.example.com)
2. **DNS Configuration**: Point domain to your server's IP address
3. **HTTPS Certificate**: 
   - Use Let's Encrypt (free, automated)
   - Or use cloud provider's certificate service
   - Configure reverse proxy (nginx/Caddy) for HTTPS termination
4. **OAuth Provider Updates**:
   - Update callback URLs to use HTTPS domain
   - Re-register OAuth applications with production URLs
   - Update environment variables with new callback URLs

**Docker Deployment Options**:

**Option 1: Docker with Reverse Proxy (Recommended)**
```yaml
# docker-compose.yml
services:
  app:
    build: .
    environment:
      - AUTH_ENABLED=true
      - DISCORD_CALLBACK_URL=https://yourdomain.com/auth/discord/callback
      - GITHUB_CALLBACK_URL=https://yourdomain.com/auth/github/callback
      - GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
    networks:
      - app-network
  
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    networks:
      - app-network
```

**Option 2: Cloud Platform with Managed HTTPS**
- Deploy to Heroku, Railway, Render, or similar
- Platform provides automatic HTTPS
- Use platform's domain or custom domain
- Update OAuth callback URLs to platform domain

**Option 3: Start Without Google, Add Later**
- Deploy with Discord and GitHub only
- Both work without HTTPS requirements
- Add Google OAuth after HTTPS is configured
- No code changes needed, just configuration

### Initial Deployment Strategy

**Phase 1: Local Development**
- Use AUTH_ENABLED=false for fastest development
- Or enable with localhost OAuth for all three providers
- All providers support `http://localhost` for development

**Phase 2: Initial Production (GitHub Only)**
- Simplest production deployment
- GitHub technically allows HTTP (though not recommended)
- No HTTPS setup required initially
- No domain verification needed
- Can deploy to any server with public IP

**Phase 3: Add HTTPS (GitHub + Discord)**
- Set up HTTPS with Let's Encrypt or cloud provider
- Enable Discord OAuth (requires HTTPS)
- Keep GitHub for users who prefer it
- Still no domain verification needed

**Phase 4: Full Production (All Providers)**
- Verify domain ownership with Google
- Configure OAuth consent screen
- Enable Google OAuth
- Support all three authentication methods

## Future Enhancements

### Phase 2 Improvements
- Refresh token support for long-lived sessions
- Token revocation/blacklisting
- Rate limiting on authentication endpoints
- Account linking UI in web client
- Admin panel for user management

### Phase 3 Improvements
- Additional OAuth providers (Twitter, Microsoft, Apple)
- Two-factor authentication (2FA)
- API key authentication for programmatic access
- Role-based access control (RBAC)
- Audit logging for security events
