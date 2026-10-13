@echo off
title Syntrix AI - Vite Dev Server
echo ===================================================
echo   Starting Syntrix AI Development Server...
echo ===================================================
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm.cmd install
)
call npm.cmd run dev
pause
