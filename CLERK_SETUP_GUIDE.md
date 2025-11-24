# Clerk Authentication Setup Guide

This guide walks you through setting up Clerk authentication for the Async Boardgame Service.

## Prerequisites

- A web browser
- An email address for creating a Clerk account
- Access to configure OAuth applications on Discord, Google, and/or GitHub (optional, but recommended)

## Step 1: Create Clerk Account

1. Navigate to [https://clerk.com](https://clerk.com)
2. Click "Start building for free" or "Sign up"
3. Create an account using your email or GitHub/Google account
4. Verify your email address if prompted

## Step 2: Create a New Clerk Application

1. After logging in, you'll be prompted to create your first application
2. Enter an application name: **"Async Boardgame Service"** (or your preferred name)
3. Choose your preferred sign-in methods:
   - ✅ **Email** (recommended for development)
   - ✅ **Discord** (for gaming communities)
   - ✅ **Google** (broad user base)
   - ✅ **GitHub** (developer-friendly)
4. Click "Create application"

## Step 3: Configure OAuth Providers

### Discord OAuth Setup

1. In Clerk dashboard, go to **Configure > SSO Connections**
2. Click on **Discord**
3. Toggle "Enable Discord" to ON
4. Clerk will provide you with:
   - Redirect URI: `https://your-clerk-domain.clerk.accounts.dev/v1/oauth_callback`
5. Go to [Discord Developer Portal](https://discord.com/developers/applications)
6. Click "New Application"
7. Name it "Async Boardgame Service"
8. Go to **OAuth2** section
9. Copy the **Client ID** and **Client Secret**
10. Add the Clerk Redirect URI to "Redirects"
11. In Clerk dashboard, paste the Discord Client ID and Client Secret
12. Click "Save"

### Google OAuth Setup

1. In Clerk dashboard, go to **Configure > SSO Connections**
2. Click on **Google**
3. Toggle "Enable Google" to ON
4. Clerk will provide you with a Redirect URI
5. Go to [Google Cloud Console](https://console.cloud.google.com)
6. Create a new project or select an existing one
7. Enable the Google+ API
8. Go to **Credentials** > **Create Credentials** > **OAuth 2.0 Client ID**
9. Configure the OAuth consent screen if prompted
10. Choose "Web application" as application type
11. Add the Clerk Redirect URI to "Authorized redirect URIs"
12. Copy the **Client ID** and **Client Secret**
13. In Clerk dashboard, paste the Google Client ID and Client Secret
14. Click "Save"

### GitHub OAuth Setup

1. In Clerk dashboard, go to **Configure > SSO Connections**
2. Click on **GitHub**
3. Toggle "Enable GitHub" to ON
4. Clerk will provide you with a Redirect URI
5. Go to [GitHub Developer Settings](https://github.com/settings/developers)
6. Click "New OAuth App"
7. Fill in the details:
   - Application name: "Async Boardgame Service"
   - Homepage URL: `http://localhost:3001` (or your domain)
   - Authorization callback URL: Use the Clerk Redirect URI
8. Click "Register application"
9. Copy the **Client ID**
10. Click "Generate a new client secret" and copy it
11. In Clerk dashboard, paste the GitHub Client ID and Client Secret
12. Click "Save"

## Step 4: Copy API Keys

1. In Clerk dashboard, go to **Configure > API Keys**
2. You'll see two keys:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)
3. Copy both keys

## Step 5: Update Environment Variables

1. Open your `.env` file in the project root
2. Update the following variables:

```bash
# Enable authentication
AUTH_ENABLED=true

# Paste your Clerk keys here
CLERK_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_actual_secret_key_here
```

3. Save the file

## Step 6: Configure Allowed Origins (Important!)

1. In Clerk dashboard, go to **Configure > Domains**
2. Add your development and production domains:
   - Development: `http://localhost:3001`
   - Development (web client): `http://localhost:5173` (if using Vite default)
   - Production: Your actual domain (e.g., `https://boardgame.example.com`)
3. Click "Add domain" for each

## Step 7: Test the Setup

1. Start your backend server:
   ```bash
   npm run dev
   ```

2. The server should start without errors
3. Check the logs for any authentication-related warnings

## Development vs Production Keys

- **Test Keys** (`pk_test_*` and `sk_test_*`):
  - Use for local development and testing
  - Free tier: 10,000 monthly active users
  - No credit card required

- **Live Keys** (`pk_live_*` and `sk_live_*`):
  - Use for production deployments
  - Switch to these when deploying to production
  - Update `.env` file with live keys

## Troubleshooting

### "Invalid API Key" Error
- Verify you copied the entire key (they're quite long)
- Ensure no extra spaces before/after the key
- Check you're using the correct key type (publishable vs secret)

### OAuth Provider Not Working
- Verify the redirect URI matches exactly (including https/http)
- Check that the OAuth app is not in "development mode" (for Google)
- Ensure the OAuth app has the correct permissions/scopes

### CORS Errors
- Add your frontend domain to Clerk's allowed origins
- Check that your frontend is using the correct Clerk publishable key

## Next Steps

After completing this setup:

1. ✅ Task 1 is complete
2. Move to Task 2: Install Clerk dependencies
3. Continue with the implementation plan in `tasks.md`

## Useful Links

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Dashboard](https://dashboard.clerk.com)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Google Cloud Console](https://console.cloud.google.com)
- [GitHub OAuth Apps](https://github.com/settings/developers)

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `.env` files to version control
- Keep your Secret Key (`sk_*`) private
- Rotate keys if they're ever exposed
- Use environment-specific keys (test for dev, live for prod)
- The Publishable Key can be safely used in client-side code
- The Secret Key should ONLY be used server-side

---

**Status**: Once you've completed all steps above, Task 1 is complete! ✅
