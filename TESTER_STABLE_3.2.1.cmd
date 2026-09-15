@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo HOLOPHONE 3.2.1 - RECETTE STATIQUE
echo.
node.exe "scripts\test-stable-v321.js"
set "RC=%ERRORLEVEL%"
echo.
if not "%RC%"=="0" echo ECHEC DE LA RECETTE.
if "%RC%"=="0" echo RECETTE OK.
pause
exit /b %RC%
