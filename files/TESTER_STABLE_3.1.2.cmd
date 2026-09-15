@echo off
setlocal EnableExtensions
cd /d "%~dp0"
node "scripts\test-stable-v312.js"
set "RC=%ERRORLEVEL%"
echo.
if not "%RC%"=="0" echo RECETTE EN ECHEC.
if "%RC%"=="0" echo RECETTE OK.
pause
exit /b %RC%
