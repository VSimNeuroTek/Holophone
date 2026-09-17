@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo  HOLOPHONE - PREPARATION RELEASE 3.4.2 / CODE 56
echo ============================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\release-hotfix-v342.ps1"
if errorlevel 1 (
    echo.
    echo PREPARATION 3.4.2 INTERROMPUE. Lis l'erreur ci-dessus.
    pause
    exit /b 1
)

echo.
echo Android Studio est pret.
echo Build ^> Generate Signed App Bundle or APK... ^> APK ^> release
echo Utilise exactement le meme keystore que la 3.4.1 pour conserver les donnees.
pause
