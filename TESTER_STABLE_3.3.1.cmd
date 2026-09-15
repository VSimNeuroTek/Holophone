@echo off
setlocal EnableExtensions
cd /d "%~dp0"
node "%CD%\scripts\test-stable-v331.js"
if errorlevel 1 (
  echo.
  echo RECETTE EN ECHEC.
  pause
  exit /b 1
)
echo.
echo RECETTE 3.3.1 OK.
pause
