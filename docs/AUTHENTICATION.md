# Authentication Guide

This guide explains how authentication works in the Async Boardgame Service and how to configure it for different environments.

## Overview

The service uses [Clerk](https://clerk.com) as a managed authentication service, providing:
- OAuth integration with Discord, Google, and GitHub
- Session management and token validation
- User identity management
- Pre-built UI components for sign-in/sign-up

Authentication is **optional** and controlled via environment variables, allowing:
- **Local Development**: Authentication disabled by default for rapid development
- **Production**: Authentication enabled for secure user management

## Architecture

The authentication implementation follows hexagonal architecture principles:

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Client (React)                        │
│  - Clerk React components (<SignIn>, <UserButton>)         │
│  - Automatic token management                               │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP + Authorization header
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    REST Adapter Layer                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Clerk Adapter (src/adapters/rest/auth/clerk/)      │  │
│  │  - ClerkAuthenticationService                        │  │
│  │  - Implements generic AuthenticationService          │  │
│  │  - Maps Clerk User to domain PlayerIdentity          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Authentication Middleware                            │  │
│  │  - Validates Clerk session tokens                    │  │
│  │  - Populates generic req.user                        │  │
│  │  - Optional based on AUTH_ENABLED                    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Application & Domain Layers                     │
│  - Authentication-agnostic                                  │
│  - Uses generic AuthenticatedUser interface                 │
│  - No Clerk dependencies                                    │
└─────────────────────────────────────────────────────────────┘
```

**Key Design Principles:**
- Clerk is isolated in the adapters layer
- Domain and application layers remain authentication-agnostic
- Can swap Clerk for other providers without changing core logic
- Clean separation of concerns

## Configuration

### Environment Variables

**Backend (.env):**
```bash
# Enable/disable authentication
AUTH_ENABLED=false  # false for development, true for production

# Clerk API keys (required when AUTH_ENABLED=true)
CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
```

**Web Client (web-client/.env):**
```bash
# Clerk publishable key (same as backend)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

### Configuration Modes

#### Development Mode (Default)
```bash
AUTH_ENABLED=false
```

**Behavior:**
- No authentication required for any endpoints
- No Clerk configuration needed
- Player IDs can be any string value
- Ideal for local development and testing
- Warning logged on startup

#### Production Mode
```bash
AUTH_ENABLED=true
CLERK_PUBLISHABLE_KEY=pk_live_your_key
CLERK_SECRET_KEY=sk_live_your_key
```

**Behavior:**
- Protected endpoints require valid Clerk session tokens
- User identities managed through Clerk
- OAuth providers: Discord, Google, GitHub
- Automatic player identity creation/retrieval

## Setup Instructions

### For Local Development (No Authentication)

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Verify AUTH_ENABLED is false:**
   ```bash
   # In .env
   AUTH_ENABLED=false
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

4. **Make API requests without authentication:**
   ```bash
   curl -X POST http://localhost:3000/api/games \
     -H "Content-Type: application/json" \
     -d '{"gameType": "tic-tac-toe"}'
   ```

### For Production (With Authentication)

#### Step 1: Create Clerk Account

1. Go to [https://clerk.com](https://clerk.com)
2. Sign up for a free account
3. Create a new application
4. Choose a name for your application

#### Step 2: Configure OAuth Providers

1. In Clerk dashboard, go to **Configure > Social Connections**
2. Enable the providers you want to support:
   - **Discord**: Great for gaming communities
   - **Google**: Broad user base
   - **GitHub**: Developer-friendly
3. For each provider:
   - Click "Enable"
   - Follow Clerk's instructions to configure OAuth credentials
   - Set redirect URLs (Clerk handles this automatically)

#### Step 3: Get API Keys

1. In Clerk dashboard, go to **Configure > API Keys**
2. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

**Important:**
- Use test keys (`pk_test_*`, `sk_test_*`) for development
- Use live keys (`pk_live_*`, `sk_live_*`) for production
- Never commit secret keys to version control

#### Step 4: Configure Backend

1. **Update .env:**
   ```bash
   AUTH_ENABLED=true
   CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   CLERK_SECRET_KEY=sk_test_your_secret_key_here
   ```

2. **Restart the server:**
   ```bash
   npm run dev
   ```

3. **Verify authentication is enabled:**
   - Check logs for "Authentication enabled" message
   - Try accessing protected endpoint without token (should get 401)

#### Step 5: Configure Web Client

1. **Update web-client/.env:**
   ```bash
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   ```

2. **Start web client:**
   ```bash
   cd web-client
   npm run dev
   ```

3. **Test authentication:**
   - Open http://localhost:5173
   - Click "Sign In"
   - Authenticate with OAuth provider
   - Create a game (should work with authentication)

## API Endpoints

### Protected Endpoints

When `AUTH_ENABLED=true`, these endpoints require authentication:

- `POST /api/games` - Create a new game
- `POST /api/games/:gameId/moves` - Make a move
- `POST /api/games/:gameId/join` - Join a game

**Authorization Rules:**
- Game moves require the user to be a participant in the game
- Returns 403 Forbidden if user is not authorized

### Public Endpoints

These endpoints are always public (no authentication required):

- `GET /api/games` - List games
- `GET /api/games/:gameId` - View game state
- `GET /api/games/:gameId/board.svg` - View board rendering
- `GET /api/games/:gameId/board.png` - View board rendering
- `GET /api/games/:gameId/moves` - View move history
- `GET /api/game-types` - List available game types
- `GET /health` - Health check

## Authentication Flow

### User Authentication Flow

1. **User clicks "Sign In" in web client**
2. **Clerk displays OAuth provider options** (Discord, Google, GitHub)
3. **User selects provider and authorizes**
4. **Clerk creates session and returns token**
5. **Web client stores token** (handled automatically by Clerk React)
6. **Web client includes token in API requests** (Authorization header)
7. **Backend validates token with Clerk**
8. **Backend creates/retrieves PlayerIdentity**
9. **Request proceeds with authenticated user context**

### Token Validation Flow

```
API Request
    │
    ▼
┌─────────────────────┐
│ Clerk Middleware    │
│ - Extract token     │
│ - Validate with     │
│   Clerk service     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Valid Token?        │
└──┬──────────────┬───┘
   │ Yes          │ No
   ▼              ▼
┌──────────┐  ┌──────────┐
│ Populate │  │ Return   │
│ req.user │  │ 401      │
└────┬─────┘  └──────────┘
     │
     ▼
┌─────────────────────┐
│ Authorization       │
│ Middleware          │
│ - Check if user is  │
│   game participant  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Route Handler       │
│ - Process request   │
│ - Use req.user      │
└─────────────────────┘
```

## Making Authenticated Requests

### From Web Client

The web client handles authentication automatically using Clerk React components:

```typescript
import { useAuth } from '@clerk/clerk-react';

function CreateGame() {
  const { getToken } = useAuth();
  
  const createGame = async () => {
    const token = await getToken();
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gameType: 'tic-tac-toe' })
    });
    return response.json();
  };
}
```

### From curl/API Testing

1. **Get a session token:**
   - Sign in through the web client
   - Open browser developer tools
   - Get token from Clerk session (or use Clerk API)

2. **Include token in requests:**
   ```bash
   curl -X POST http://localhost:3000/api/games \
     -H "Authorization: Bearer <clerk_session_token>" \
     -H "Content-Type: application/json" \
     -d '{"gameType": "tic-tac-toe"}'
   ```

## Error Handling

### Authentication Errors

**401 Unauthorized - Missing Token:**
```json
{
  "success": false,
  "error": {
    "message": "Authentication required",
    "code": "AUTHENTICATION_REQUIRED"
  }
}
```

**401 Unauthorized - Invalid Token:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid authentication token",
    "code": "INVALID_TOKEN"
  }
}
```

**401 Unauthorized - Expired Token:**
```json
{
  "success": false,
  "error": {
    "message": "Authentication token expired",
    "code": "TOKEN_EXPIRED"
  }
}
```

### Authorization Errors

**403 Forbidden - Not a Game Participant:**
```json
{
  "success": false,
  "error": {
    "message": "Forbidden: Not a participant in this game",
    "code": "FORBIDDEN"
  }
}
```

## Testing

### Unit Testing

Authentication is tested at multiple levels:

**Domain Layer Tests:**
- PlayerIdentity model with external auth fields
- Generic authentication interfaces

**Adapter Layer Tests:**
- ClerkAuthenticationService with mocked Clerk SDK
- Authentication middleware with mocked requests
- Authorization middleware logic

**Integration Tests:**
- Full authentication flow with test tokens
- Protected route enforcement
- Public route accessibility

### Property-Based Testing

The system includes property-based tests for authentication:

- **Property 1**: Auth bypass when disabled
- **Property 2**: Auth enforcement when enabled
- **Property 5**: OAuth provider data persistence
- **Property 8**: Request context population
- **Property 9**: PlayerIdentity creation on authentication
- **Property 10**: Game ownership association
- **Property 11**: Game participant authorization
- **Property 12**: PlayerIdentity structure completeness
- **Property 15**: Authentication failure logging

### Manual Testing

**Test Authentication Disabled:**
```bash
# 1. Set AUTH_ENABLED=false in .env
# 2. Start server: npm run dev
# 3. Make request without token:
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -d '{"gameType": "tic-tac-toe"}'
# Expected: Success (200)
```

**Test Authentication Enabled:**
```bash
# 1. Set AUTH_ENABLED=true in .env
# 2. Configure Clerk keys
# 3. Start server: npm run dev
# 4. Make request without token:
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -d '{"gameType": "tic-tac-toe"}'
# Expected: 401 Unauthorized

# 5. Sign in through web client and get token
# 6. Make request with token:
curl -X POST http://localhost:3000/api/games \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"gameType": "tic-tac-toe"}'
# Expected: Success (200)
```

## Troubleshooting

### "Authentication required" error when AUTH_ENABLED=false

**Problem:** Getting 401 errors even though authentication is disabled.

**Solution:**
1. Check .env file has `AUTH_ENABLED=false`
2. Restart the server after changing .env
3. Check logs for "Authentication disabled" message

### "Invalid authentication token" error

**Problem:** Getting 401 errors with valid-looking token.

**Solution:**
1. Verify CLERK_SECRET_KEY matches your Clerk dashboard
2. Check token hasn't expired (Clerk tokens expire after 1 hour by default)
3. Ensure token is from the correct Clerk application
4. Verify token format: `Bearer <token>` in Authorization header

### "Forbidden: Not a participant in this game" error

**Problem:** Getting 403 errors when trying to make a move.

**Solution:**
1. Verify the authenticated user is actually a player in the game
2. Check the game's player list: `GET /api/games/:gameId`
3. Ensure the playerId in the move request matches the authenticated user

### Clerk keys not working

**Problem:** Server fails to start or authentication doesn't work.

**Solution:**
1. Verify keys are correct (copy-paste from Clerk dashboard)
2. Check for extra spaces or newlines in .env file
3. Use test keys (`pk_test_*`, `sk_test_*`) for development
4. Ensure keys match the same Clerk application
5. Restart server after updating keys

### Web client not showing sign-in button

**Problem:** Web client doesn't display authentication UI.

**Solution:**
1. Check web-client/.env has VITE_CLERK_PUBLISHABLE_KEY
2. Verify key matches backend CLERK_PUBLISHABLE_KEY
3. Restart web client dev server after changing .env
4. Check browser console for Clerk errors

## Security Best Practices

### Production Deployment

1. **Use Live Keys:**
   - Replace test keys with live keys from Clerk dashboard
   - Live keys start with `pk_live_*` and `sk_live_*`

2. **Secure Secret Key:**
   - Never commit CLERK_SECRET_KEY to version control
   - Use environment variables or secrets management
   - Rotate keys periodically

3. **Enable HTTPS:**
   - Use reverse proxy (nginx, traefik) for HTTPS
   - Clerk requires HTTPS for production OAuth callbacks

4. **Configure Allowed Origins:**
   - In Clerk dashboard, configure allowed origins
   - Restrict to your production domain

5. **Monitor Authentication:**
   - Review Clerk dashboard for suspicious activity
   - Monitor authentication failure logs
   - Set up alerts for unusual patterns

### Development Best Practices

1. **Use Test Keys:**
   - Always use test keys for development
   - Never use live keys in development

2. **Disable Authentication Locally:**
   - Set AUTH_ENABLED=false for rapid development
   - Enable only when testing authentication flows

3. **Don't Commit .env:**
   - Add .env to .gitignore
   - Use .env.example as template

4. **Separate Clerk Applications:**
   - Use separate Clerk applications for dev/staging/prod
   - Prevents test data mixing with production

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Express SDK](https://clerk.com/docs/references/nodejs/overview)
- [Clerk React SDK](https://clerk.com/docs/references/react/overview)
- [CLERK_SETUP_GUIDE.md](../CLERK_SETUP_GUIDE.md) - Detailed setup guide
- [API.md](./API.md) - Complete API documentation with authentication examples
- [README.md](../README.md) - Project overview and quick start

## Support

For issues or questions:
1. Check this guide and troubleshooting section
2. Review Clerk documentation
3. Check application logs for error details
4. Open an issue in the project repository
