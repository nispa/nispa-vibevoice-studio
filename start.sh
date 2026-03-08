#!/bin/bash

echo "======================================="
echo "Starting VibeVoice Studio..."
echo "======================================="

# Cleanup function to kill background processes
cleanup() {
    echo ""
    echo "Stopping servers..."
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID
    exit
}

# Trap Ctrl+C (SIGINT) and SIGTERM
trap cleanup SIGINT SIGTERM

echo "Starting Backend Server..."
source venv/bin/activate
# Change to backend directory and run uvicorn
(cd backend && uvicorn main:app --reload) &
BACKEND_PID=$!

echo "Starting Frontend Server..."
# Change to frontend directory and run npm dev
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "Servers are starting..."
echo "Press Ctrl+C to stop both servers."

# Give servers a moment to start before opening the browser
sleep 2

# Launch browser
URL="http://localhost:5173/"
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "$URL"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if command -v xdg-open > /dev/null; then
        xdg-open "$URL"
    else
        echo "Please open $URL in your browser."
    fi
else
    echo "Please open $URL in your browser."
fi

# Keep the script running to wait for background processes
wait
