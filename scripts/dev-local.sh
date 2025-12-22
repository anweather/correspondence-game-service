#!/bin/bash

# Local development script - PostgreSQL in Docker, app runs locally
# Fastest development cycle for code changes

set -e

echo "🚀 Starting local development environment..."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "⚠️  Warning: .env file not found. Using .env.example as template..."
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "📝 Created .env from .env.example - please update with your values"
  else
    echo "❌ Error: Neither .env nor .env.example found"
    exit 1
  fi
fi

# Load and export environment variables so npm processes can access them
set -a  # automatically export all variables
source .env
set +a  # stop auto-exporting

# Start PostgreSQL in Docker
echo "🐘 Starting PostgreSQL..."
docker-compose --env-file .env -f docker-compose.db-only.yml up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout=30
while ! docker-compose --env-file .env -f docker-compose.db-only.yml exec postgres pg_isready -U boardgame > /dev/null 2>&1; do
  sleep 1
  timeout=$((timeout - 1))
  if [ $timeout -eq 0 ]; then
    echo "❌ PostgreSQL failed to start within 30 seconds"
    exit 1
  fi
done

echo "✅ PostgreSQL is ready!"
echo ""
echo "🔧 Development environment ready:"
echo "   📊 PostgreSQL: localhost:5432"
echo "   🔗 Connection: $DATABASE_URL"
echo ""
echo "🚀 Starting application..."
echo ""

# Start the application with both backend and frontend
npm run dev:all