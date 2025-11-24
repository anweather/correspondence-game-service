# Requirements Document

## Introduction

This document specifies the requirements for adding authentication and authorization to the Async Boardgame Service. The system shall support optional authentication that is enabled in Docker/production environments but disabled by default in local development. The implementation shall follow hexagonal architecture principles to minimize changes to the application core and maintain clean separation of concerns.

## Glossary

- **Authentication Service**: The component responsible for verifying user identity
- **Authorization Middleware**: Express middleware that validates authentication tokens and enforces access control
- **JWT (JSON Web Token)**: A compact, URL-safe token format used for authentication
- **OAuth Provider**: An external service (Discord, Google, GitHub) that handles user authentication
- **Simple Token Auth**: A lightweight authentication mechanism using API keys or bearer tokens
- **Protected Route**: An API endpoint that requires valid authentication
- **Public Route**: An API endpoint accessible without authentication
- **Auth Adapter**: The hexagonal architecture adapter that implements authentication logic
- **Player Identity**: The domain model representing an authenticated user
- **Auth Config**: Configuration settings that control authentication behavior based on environment

## Authentication Options Analysis

### Option 1: Simple Token Authentication (Recommended for MVP)

**Description**: Users receive a static API key or generate a JWT token through a simple login endpoint. Tokens are validated via middleware.

**Pros**:
- Simplest to implement (1-2 days)
- No external dependencies or OAuth flows
- Full control over token lifecycle
- Easy to test and debug
- Minimal configuration required
- Works well for API-first applications
- Can be extended to OAuth later

**Cons**:
- No built-in user management UI
- Manual token distribution for initial users
- Less user-friendly than OAuth (no "Login with X" button)
- Requires implementing token generation/validation logic

**Best For**: MVP, API-first applications, internal tools, when you want full control

### Option 2: Discord OAuth

**Description**: Users authenticate via Discord's OAuth2 flow. The service exchanges authorization codes for access tokens and retrieves user information.

**Pros**:
- Great for gaming communities already on Discord
- Users can login with existing Discord accounts
- Discord provides user profile information (username, avatar)
- Well-documented OAuth2 implementation
- No password management required

**Cons**:
- Requires Discord application registration
- More complex OAuth2 flow implementation
- External dependency on Discord's availability
- Requires callback URL configuration
- More difficult to test locally
- Overkill if users aren't Discord-focused

**Best For**: Gaming communities, Discord-integrated applications, social features

### Option 3: Generic OAuth (Google, GitHub, etc.)

**Description**: Support multiple OAuth providers through a generic OAuth2 client library (e.g., Passport.js).

**Pros**:
- Users can choose their preferred provider
- Leverages existing accounts (Google, GitHub, etc.)
- Passport.js provides standardized interface
- No password management required
- Professional authentication UX

**Cons**:
- Most complex to implement (3-5 days)
- Requires multiple provider registrations
- More configuration and environment variables
- Heavier dependencies (Passport.js + strategies)
- More testing complexity
- Callback URL management for each provider

**Best For**: Public-facing applications, when user choice matters, enterprise applications

## Requirements

### Requirement 1: Environment-Based Authentication Control

**User Story**: As a developer, I want authentication to be disabled by default in local development but enabled in Docker/production environments, so that I can develop quickly locally while maintaining security in deployed environments.

#### Acceptance Criteria

1. WHEN the AUTH_ENABLED environment variable is set to "false" or not set THEN the system SHALL allow all API requests without authentication
2. WHEN the AUTH_ENABLED environment variable is set to "true" THEN the system SHALL enforce authentication on protected routes
3. WHEN running in Docker with AUTH_ENABLED set to "true" THEN the system SHALL require valid authentication tokens for protected API endpoints
4. WHEN authentication is disabled THEN the system SHALL log a warning message indicating that authentication is disabled
5. WHERE authentication is enabled, WHEN the required authentication configuration is missing THEN the system SHALL fail to start and log a clear error message

### Requirement 2: OAuth Authentication Implementation

**User Story**: As a user, I want to authenticate using my existing Discord, Google, or GitHub account, so that I can access the service without creating new credentials.

#### Acceptance Criteria

1. WHEN a user initiates OAuth login with a supported provider THEN the system SHALL redirect to the provider's authorization page
2. WHEN a user completes OAuth authorization THEN the system SHALL exchange the authorization code for an access token
3. WHEN OAuth authentication succeeds THEN the system SHALL create a session and return a JWT token to the client
4. WHEN a request includes a valid JWT session token in the Authorization header THEN the system SHALL authenticate the request and extract user identity
5. WHEN a request includes an invalid or expired JWT token THEN the system SHALL reject the request with a 401 Unauthorized status
6. THE system SHALL support Discord, Google, and GitHub as OAuth providers
7. THE system SHALL store OAuth provider information (provider name, provider user ID) with the Player Identity

### Requirement 3: OAuth Flow and Callback Handling

**User Story**: As a user, I want a smooth OAuth login experience with proper callback handling, so that I can authenticate securely and be redirected back to the application.

#### Acceptance Criteria

1. THE system SHALL provide OAuth initiation endpoints for each supported provider (e.g., /auth/discord, /auth/google, /auth/github)
2. THE system SHALL provide OAuth callback endpoints for each supported provider (e.g., /auth/discord/callback)
3. WHEN an OAuth callback is received with a valid authorization code THEN the system SHALL exchange it for user profile information
4. WHEN OAuth authentication succeeds THEN the system SHALL redirect the user to the web client with a session token
5. WHEN OAuth authentication fails THEN the system SHALL redirect to an error page with a descriptive message
6. THE system SHALL validate OAuth state parameters to prevent CSRF attacks
7. THE system SHALL handle OAuth errors gracefully and provide user-friendly error messages

### Requirement 4: Hexagonal Architecture Integration

**User Story**: As a developer, I want authentication implemented as an adapter in the hexagonal architecture, so that the domain and application layers remain independent of authentication mechanisms.

#### Acceptance Criteria

1. THE authentication logic SHALL be implemented in the adapters layer without modifying domain models
2. THE authentication middleware SHALL be applied at the REST adapter level
3. WHEN authentication is required THEN the middleware SHALL populate request context with authenticated user identity
4. THE domain layer SHALL remain agnostic to authentication implementation details
5. THE system SHALL support swapping authentication strategies without modifying application or domain code

### Requirement 5: Protected and Public Route Configuration

**User Story**: As a developer, I want to designate which routes require authentication, so that I can protect sensitive operations while keeping public endpoints accessible.

#### Acceptance Criteria

1. THE system SHALL allow health check endpoints to remain public regardless of authentication settings
2. THE system SHALL protect game creation endpoints when authentication is enabled
3. THE system SHALL protect game move endpoints when authentication is enabled
4. THE system SHALL allow game state retrieval endpoints to remain public for spectators
5. WHERE authentication is enabled, WHEN a request to a protected route is made without valid authentication THEN the system SHALL return a 401 status with a clear error message

### Requirement 6: User Identity Management

**User Story**: As a player, I want my identity to be associated with my game actions, so that my moves and games are tracked under my account.

#### Acceptance Criteria

1. WHEN a user authenticates successfully THEN the system SHALL create or retrieve a Player Identity record
2. WHEN an authenticated user creates a game THEN the system SHALL associate the game with the user's Player Identity
3. WHEN an authenticated user makes a move THEN the system SHALL validate that the user is a participant in the game
4. THE Player Identity SHALL include a unique identifier, username, OAuth provider, provider user ID, and authentication metadata
5. THE system SHALL persist Player Identity records across sessions

### Requirement 7: Authentication Configuration Management

**User Story**: As a system administrator, I want to configure authentication through environment variables, so that I can deploy the service with appropriate security settings.

#### Acceptance Criteria

1. THE system SHALL read authentication settings from environment variables at startup
2. THE system SHALL support AUTH_ENABLED to toggle authentication on/off
3. WHERE OAuth is enabled, THE system SHALL require JWT_SECRET, SESSION_SECRET, and provider-specific credentials (client ID, client secret, callback URL)
4. THE system SHALL support JWT_EXPIRATION environment variable to configure session token lifetime
5. THE system SHALL validate that at least one OAuth provider is properly configured when authentication is enabled
6. WHEN authentication configuration is invalid THEN the system SHALL fail fast at startup with descriptive error messages
7. THE system SHALL support enabling/disabling individual OAuth providers through configuration

### Requirement 8: Authentication Error Handling

**User Story**: As an API consumer, I want clear error messages when authentication fails, so that I can understand and fix authentication issues.

#### Acceptance Criteria

1. WHEN authentication fails due to missing token THEN the system SHALL return a 401 status with message "Authentication required"
2. WHEN authentication fails due to invalid token THEN the system SHALL return a 401 status with message "Invalid authentication token"
3. WHEN authentication fails due to expired token THEN the system SHALL return a 401 status with message "Authentication token expired"
4. WHEN OAuth authentication fails THEN the system SHALL redirect to an error page with a user-friendly message
5. WHEN a user attempts to access a game they are not authorized for THEN the system SHALL return a 403 status with message "Forbidden: Not a participant in this game"
6. THE system SHALL log authentication failures with sufficient detail for debugging without exposing sensitive information

### Requirement 9: Testing Support for Authentication

**User Story**: As a developer, I want to easily test authenticated endpoints, so that I can write comprehensive tests without complex authentication setup.

#### Acceptance Criteria

1. WHEN running tests THEN the system SHALL default to authentication disabled unless explicitly enabled
2. THE system SHALL provide test utilities for generating valid test tokens
3. THE system SHALL provide test utilities for creating authenticated test requests
4. THE system SHALL support mocking Passport strategies in unit tests
5. THE system SHALL include integration tests that verify OAuth flow and authentication enforcement

### Requirement 10: OAuth Provider Extensibility

**User Story**: As a developer, I want to easily add new OAuth providers, so that we can support additional authentication methods without major refactoring.

#### Acceptance Criteria

1. THE authentication system SHALL use Passport.js to provide a standardized interface for OAuth providers
2. THE system SHALL support adding new OAuth providers by registering additional Passport strategies
3. THE system SHALL maintain a registry of configured OAuth providers
4. THE Player Identity model SHALL support multiple OAuth provider associations per user
5. THE system SHALL allow users to link multiple OAuth providers to a single Player Identity

### Requirement 11: Web Client Integration

**User Story**: As a user, I want to see login options in the web client, so that I can authenticate before creating or joining games.

#### Acceptance Criteria

1. THE web client SHALL display login buttons for each configured OAuth provider
2. WHEN a user clicks a provider login button THEN the system SHALL initiate the OAuth flow
3. WHEN OAuth authentication completes THEN the web client SHALL store the session token
4. THE web client SHALL include the session token in all API requests to protected endpoints
5. WHEN a session token expires THEN the web client SHALL prompt the user to re-authenticate

## Recommended Implementation Approach

**This Spec**: Implement Generic OAuth with Multiple Providers
- Use Passport.js for standardized OAuth2 implementation
- Support Discord, Google, and GitHub providers initially
- Professional authentication UX with "Login with X" buttons
- Extensible architecture for adding more providers
- Leverages existing accounts (no password management)

**Supported Providers**:
- **Discord**: Primary provider for gaming communities
- **Google**: Broad user base, familiar login flow
- **GitHub**: Developer-friendly, great for technical users

All providers will be supported through Passport.js strategies, providing a consistent interface and allowing users to choose their preferred authentication method.

## Non-Functional Requirements

### Security
- JWT tokens SHALL use strong cryptographic signing (HS256 minimum)
- JWT secrets SHALL be at least 32 characters long
- Token expiration SHALL default to 24 hours
- Passwords (if stored) SHALL be hashed using bcrypt with cost factor 10+

### Performance
- Authentication middleware SHALL add less than 10ms latency per request
- Token validation SHALL not require database queries for every request
- JWT validation SHALL use in-memory signature verification

### Maintainability
- Authentication code SHALL be isolated in the adapters layer
- Authentication logic SHALL have 80%+ test coverage
- Configuration SHALL be documented in README and .env.example


## Managed Authentication Solutions Analysis

### Overview

Before implementing a custom OAuth solution, we evaluated managed authentication services (Clerk and Auth0) that handle authentication infrastructure. Here's the analysis:

### Clerk

**What It Is**:
- Fully managed authentication service
- Pre-built UI components for sign-in/sign-up
- Backend SDK for Express.js
- Handles all OAuth provider integrations
- User management dashboard

**Pros**:
- ✅ Extremely fast implementation (hours vs days)
- ✅ Pre-built, beautiful UI components
- ✅ Handles all OAuth complexity (Discord, Google, GitHub, etc.)
- ✅ Free tier: 10,000 MAUs (Monthly Active Users)
- ✅ Automatic security updates and compliance
- ✅ Built-in features: MFA, webhooks, user metadata
- ✅ No HTTPS/domain requirements for development
- ✅ Express.js SDK available
- ✅ Minimal code changes to integrate

**Cons**:
- ❌ External dependency (vendor lock-in)
- ❌ Costs scale with users ($25/mo for Pro, then per-user pricing)
- ❌ Less control over authentication flow
- ❌ Requires internet connectivity to Clerk's servers
- ❌ Data stored on Clerk's infrastructure
- ❌ Free tier limited to 3 social connections
- ❌ Custom branding requires paid plan

**Pricing**:
- Free: 10,000 MAUs, 3 social connections, basic features
- Pro: $25/mo + usage, unlimited social connections, MFA, custom branding
- Enterprise: Custom pricing, SLA, HIPAA compliance

**Integration Effort**: 2-4 hours
- Install `@clerk/express`
- Add middleware to Express app
- Add Clerk components to React frontend
- Configure OAuth providers in Clerk dashboard

### Auth0

**What It Is**:
- Enterprise-grade authentication platform (owned by Okta)
- Supports OAuth, SAML, LDAP, and more
- Extensive customization options
- Backend SDKs for multiple languages

**Pros**:
- ✅ Enterprise-proven solution
- ✅ Extensive protocol support (OAuth, SAML, LDAP)
- ✅ Free tier: 7,500 MAUs
- ✅ Highly customizable
- ✅ Strong compliance and security features
- ✅ Good documentation
- ✅ Node.js SDK available

**Cons**:
- ❌ More complex setup than Clerk
- ❌ Steeper learning curve
- ❌ Pricing can get expensive quickly
- ❌ UI customization requires more work
- ❌ External dependency (vendor lock-in)
- ❌ Overkill for simple use cases

**Pricing**:
- Free: 7,500 MAUs, basic features
- Essentials: $35/mo + $0.05/MAU, advanced features
- Professional: $240/mo + usage, enterprise features
- Enterprise: Custom pricing

**Integration Effort**: 4-8 hours
- More configuration required
- More complex than Clerk
- More flexibility but more setup

### Custom OAuth Implementation (Original Plan)

**What It Is**:
- Build authentication from scratch using Passport.js
- Full control over implementation
- Self-hosted solution

**Pros**:
- ✅ No external dependencies or vendor lock-in
- ✅ Complete control over authentication flow
- ✅ No per-user costs
- ✅ Data stays on your infrastructure
- ✅ Can work offline/air-gapped
- ✅ Learning experience
- ✅ Customizable to exact needs

**Cons**:
- ❌ Significant development time (3-5 days)
- ❌ Ongoing maintenance burden
- ❌ Security responsibility on your team
- ❌ Need to handle OAuth provider registration
- ❌ Need to implement UI components
- ❌ Need to handle edge cases and errors
- ❌ HTTPS/domain requirements for production

**Cost**: Developer time only (no recurring fees)

**Integration Effort**: 3-5 days
- Implement authentication service
- Configure Passport.js strategies
- Build middleware
- Create auth routes
- Implement UI components
- Write comprehensive tests
- Handle error cases

### Recommendation

**For This Project**: **Custom OAuth Implementation (Original Plan)**

**Reasoning**:
1. **Learning Value**: Building authentication from scratch provides deep understanding of OAuth flows and security
2. **No Vendor Lock-in**: Complete control over authentication logic and data
3. **Cost**: No recurring fees, only development time
4. **Flexibility**: Can customize exactly to project needs
5. **Hexagonal Architecture**: Fits perfectly with the existing architecture
6. **Educational**: This appears to be a learning/portfolio project where understanding the implementation is valuable

**When to Consider Managed Solutions**:
- **Production SaaS**: If building a commercial product where time-to-market matters
- **Team Constraints**: If team lacks authentication expertise
- **Compliance Needs**: If you need SOC 2, HIPAA, or other certifications
- **Scale**: If you expect rapid user growth and want to offload infrastructure
- **Enterprise Features**: If you need SAML, LDAP, or advanced SSO

**Hybrid Approach** (Future Consideration):
- Start with custom OAuth (this spec)
- Build with clean interfaces (hexagonal architecture)
- If project grows, migration to Clerk/Auth0 is possible
- The authentication adapter layer makes swapping implementations easier

### Implementation Decision

**Proceed with Clerk while maintaining Hexagonal Architecture**

**Rationale**:
- **Speed**: 2-4 hours vs 3-5 days implementation time
- **Prototype Fast**: Get authentication working quickly to focus on game features
- **Hexagonal Architecture**: Implement Clerk as an adapter, keeping domain/application layers clean
- **Future Flexibility**: Clean interfaces allow swapping to custom OAuth or Auth0 later
- **Production Ready**: Clerk handles security, compliance, and edge cases
- **Free Tier**: 10,000 MAUs is plenty for initial deployment

**Architecture Approach**:
- Clerk SDK lives in the adapters layer only
- Domain layer remains Clerk-agnostic
- Application layer uses generic authentication interfaces
- Can swap Clerk for custom OAuth without changing domain/application code
- Best of both worlds: speed + clean architecture
