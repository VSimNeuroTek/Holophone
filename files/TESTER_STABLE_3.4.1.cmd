@echo off
setlocal EnableExtensions
cd /d "%~dp0"
node scripts\test-stable-v341.js
pause
