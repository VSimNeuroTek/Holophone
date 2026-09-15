@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo  HOLOPHONE 3.0.0 - RECETTE TECHNIQUE
 echo ============================================================
echo.

where node.exe >nul 2>&1
if errorlevel 1 (
    echo ERREUR : Node.js introuvable.
    pause
    exit /b 1
)

echo [1/2] Controles statiques...
node.exe "scripts\test-stable-v300.js"
if errorlevel 1 (
    echo.
    echo RECETTE EN ECHEC.
    pause
    exit /b 1
)

echo.
echo [2/2] Synchronisation Capacitor...
call npx cap sync android
if errorlevel 1 (
    echo.
    echo ERREUR : npx cap sync android a echoue.
    pause
    exit /b 1
)

echo.
echo RECETTE TECHNIQUE OK.
pause
