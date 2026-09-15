@echo off
setlocal EnableExtensions
cd /d "%~dp0"
call "%CD%\RELEASE.cmd" 3.0.0 41
exit /b %ERRORLEVEL%
