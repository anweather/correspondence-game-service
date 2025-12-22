#!/bin/bash

# Start development server with authentication disabled for blackbox testing
echo "Starting development server with auth disabled for blackbox tests..."

# Set environment variables for dev mode
export NODE_ENV=development
export AUTH_DISABLED=true
export PORT=3001

# Start the server
npm run dev