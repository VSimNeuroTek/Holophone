@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "ROOT=%CD%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\APPLIQUER_PATCH_3.4.1.ps1" %*
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" pause
exit /b %RC%
