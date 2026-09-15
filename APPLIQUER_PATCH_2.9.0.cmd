@echo off
setlocal EnableExtensions

set "PATCHROOT=%~dp0"
set "TARGET=%USERPROFILE%\Desktop\Holophone"
if not "%~1"=="" set "TARGET=%~1"

echo ============================================================
echo  HOLOPHONE - PATCH 2.9.0 - THEMES D'INTERFACE
echo ============================================================
echo.
echo Cible : %TARGET%
echo.

if not exist "%TARGET%\www\index.html" (
    echo ERREUR : projet Holophone introuvable dans :
    echo %TARGET%
    echo.
    echo Tu peux aussi lancer ce script avec le chemin du projet en argument.
    echo Exemple : APPLIQUER_PATCH_2.9.0.cmd "C:\Users\mudva\Desktop\Holophone"
    pause
    exit /b 1
)

set "BACKUP=%TARGET%\_backup_patch_2.9.0"
if not exist "%BACKUP%\www\css" mkdir "%BACKUP%\www\css" >nul 2>&1
if not exist "%BACKUP%\www\js" mkdir "%BACKUP%\www\js" >nul 2>&1
if not exist "%BACKUP%\scripts\patches\local-notifications" mkdir "%BACKUP%\scripts\patches\local-notifications" >nul 2>&1

echo [1/3] Sauvegarde des fichiers remplaces...
copy /Y "%TARGET%\www\index.html" "%BACKUP%\www\index.html" >nul
if errorlevel 1 goto :copy_error
copy /Y "%TARGET%\www\css\holophone-v2.css" "%BACKUP%\www\css\holophone-v2.css" >nul
if errorlevel 1 goto :copy_error
copy /Y "%TARGET%\www\js\holophone-v2.js" "%BACKUP%\www\js\holophone-v2.js" >nul
if errorlevel 1 goto :copy_error
copy /Y "%TARGET%\02_PREPARER_ANDROID_STUDIO.cmd" "%BACKUP%\02_PREPARER_ANDROID_STUDIO.cmd" >nul
if errorlevel 1 goto :copy_error
if exist "%TARGET%\scripts\patches\local-notifications\SoundResolver.kt" (
    copy /Y "%TARGET%\scripts\patches\local-notifications\SoundResolver.kt" "%BACKUP%\scripts\patches\local-notifications\SoundResolver.kt" >nul
    if errorlevel 1 goto :copy_error
)

echo [2/3] Installation des fichiers 2.9.0...
copy /Y "%PATCHROOT%files\www\index.html" "%TARGET%\www\index.html" >nul
if errorlevel 1 goto :copy_error
copy /Y "%PATCHROOT%files\www\css\holophone-v2.css" "%TARGET%\www\css\holophone-v2.css" >nul
if errorlevel 1 goto :copy_error
copy /Y "%PATCHROOT%files\www\js\holophone-v2.js" "%TARGET%\www\js\holophone-v2.js" >nul
if errorlevel 1 goto :copy_error
copy /Y "%PATCHROOT%files\02_PREPARER_ANDROID_STUDIO.cmd" "%TARGET%\02_PREPARER_ANDROID_STUDIO.cmd" >nul
if errorlevel 1 goto :copy_error

if not exist "%TARGET%\scripts\patches\local-notifications" mkdir "%TARGET%\scripts\patches\local-notifications" >nul 2>&1
copy /Y "%PATCHROOT%files\scripts\patches\local-notifications\SoundResolver.kt" "%TARGET%\scripts\patches\local-notifications\SoundResolver.kt" >nul
if errorlevel 1 goto :copy_error

set "LNDIR=%TARGET%\node_modules\@capacitor\local-notifications\android\src\main\kotlin\com\capacitorjs\plugins\localnotifications"
if exist "%LNDIR%" (
    copy /Y "%PATCHROOT%files\node_modules\@capacitor\local-notifications\android\src\main\kotlin\com\capacitorjs\plugins\localnotifications\SoundResolver.kt" "%LNDIR%\SoundResolver.kt" >nul
    if errorlevel 1 goto :copy_error
)

copy /Y "%PATCHROOT%files\CHANGEMENTS_2.9.0.md" "%TARGET%\CHANGEMENTS_2.9.0.md" >nul
if errorlevel 1 goto :copy_error
copy /Y "%PATCHROOT%files\RELEASE_2.9.0.md" "%TARGET%\RELEASE_2.9.0.md" >nul
if errorlevel 1 goto :copy_error
copy /Y "%PATCHROOT%files\VALIDATION_2.9.0.md" "%TARGET%\VALIDATION_2.9.0.md" >nul
if errorlevel 1 goto :copy_error

echo [3/3] Patch installe.
echo.
echo Sauvegarde : %BACKUP%
echo.
echo Etape manuelle de version Android :
echo Ouvre : %TARGET%\android\app\build.gradle
echo Regle :
echo     versionCode 40
echo     versionName "2.9.0"
echo.
echo Puis lance :
echo     %TARGET%\02_PREPARER_ANDROID_STUDIO.cmd
echo.
echo IMPORTANT : le patch ne modifie pas automatiquement build.gradle.
echo.
pause
exit /b 0

:copy_error
echo.
echo ERREUR pendant la copie. Aucun build n'a ete lance.
echo La sauvegarde disponible est : %BACKUP%
echo.
pause
exit /b 1
