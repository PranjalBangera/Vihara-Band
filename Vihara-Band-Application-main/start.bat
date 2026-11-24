@echo off
title Vihara Band — Dev Server
color 0A

echo.
echo  ╔══════════════════════════════════════╗
echo  ║       VIHARA BAND  Dev Server        ║
echo  ║       http://localhost:5173          ║
echo  ╚══════════════════════════════════════╝
echo.

:: Check if port 5173 is already in use and kill it
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING" 2^>nul') do (
    echo  [!] Port 5173 in use. Freeing it...
    taskkill /F /PID %%a >nul 2>&1
)

:: Start the server in background
echo  [*] Starting server on http://localhost:5173 ...
start "" /B python -m http.server 5173

:: Wait a moment for server to start
timeout /t 2 /nobreak >nul

:: Open the browser
echo  [*] Opening browser...
start "" http://localhost:5173

echo.
echo  [OK] Vihara Band is running at http://localhost:5173
echo  [--] Close this window to stop the server.
echo.

:: Keep this window open so the server stays alive
python -m http.server 5173 2>nul
pause
