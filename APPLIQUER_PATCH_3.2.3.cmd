@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "PATCHROOT=%CD%"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCHROOT%\APPLIQUER_PATCH_3.2.3.ps1" %*
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
  echo Patch 3.2.3 termine avec succes.
) else (
  echo Patch 3.2.3 interrompu avec erreur %RC%.
)
echo.
pause
exit /b %RC%
