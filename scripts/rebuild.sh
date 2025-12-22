#!/bin/bash

# Rebuild and restart script for async-boardgame-service
# Usage: 
#   ./scripts/rebuild.sh                # Fast backend-only rebuild (default)
#   ./scripts/rebuild.sh --full         # Full rebuild including PostgreSQL restart
#   ./scripts/rebuild.sh --wipe-db      # Full rebuild with database wipe

set -e

WIPE_DB=false
FULL_REBUILD=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --wipe-db)
      WIPE_DB=true
      FULL_REBUILD=true
      shift
      ;;
    --full)
      FULL_REBUILD=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--full] [--wipe-db]"
      echo ""
      echo "Options:"
      echo "  (default)    Fast backend-only rebuild and restart"
      echo "  --full       Full rebuild including PostgreSQL restart"
      echo "  --wipe-db    Full rebuild with database wipe"
      echo "  -h, --help   Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0           # Fast backend rebuild (recommended for development)"
      echo "  $0 --full    # Full system rebuild"
      echo "  $0 --wipe-db # Reset everything including data"
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

if [ "$FULL_REBUILD" = true ]; then
  echo "🔄 Full rebuild mode (including PostgreSQL)"
else
  echo "⚡ Fast backend-only rebuild mode"
fi

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

if [ "$FULL_REBUILD" = true ]; then
  # Full rebuild: stop all containers
  echo "⏹️  Stopping all containers..."
  docker-compose --env-file .env down

  # Wipe database if requested
  if [ "$WIPE_DB" = true ]; then
    echo "🗑️  Wiping database volume..."
    docker volume rm asyncgameservice_postgres-data 2>/dev/null || true
    echo "✅ Database wiped"
  fi

  # Rebuild and start all services
  echo "🏗️  Building all containers..."
  docker-compose --env-file .env build --no-cache

  echo "🚀 Starting all services..."
  docker-compose --env-file .env up -d
else
  # Fast rebuild: only rebuild backend service
  echo "⏹️  Stopping backend service..."
  docker-compose --env-file .env stop backend

  echo "🏗️  Building backend container..."
  docker-compose --env-file .env build --no-cache backend

  echo "🚀 Starting backend service..."
  docker-compose --env-file .env up -d backend
fi

echo ""
echo "✅ Rebuild complete!"
echo ""
echo "📊 Service status:"
docker-compose ps

echo ""
echo "📝 View logs with: docker-compose --env-file .env logs -f"
if [ "$FULL_REBUILD" = false ]; then
  echo "📝 View backend logs: docker-compose --env-file .env logs -f backend"
fi
echo "🛑 Stop services with: docker-compose --env-file .env down"

if [ "$WIPE_DB" = true ]; then
  echo ""
  echo "⚠️  Database was wiped - all game data has been reset"
fi

if [ "$FULL_REBUILD" = false ]; then
  echo ""
  echo "💡 Tip: Use --full flag for complete rebuild including PostgreSQL"
fi
