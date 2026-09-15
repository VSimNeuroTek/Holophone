@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PATCHROOT=%CD%"
set "TARGET=%USERPROFILE%\Desktop\Holophone"
if not "%~1"=="" set "TARGET=%~1"

set "BACKUP=%TARGET%\_backup_patch_3.0.0"

echo ============================================================
echo  HOLOPHONE - PATCH 3.0.0 - LOT 1 STABILISATION
echo ============================================================
echo.
echo Cible : %TARGET%
echo.

if not exist "%TARGET%\www\index.html" (
    echo ERREUR : projet Holophone introuvable dans :
    echo %TARGET%
    echo.
    echo Exemple : APPLIQUER_PATCH_3.0.0.cmd "C:\Users\mudva\Desktop\Holophone"
    pause
    exit /b 1
)

for %%D in (
 "%BACKUP%\www\js"
 "%BACKUP%\www\css"
 "%BACKUP%\www\media"
 "%BACKUP%\scripts\patches\local-notifications"
 "%BACKUP%\android\app\src\main"
) do if not exist "%%~D" mkdir "%%~D" >nul 2>&1

echo [1/3] Sauvegarde des fichiers courants...

call :backup "www\index.html"
if errorlevel 1 goto :copy_error
call :backup "www\js\holophone-v2.js"
if errorlevel 1 goto :copy_error
call :backup "www\js\holophone-stability.js"
if errorlevel 1 goto :copy_error
call :backup "www\css\holophone-v2.css"
if errorlevel 1 goto :copy_error
call :backup "www\media\joi_startup.mp3"
if errorlevel 1 goto :copy_error
call :backup "02_PREPARER_ANDROID_STUDIO.cmd"
if errorlevel 1 goto :copy_error
call :backup "RELEASE.cmd"
if errorlevel 1 goto :copy_error
call :backup "RELEASE_3.0.0.cmd"
if errorlevel 1 goto :copy_error
call :backup "TESTER_STABLE_3.0.0.cmd"
if errorlevel 1 goto :copy_error
call :backup "scripts\configure-android.ps1"
if errorlevel 1 goto :copy_error
call :backup "scripts\prepare-android-v20.ps1"
if errorlevel 1 goto :copy_error
call :backup "scripts\release-safe.ps1"
if errorlevel 1 goto :copy_error
call :backup "scripts\test-stable-v300.js"
if errorlevel 1 goto :copy_error
call :backup "scripts\patches\local-notifications\SoundResolver.kt"
if errorlevel 1 goto :copy_error
call :backup "android\app\src\main\AndroidManifest.xml"
if errorlevel 1 goto :copy_error
call :backup "package.json"
if errorlevel 1 goto :copy_error
call :backup "package-lock.json"
if errorlevel 1 goto :copy_error
call :backup "release-state.json"
if errorlevel 1 goto :copy_error

echo Sauvegarde : %BACKUP%
echo.
echo [2/3] Installation du socle 3.0.0...

call :install "www\index.html"
if errorlevel 1 goto :copy_error
call :install "www\js\holophone-v2.js"
if errorlevel 1 goto :copy_error
call :install "www\js\holophone-stability.js"
if errorlevel 1 goto :copy_error
call :install "www\css\holophone-v2.css"
if errorlevel 1 goto :copy_error
call :install "www\media\joi_startup.mp3"
if errorlevel 1 goto :copy_error
call :install "02_PREPARER_ANDROID_STUDIO.cmd"
if errorlevel 1 goto :copy_error
call :install "RELEASE.cmd"
if errorlevel 1 goto :copy_error
call :install "RELEASE_3.0.0.cmd"
if errorlevel 1 goto :copy_error
call :install "TESTER_STABLE_3.0.0.cmd"
if errorlevel 1 goto :copy_error
call :install "scripts\configure-android.ps1"
if errorlevel 1 goto :copy_error
call :install "scripts\prepare-android-v20.ps1"
if errorlevel 1 goto :copy_error
call :install "scripts\release-safe.ps1"
if errorlevel 1 goto :copy_error
call :install "scripts\test-stable-v300.js"
if errorlevel 1 goto :copy_error
call :install "scripts\patches\local-notifications\SoundResolver.kt"
if errorlevel 1 goto :copy_error
call :install "android\app\src\main\AndroidManifest.xml"
if errorlevel 1 goto :copy_error
call :install "package.json"
if errorlevel 1 goto :copy_error
call :install "package-lock.json"
if errorlevel 1 goto :copy_error
call :install "release-state.json"
if errorlevel 1 goto :copy_error

for %%F in (
 "ARCHITECTURE_STABILITE_3.0.0.md"
 "CHANGEMENTS_3.0.0.md"
 "RELEASE_3.0.0.md"
 "RECETTE_STABLE_3.0.0.md"
 "VALIDATION_3.0.0.md"
 "HOLOPHONE_MASTER_HANDOFF_3.0.0.md"
) do (
 copy /Y "%PATCHROOT%\files\%%~F" "%TARGET%\%%~F" >nul
 if errorlevel 1 goto :copy_error
)

echo.
echo [3/3] Patch installe.
echo.
echo Etape recommandee :
echo     %TARGET%\RELEASE_3.0.0.cmd
echo.
echo Cette commande reglera de facon sure :
echo     versionCode 41
echo     versionName "3.0.0"
echo puis lancera la recette et ouvrira Android Studio.
echo.
pause
exit /b 0

:backup
set "REL=%~1"
if exist "%TARGET%\%REL%" (
    for %%P in ("%BACKUP%\%REL%") do if not exist "%%~dpP" mkdir "%%~dpP" >nul 2>&1
    copy /Y "%TARGET%\%REL%" "%BACKUP%\%REL%" >nul
    if errorlevel 1 exit /b 1
)
exit /b 0

:install
set "REL=%~1"
for %%P in ("%TARGET%\%REL%") do if not exist "%%~dpP" mkdir "%%~dpP" >nul 2>&1
copy /Y "%PATCHROOT%\files\%REL%" "%TARGET%\%REL%" >nul
if errorlevel 1 exit /b 1
exit /b 0

:copy_error
echo.
echo ERREUR pendant la copie.
echo Sauvegarde disponible : %BACKUP%
echo Aucun build n'a ete lance.
echo.
pause
exit /b 1
