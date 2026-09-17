@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo  HOLOPHONE 3.4.2 - RECETTE HOTFIX
echo ============================================================
echo.

node.exe "scripts\test-stable-v342.js"
if errorlevel 1 (
    echo.
    echo TEST 3.4.2 EN ECHEC.
    pause
    exit /b 1
)

echo.
echo TEST 3.4.2 OK.
echo Tu peux maintenant lancer RELEASE_3.4.2.cmd
pause
