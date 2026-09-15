@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo  HOLOPHONE 2.8.3 - REPARATION BUILD.GRADLE SAFE
echo ============================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\repair-build-gradle-v283-safe.ps1"
if errorlevel 1 (
    echo.
    echo ERREUR : la reparation a echoue.
    echo Ne lance pas Android Studio tant que ce message apparait.
    pause
    exit /b 1
)

echo.
echo Verification directe du fichier :
findstr /n /c:"versionCode" /c:"versionName" "android\app\build.gradle"

echo.
findstr /n /c:"$133" "android\app\build.gradle" >nul
if not errorlevel 1 (
    echo ERREUR : $133 est encore present dans android\app\build.gradle
    pause
    exit /b 1
)

echo.
echo OK - build.gradle est repare.
echo Lance maintenant 02_PREPARER_ANDROID_STUDIO.cmd
pause
