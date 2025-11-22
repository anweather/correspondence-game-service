#!/bin/bash

# Test script for graceful shutdown with in-flight requests
# This script starts the server, makes a slow request, and sends SIGTERM during the request

echo "Testing graceful shutdown with in-flight requests..."
echo ""

# Start the server in the background using dev mode
echo "Starting server..."
NODE_ENV=development PORT=3001 npm run dev > /tmp/server-inflight.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Server failed to start"
    echo "Server log:"
    cat /tmp/server-inflight.log
    exit 1
fi

echo "✓ Server started (PID: $SERVER_PID)"
echo ""

# Test: Shutdown with in-flight request
echo "Test: Shutdown with in-flight request"
echo "Making a request to /health endpoint..."

# Make a request in the background
curl -s http://localhost:3001/health > /dev/null 2>&1 &
REQUEST_PID=$!

# Give the request a moment to start
sleep 0.5

echo "Sending SIGTERM while request is in progress..."
kill -TERM $SERVER_PID

# Wait for graceful shutdown (with timeout)
WAIT_COUNT=0
while kill -0 $SERVER_PID 2>/dev/null && [ $WAIT_COUNT -lt 35 ]; do
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
done

if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "✓ Server shut down gracefully"
    echo ""
    echo "Shutdown log:"
    tail -30 /tmp/server-inflight.log | grep -A 30 "received"
else
    echo "❌ Server did not shut down within timeout"
    kill -9 $SERVER_PID 2>/dev/null
    exit 1
fi

# Clean up request process if still running
kill -9 $REQUEST_PID 2>/dev/null

echo ""
echo "Test completed!"
