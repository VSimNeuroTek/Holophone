@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo  HOLOPHONE 2.8.3 - CONFIGURATION JAVA 21 POUR GRADLE
echo ============================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\configure-gradle-java21.ps1"
if errorlevel 1 (
    echo.
    echo ECHEC : Java 21 doit etre installe/configure avant Gradle.
    pause
    exit /b 1
)

echo.
echo Configuration Java 21 terminee.
pause
