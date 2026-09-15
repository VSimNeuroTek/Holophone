@echo off
setlocal EnableExtensions
cd /d "%~dp0"
call "%CD%\RELEASE.cmd" 3.1.0 42
