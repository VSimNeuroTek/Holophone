@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PATCHROOT=%CD%"
set "TARGET=%USERPROFILE%\Desktop\Holophone"
if not "%~1"=="" set "TARGET=%~1"

set "BACKUP=%TARGET%\_backup_patch_3.1.0"

echo ============================================================
echo  HOLOPHONE - PATCH 3.1.0 - LOT 2 PRESENCE JUDY
echo ============================================================
echo.
echo Cible : %TARGET%
echo.

if not exist "%TARGET%\www\index.html" (
  echo ERREUR : projet Holophone introuvable.
  echo Chemin attendu : %TARGET%
  echo.
  echo Utilisation alternative :
  echo   APPLIQUER_PATCH_3.1.0.cmd "C:\chemin\vers\Holophone"
  pause
  exit /b 1
)

if not exist "%BACKUP%\www\js" mkdir "%BACKUP%\www\js" >nul 2>&1
if not exist "%BACKUP%\scripts\patches\local-notifications" mkdir "%BACKUP%\scripts\patches\local-notifications" >nul 2>&1

echo [1/3] Sauvegarde des fichiers existants...
call :backup "www\index.html"
if errorlevel 1 goto :copy_error
call :backup "www\js\holophone-v2.js"
if errorlevel 1 goto :copy_error
call :backup "www\js\holophone-stability.js"
if errorlevel 1 goto :copy_error
call :backup "02_PREPARER_ANDROID_STUDIO.cmd"
if errorlevel 1 goto :copy_error
call :backup "RELEASE.cmd"
if errorlevel 1 goto :copy_error
call :backup "scripts\release-safe.ps1"
if errorlevel 1 goto :copy_error
call :backup "scripts\patches\local-notifications\SoundResolver.kt"
if errorlevel 1 goto :copy_error

echo [2/3] Installation des fichiers 3.1.0...
call :install "www\index.html"
if errorlevel 1 goto :copy_error
call :install "www\js\holophone-v2.js"
if errorlevel 1 goto :copy_error
call :install "www\js\holophone-stability.js"
if errorlevel 1 goto :copy_error
call :install "02_PREPARER_ANDROID_STUDIO.cmd"
if errorlevel 1 goto :copy_error
call :install "RELEASE.cmd"
if errorlevel 1 goto :copy_error
call :install "RELEASE_3.1.0.cmd"
if errorlevel 1 goto :copy_error
call :install "TESTER_STABLE_3.1.0.cmd"
if errorlevel 1 goto :copy_error
call :install "scripts\release-safe.ps1"
if errorlevel 1 goto :copy_error
call :install "scripts\test-stable-v310.js"
if errorlevel 1 goto :copy_error
call :install "scripts\patches\local-notifications\SoundResolver.kt"
if errorlevel 1 goto :copy_error
call :install "CHANGEMENTS_3.1.0.md"
if errorlevel 1 goto :copy_error
call :install "RELEASE_3.1.0.md"
if errorlevel 1 goto :copy_error
call :install "VALIDATION_3.1.0.md"
if errorlevel 1 goto :copy_error
call :install "ARCHITECTURE_PRESENCE_3.1.0.md"
if errorlevel 1 goto :copy_error
call :install "HOLOPHONE_MASTER_HANDOFF_3.1.0.md"
if errorlevel 1 goto :copy_error

echo [3/3] Patch installe avec succes.
echo.
echo Sauvegarde : %BACKUP%
echo.
echo Pour preparer la release Android :
echo   %TARGET%\RELEASE_3.1.0.cmd
echo.
echo Version attendue : 3.1.0 / versionCode 42
pause
exit /b 0

:backup
set "REL=%~1"
if not exist "%TARGET%\%REL%" exit /b 0
for %%D in ("%BACKUP%\%REL%") do if not exist "%%~dpD" mkdir "%%~dpD" >nul 2>&1
copy /Y "%TARGET%\%REL%" "%BACKUP%\%REL%" >nul
exit /b %ERRORLEVEL%

:install
set "REL=%~1"
if not exist "%PATCHROOT%\files\%REL%" exit /b 1
for %%D in ("%TARGET%\%REL%") do if not exist "%%~dpD" mkdir "%%~dpD" >nul 2>&1
copy /Y "%PATCHROOT%\files\%REL%" "%TARGET%\%REL%" >nul
exit /b %ERRORLEVEL%

:copy_error
echo.
echo ERREUR pendant la copie. Aucun build n'a ete lance.
echo Sauvegarde disponible : %BACKUP%
echo.
pause
exit /b 1
