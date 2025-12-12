#!/bin/bash

# Rebuild and restart script for async-boardgame-service
# Usage: 
#   ./scripts/rebuild.sh           # Rebuild and restart
#   ./scripts/rebuild.sh --wipe-db # Rebuild, wipe database, and restart

set -e

WIPE_DB=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --wipe-db)
      WIPE_DB=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--wipe-db]"
      echo ""
      echo "Options:"
      echo "  --wipe-db    Wipe the database before restarting"
      echo "  -h, --help   Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

echo "🔨 Rebuilding async-boardgame-service..."

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

# Stop running containers
echo "⏹️  Stopping containers..."
docker-compose --env-file .env down

# Wipe database if requested
if [ "$WIPE_DB" = true ]; then
  echo "🗑️  Wiping database volume..."
  docker volume rm asyncgameservice_postgres-data 2>/dev/null || true
  echo "✅ Database wiped"
fi

# Rebuild and start
echo "🏗️  Building containers..."
docker-compose --env-file .env build --no-cache

echo "🚀 Starting services..."
docker-compose --env-file .env up -d

echo ""
echo "✅ Rebuild complete!"
echo ""
echo "📊 Service status:"
docker-compose ps

echo ""
echo "📝 View logs with: docker-compose --env-file .env logs -f"
echo "🛑 Stop services with: docker-compose --env-file .env down"

if [ "$WIPE_DB" = true ]; then
  echo ""
  echo "⚠️  Database was wiped - all game data has been reset"
fi
