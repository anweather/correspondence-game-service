#!/bin/bash

# Test script to verify that new requests are rejected during shutdown

echo "Testing request rejection during shutdown..."
echo ""

# Start the server in the background using dev mode
echo "Starting server..."
NODE_ENV=development PORT=3001 npm run dev > /tmp/server-rejection.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Server failed to start"
    exit 1
fi

echo "✓ Server started (PID: $SERVER_PID)"
echo ""

# Test: Make a successful request first
echo "Test 1: Making request before shutdown..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
if [ "$RESPONSE" = "200" ]; then
    echo "✓ Request succeeded with status 200"
else
    echo "❌ Request failed with status $RESPONSE"
fi

echo ""
echo "Test 2: Initiating shutdown and attempting new request..."

# Send SIGTERM
kill -TERM $SERVER_PID

# Give it a moment to start shutdown process
sleep 0.5

# Try to make a request during shutdown
echo "Attempting request during shutdown..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null)

# The request might fail to connect (000) or get 503
if [ "$RESPONSE" = "503" ]; then
    echo "✓ Request correctly rejected with 503 Service Unavailable"
elif [ "$RESPONSE" = "000" ] || [ -z "$RESPONSE" ]; then
    echo "✓ Connection refused (server already closed)"
else
    echo "⚠ Request returned status $RESPONSE (expected 503 or connection refused)"
fi

# Wait for server to finish shutting down
sleep 2

if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "✓ Server shut down successfully"
else
    echo "Forcing shutdown..."
    kill -9 $SERVER_PID 2>/dev/null
fi

echo ""
echo "Test completed!"
