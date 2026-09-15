@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo  HOLOPHONE 2.8.3 - TEST GRADLE
echo ============================================================
echo.
echo Ce test utilise le configurateur Java 21 du projet.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\configure-gradle-java21.ps1"
if errorlevel 1 (
    echo.
    echo ERREUR : Gradle n'est pas pret.
    pause
    exit /b 1
)

echo.
echo OK - Gradle charge le module app correctement sous Java 21.
pause
