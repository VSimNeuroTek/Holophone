@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "VERSION_NAME=%~1"
set "VERSION_CODE=%~2"
if "%VERSION_NAME%"=="" set "VERSION_NAME=3.1.2"
if "%VERSION_CODE%"=="" set "VERSION_CODE=44"

echo ============================================================
echo  HOLOPHONE - RELEASE %VERSION_NAME% / CODE %VERSION_CODE%
echo ============================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\release-safe.ps1" -VersionName "%VERSION_NAME%" -VersionCode %VERSION_CODE%
if errorlevel 1 (
    echo.
    echo RELEASE INTERROMPUE. Lis l'erreur ci-dessus.
    pause
    exit /b 1
)

echo.
echo Projet pret dans Android Studio.
echo Build ^> Generate Signed App Bundle or APK... ^> APK ^> release
pause
