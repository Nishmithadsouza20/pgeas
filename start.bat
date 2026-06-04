@echo off
title PGease - Starting...

echo.
echo  ============================================
echo   PGease - Smart Accommodation Platform
echo  ============================================
echo.

:: Start Backend
echo  [1/2] Starting Backend (Flask)...
start "PGease Backend" cmd /k "cd /d C:\Users\tast\PGease\backend && C:\Users\tast\AppData\Local\Python\pythoncore-3.10-64\python.exe app.py"

:: Wait for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend
echo  [2/2] Starting Frontend (React)...
start "PGease Frontend" cmd /k "cd /d C:\Users\tast\PGease\frontend && npm start"

echo.
echo  Both servers starting:
echo    Backend  ->  http://localhost:5000
echo    Frontend ->  http://localhost:3000
echo.
echo  Close this window anytime - servers run in their own windows.
echo.
pause
