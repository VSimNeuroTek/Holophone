@echo off
setlocal EnableExtensions
cd /d "%~dp0"
node.exe "%CD%\scripts\test-stable-v311.js"
if errorlevel 1 (
 echo.
 echo RECETTE 3.1.1 EN ECHEC
 pause
 exit /b 1
)
echo.
echo RECETTE 3.1.1 OK
pause
