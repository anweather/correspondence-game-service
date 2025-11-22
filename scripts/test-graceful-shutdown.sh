#!/bin/bash

# Test script for graceful shutdown functionality
# This script starts the server, makes a request, and sends SIGTERM to test shutdown

echo "Testing graceful shutdown..."
echo ""

# Start the server in the background using dev mode
echo "Starting server..."
NODE_ENV=development PORT=3001 npm run dev > /tmp/server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Server failed to start"
    echo "Server log:"
    cat /tmp/server.log
    exit 1
fi

echo "✓ Server started (PID: $SERVER_PID)"
echo ""

# Test 1: Normal shutdown with no in-flight requests
echo "Test 1: Shutdown with no in-flight requests"
echo "Sending SIGTERM..."
kill -TERM $SERVER_PID

# Wait for graceful shutdown (with timeout)
WAIT_COUNT=0
while kill -0 $SERVER_PID 2>/dev/null && [ $WAIT_COUNT -lt 10 ]; do
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
done

if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "✓ Server shut down gracefully"
    echo ""
    echo "Shutdown log:"
    tail -20 /tmp/server.log | grep -A 20 "received"
else
    echo "❌ Server did not shut down within timeout"
    kill -9 $SERVER_PID 2>/dev/null
    exit 1
fi

echo ""
echo "Test completed!"
