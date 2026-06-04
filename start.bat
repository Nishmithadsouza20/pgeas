@echo off
title PGease - Starting...

echo.
echo  ============================================
echo   PGease - Smart Accommodation Platform
echo  ============================================
echo.

:: Start Backend
echo  [1/2] Starting Backend (Flask)...
start "PGease Backend" cmd /k "cd /d %~dp0backend && python app.py"

:: Wait for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend
echo  [2/2] Starting Frontend (React)...
start "PGease Frontend" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo  Both servers starting:
echo    Backend  ->  http://localhost:5000
echo    Frontend ->  http://localhost:3000
echo.
echo  Close this window anytime - servers run in their own windows.
echo.
pause
