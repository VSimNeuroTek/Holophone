@echo off
setlocal EnableExtensions
cd /d "%~dp0"
node.exe "scripts\test-stable-v314.js"
if errorlevel 1 (
  echo.
  echo RECETTE 3.1.4 EN ECHEC.
  pause
  exit /b 1
)
echo.
echo RECETTE 3.1.4 OK.
pause
