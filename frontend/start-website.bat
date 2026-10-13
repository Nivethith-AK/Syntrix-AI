@echo off
title Syntrix AI - Local Website Server
echo ===================================================
echo   Launching Syntrix AI Website...
echo ===================================================
cd /d "%~dp0"
start http://localhost:8000
echo Serving website at http://localhost:8000
echo Press Ctrl+C to stop the server.
python -m http.server 8000 --directory dist
pause
