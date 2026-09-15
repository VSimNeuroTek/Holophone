@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo  HOLOPHONE 3.2.2 - VSNT SYSTEM PROFILE
echo ============================================================
echo.

set "LNSRC=%CD%\scripts\patches\local-notifications\SoundResolver.kt"
set "LNDST=%CD%\node_modules\@capacitor\local-notifications\android\src\main\kotlin\com\capacitorjs\plugins\localnotifications\SoundResolver.kt"
if exist "%LNSRC%" (
    if exist "%CD%\node_modules\@capacitor\local-notifications\android\src\main\kotlin\com\capacitorjs\plugins\localnotifications" (
        copy /Y "%LNSRC%" "%LNDST%" >nul
        if errorlevel 1 (
            echo ERREUR : impossible de restaurer le support des sons de notification Holophone.
            pause
            exit /b 1
        )
    )
)

echo [1/3] Synchronisation Capacitor...
call npx cap sync android
if errorlevel 1 (
    echo.
    echo ERREUR : npx cap sync android a echoue.
    pause
    exit /b 1
)

echo.
echo [2/3] Preparation Android...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\prepare-android-v20.ps1"
if errorlevel 1 (
    echo.
    echo ERREUR : preparation Android impossible.
    pause
    exit /b 1
)

echo.
echo [3/3] Ouverture Android Studio...
call npx cap open android
if errorlevel 1 (
    echo.
    echo La synchronisation a reussi.
    echo Ouvre manuellement : %CD%\android
    pause
    exit /b 1
)

echo.
echo Projet pret.
echo Release Android attendue : versionName 3.2.2 / versionCode 49
echo Pour une release complete, utilise RELEASE_3.2.2.cmd
echo.
pause
