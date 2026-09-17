@echo off
setlocal EnableExtensions
cd /d "%~dp0"
node "%CD%\scripts\test-stable-v340.js"
pause
