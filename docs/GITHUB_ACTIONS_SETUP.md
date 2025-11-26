# GitHub Actions Deployment Setup

This guide explains how to set up automated deployments to your home server using GitHub Actions.

## Overview

The GitHub Actions workflows will:
- ✅ Run tests on every push
- ✅ Automatically deploy to production when you push to `main` branch
- ✅ Deploy to staging when you push to `develop` branch (optional)
- ✅ Send notifications on deployment success/failure
- ✅ Verify deployment health after deploying

## Architecture

```
GitHub Repository
    │
    ├─── Push to main branch
    │    └─── GitHub Actions Runner
    │         ├─── Run tests
    │         ├─── SSH to home server
    │         ├─── Pull latest code
    │         ├─── Build Docker images
    │         ├─── Deploy services
    │         └─── Verify health
    │
    └─── Push to develop branch
         └─── Deploy to staging (optional)
```

## Prerequisites

1. **GitHub Repository**: Your code must be in a GitHub repository
2. **Home Server**: Server must be accessible via SSH
3. **SSH Access**: SSH key-based authentication configured
4. **Git on Server**: Git repository cloned on your server

## Step-by-Step Setup

### Step 1: Prepare Your Home Server

1. **Create a deployment user** (recommended for security):
   ```bash
   sudo adduser deploy
   sudo usermod -aG docker deploy
   ```

2. **Clone repository on server**:
   ```bash
   sudo mkdir -p /opt/async-boardgame-service
   sudo chown deploy:deploy /opt/async-boardgame-service
   su - deploy
   cd /opt/async-boardgame-service
   git clone <your-repo-url> .
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   nano .env  # Configure your production settings
   ```

### Step 2: Set Up SSH Key for GitHub Actions

1. **Generate SSH key pair** (on your local machine):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions
   ```
   
   This creates:
   - Private key: `~/.ssh/github-actions` (keep secret!)
   - Public key: `~/.ssh/github-actions.pub`

2. **Add public key to server**:
   ```bash
   # Copy public key
   cat ~/.ssh/github-actions.pub
   
   # On your server, add to authorized_keys
   ssh deploy@your-server
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

3. **Test SSH connection**:
   ```bash
   ssh -i ~/.ssh/github-actions deploy@your-server
   ```

### Step 3: Configure GitHub Secrets

1. **Go to your GitHub repository**
2. **Navigate to**: Settings → Secrets and variables → Actions
3. **Add the following secrets**:

#### Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SSH_PRIVATE_KEY` | Private SSH key content | Contents of `~/.ssh/github-actions` |
| `SERVER_HOST` | Your server's hostname or IP | `games.yourdomain.com` or `192.168.1.100` |
| `SERVER_USER` | SSH username | `deploy` |
| `SERVER_PATH` | Path to application on server | `/opt/async-boardgame-service` |
| `DOMAIN` | Your production domain | `games.yourdomain.com` |

#### Optional Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DISCORD_WEBHOOK` | Discord webhook for notifications | `https://discord.com/api/webhooks/...` |
| `STAGING_SSH_PRIVATE_KEY` | SSH key for staging server | (if using staging) |
| `STAGING_SERVER_HOST` | Staging server hostname | `staging.yourdomain.com` |
| `STAGING_SERVER_USER` | Staging SSH username | `deploy` |
| `STAGING_SERVER_PATH` | Staging application path | `/opt/staging` |
| `STAGING_DOMAIN` | Staging domain | `staging.yourdomain.com` |

#### How to Add Secrets

1. Click **"New repository secret"**
2. Enter the **Name** (e.g., `SSH_PRIVATE_KEY`)
3. Enter the **Value**:
   ```bash
   # For SSH_PRIVATE_KEY, copy the entire private key:
   cat ~/.ssh/github-actions
   # Copy everything including:
   # -----BEGIN OPENSSH PRIVATE KEY-----
   # ... key content ...
   # -----END OPENSSH PRIVATE KEY-----
   ```
4. Click **"Add secret"**

### Step 4: Configure Server for Passwordless Git Pull

GitHub Actions needs to pull code without entering credentials:

**Option A: Use SSH for Git (Recommended)**

1. **On your server**, generate SSH key:
   ```bash
   ssh-keygen -t ed25519 -C "server-deploy"
   cat ~/.ssh/id_ed25519.pub
   ```

2. **Add to GitHub**:
   - Go to GitHub → Settings → SSH and GPG keys
   - Click "New SSH key"
   - Paste the public key
   - Title: "Home Server Deploy"

3. **Update remote URL on server**:
   ```bash
   cd /opt/async-boardgame-service
   git remote set-url origin git@github.com:username/repo.git
   ```

**Option B: Use Personal Access Token**

1. **Create GitHub PAT**:
   - GitHub → Settings → Developer settings → Personal access tokens
   - Generate new token (classic)
   - Select scopes: `repo`
   - Copy the token

2. **Configure Git on server**:
   ```bash
   cd /opt/async-boardgame-service
   git remote set-url origin https://YOUR_TOKEN@github.com/username/repo.git
   ```

### Step 5: Test the Workflow

1. **Make a small change** to your code
2. **Commit and push to main**:
   ```bash
   git add .
   git commit -m "test: trigger deployment"
   git push origin main
   ```

3. **Watch the workflow**:
   - Go to GitHub → Actions tab
   - You should see "Deploy to Production" running
   - Click on it to see live logs

4. **Verify deployment**:
   ```bash
   # Check your site
   curl https://games.yourdomain.com/health
   ```

## Workflow Files

### Production Deployment (`.github/workflows/deploy-production.yml`)

Triggers on:
- Push to `main` branch
- Manual trigger via GitHub UI

Steps:
1. Run tests
2. SSH to server
3. Pull latest code
4. Build Docker images
5. Deploy services
6. Verify health
7. Send notification

### Staging Deployment (`.github/workflows/deploy-staging.yml`)

Triggers on:
- Push to `develop` branch
- Manual trigger via GitHub UI

Same steps as production but deploys to staging server.

## Manual Deployment

You can manually trigger a deployment:

1. Go to GitHub → Actions
2. Select "Deploy to Production"
3. Click "Run workflow"
4. Select branch
5. Click "Run workflow"

## Notifications

### Discord Notifications

1. **Create Discord webhook**:
   - Open Discord server
   - Server Settings → Integrations → Webhooks
   - Create webhook
   - Copy webhook URL

2. **Add to GitHub secrets**:
   - Secret name: `DISCORD_WEBHOOK`
   - Value: Your webhook URL

3. **Notifications will include**:
   - Deployment status (success/failure)
   - Commit SHA
   - Branch name

### Email Notifications

GitHub automatically sends email notifications for workflow failures to repository admins.

## Troubleshooting

### SSH Connection Failed

**Error**: `Permission denied (publickey)`

**Solution**:
1. Verify SSH key is correct:
   ```bash
   ssh -i ~/.ssh/github-actions deploy@your-server
   ```
2. Check authorized_keys on server:
   ```bash
   cat ~/.ssh/authorized_keys
   ```
3. Verify GitHub secret `SSH_PRIVATE_KEY` contains the full private key

### Git Pull Failed

**Error**: `Permission denied` or `Authentication failed`

**Solution**:
1. Verify Git remote URL:
   ```bash
   cd /opt/async-boardgame-service
   git remote -v
   ```
2. Test Git pull manually:
   ```bash
   git pull origin main
   ```
3. If using SSH, verify SSH key is added to GitHub
4. If using PAT, verify token has `repo` scope

### Docker Build Failed

**Error**: `Cannot connect to Docker daemon`

**Solution**:
1. Verify deploy user is in docker group:
   ```bash
   groups deploy
   ```
2. Add to docker group if needed:
   ```bash
   sudo usermod -aG docker deploy
   ```
3. Log out and back in for changes to take effect

### Health Check Failed

**Error**: `Health check failed after 30 attempts`

**Solution**:
1. Check application logs:
   ```bash
   docker-compose logs backend
   ```
2. Verify .env configuration
3. Check database connection
4. Verify port 3000 is not blocked

### Deployment Succeeds but Site Not Accessible

**Solution**:
1. Check Nginx is running:
   ```bash
   sudo systemctl status nginx
   ```
2. Verify Nginx configuration:
   ```bash
   sudo nginx -t
   ```
3. Check SSL certificate:
   ```bash
   sudo certbot certificates
   ```
4. Verify DNS is pointing to your server

## Security Best Practices

### 1. Use Dedicated Deploy User

Don't use root or your personal user:
```bash
sudo adduser deploy
sudo usermod -aG docker deploy
```

### 2. Restrict SSH Key

Add to `~/.ssh/authorized_keys` with restrictions:
```bash
command="cd /opt/async-boardgame-service && git pull && docker-compose up -d",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA...
```

### 3. Use Environment-Specific Secrets

Don't share secrets between staging and production:
- Different database passwords
- Different Clerk keys
- Different domains

### 4. Rotate SSH Keys Regularly

Generate new SSH keys every 6-12 months:
```bash
ssh-keygen -t ed25519 -C "github-actions-2025"
```

### 5. Monitor Deployment Logs

Regularly review GitHub Actions logs for suspicious activity.

### 6. Enable Branch Protection

Protect your main branch:
- GitHub → Settings → Branches
- Add rule for `main`
- Require pull request reviews
- Require status checks to pass

## Advanced Configuration

### Rollback on Failure

Add to workflow:
```yaml
- name: Rollback on failure
  if: failure()
  run: |
    ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
      cd ${{ secrets.SERVER_PATH }}
      git reset --hard HEAD~1
      docker-compose up -d
    ENDSSH
```

### Database Migrations

Add before deployment:
```yaml
- name: Run migrations
  run: |
    ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
      cd ${{ secrets.SERVER_PATH }}
      docker-compose exec -T backend npm run migrate
    ENDSSH
```

### Slack Notifications

Replace Discord webhook with Slack:
```yaml
- name: Send Slack notification
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Deployment ${{ job.status }}"
      }
```

### Blue-Green Deployment

For zero-downtime deployments, set up two environments and switch between them.

## Cost

GitHub Actions is free for public repositories and includes:
- 2,000 minutes/month for private repositories (free tier)
- Unlimited minutes for public repositories

Typical deployment uses ~2-5 minutes per run.

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [SSH Action Documentation](https://github.com/webfactory/ssh-agent)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## Support

If you encounter issues:
1. Check GitHub Actions logs
2. SSH to server and check application logs
3. Review this troubleshooting guide
4. Open an issue with logs and error messages
