@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PATCHROOT=%CD%"
set "TARGET=%USERPROFILE%\Desktop\Holophone"
if not "%~1"=="" set "TARGET=%~1"
set "BACKUP=%TARGET%\_backup_patch_3.1.2"

echo ============================================================
echo  HOLOPHONE - PATCH 3.1.2 - VSNT BRANDING DEFINITIF
echo ============================================================
echo.
echo Cible : %TARGET%
echo.
if not exist "%TARGET%\www\index.html" (
  echo ERREUR : projet Holophone introuvable.
  echo Chemin attendu : %TARGET%
  echo.
  echo Utilisation alternative :
  echo   APPLIQUER_PATCH_3.1.2.cmd "C:\chemin\vers\Holophone"
  pause
  exit /b 1
)

echo [1/4] Sauvegarde des fichiers existants...
for /f "usebackq delims=" %%F in ("%PATCHROOT%\files.lst") do (
  call :backup "%%F"
  if errorlevel 1 goto :copy_error
)

echo [2/4] Sauvegarde et retrait des anciennes icones WebP eventuelles...
call :backup "android\app\src\main\res\mipmap-mdpi\ic_launcher.webp"
if errorlevel 1 goto :copy_error
if exist "%TARGET%\android\app\src\main\res\mipmap-mdpi\ic_launcher.webp" del /Q "%TARGET%\android\app\src\main\res\mipmap-mdpi\ic_launcher.webp" >nul 2>&1
call :backup "android\app\src\main\res\mipmap-mdpi\ic_launcher_round.webp"
if errorlevel 1 goto :copy_error
if exist "%TARGET%\android\app\src\main\res\mipmap-mdpi\ic_launcher_round.webp" del /Q "%TARGET%\android\app\src\main\res\mipmap-mdpi\ic_launcher_round.webp" >nul 2>&1
call :backup "android\app\src\main\res\mipmap-mdpi\ic_launcher_foreground.webp"
if errorlevel 1 goto :copy_error
if exist "%TARGET%\android\app\src\main\res\mipmap-mdpi\ic_launcher_foreground.webp" del /Q "%TARGET%\android\app\src\main\res\mipmap-mdpi\ic_launcher_foreground.webp" >nul 2>&1
call :backup "android\app\src\main\res\mipmap-hdpi\ic_launcher.webp"
if errorlevel 1 goto :copy_error
if exist "%TARGET%\android\app\src\main\res\mipmap-hdpi\ic_launcher.webp" del /Q "%TARGET%\android\app\src\main\res\mipmap-hdpi\ic_launcher.webp" >nul 2>&1
call :backup "android\app\src\main\res\mipmap-hdpi\ic_launcher_round.webp"
if errorlevel 1 goto :copy_error
if exist "%TARGET%\android\app\src\main\res\mipmap-hdpi\ic_launcher_round.webp" del /Q "%TARGET%\android\app\src\main\res\mipmap-hdpi\ic_launcher_round.webp" >nul 2>&1
call :backup "android\app\src\main\res\mipmap-hdpi\ic_launcher_foreground.webp"
if errorlevel 1 goto :copy_error
if exist "%TARGET%\android\app\src\main\res\mipmap-hdpi\ic_launcher_foreground.webp" del /Q "%TARGET%\android\app\src\main\res\mipmap-hdpi\ic_launcher_foreground.webp" >nul 2>&1
call :backup "android\app\src\main\res\mipmap-xhdpi\ic_launcher.webp"
if errorlevel 1 goto :copy_error
if exist "%TARGET%\android\app\src\main\res\mipmap-xhdpi\ic_launcher.webp" del /Q "%TARGET%\android\app\src\main\res\mipmap-xhdpi\ic_launcher.webp" >nul 2>&1
call :backup "android\app\src\main\res\mipmap-xhdpi\ic_launcher_round.webp"
if errorlevel 1 goto :copy_error
if exist "%TARGET%\android\app\src\main\res\mipmap-xhdpi\ic_launcher_round.webp" del /Q "%TARGET%\android\app\src\main\res\mipmap-xhdpi\ic_launcher_round.webp" >nul 2>&1
call :backup "android\app\src\main\res\mipmap-xhdpi\ic_launcher_foreground.webp"
if errorlevel 1 goto :copy_error
if exist "%TARGET%\android\app\src\main\res\mipmap-xhdpi\ic_launcher_foreground.webp" del /Q "%TARGET%\android\app\src\main\res\mipmap-xhdpi\ic_launcher_foreground.webp" >nul 2>&1
call :backup "android\app\src\main\res\mipmap-xxhdpi\ic_launcher.webp"
if errorlevel 1 goto :copy_error
if exist "%TARGET%\android\app\src\main\res\mipmap-xxhdpi\ic_launcher.webp" del /Q "%TARGET%\android\app\src\main\res\mipmap-xxhdpi\ic_launcher.webp" >nul 2>&1
call :backup "android\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.webp"
if errorlevel 1 goto :copy_error
if exist "%TARGET%\android\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.webp" del /Q "%TARGET%\android\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.webp" >nul 2>&1
call :backup "android\app\src\main\res\mipmap-xxhdpi\ic_launcher_foreground.webp"
if errorlevel 1 goto :copy_error
if exist "%TARGET%\android\app\src\main\res\mipmap-xxhdpi\ic_launcher_foreground.webp" del /Q "%TARGET%\android\app\src\main\res\mipmap-xxhdpi\ic_launcher_foreground.webp" >nul 2>&1
call :backup "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.webp"
if errorlevel 1 goto :copy_error
if exist "%TARGET%\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.webp" del /Q "%TARGET%\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.webp" >nul 2>&1
call :backup "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.webp"
if errorlevel 1 goto :copy_error
if exist "%TARGET%\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.webp" del /Q "%TARGET%\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.webp" >nul 2>&1
call :backup "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_foreground.webp"
if errorlevel 1 goto :copy_error
if exist "%TARGET%\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_foreground.webp" del /Q "%TARGET%\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_foreground.webp" >nul 2>&1

echo [3/4] Installation des fichiers 3.1.2...
for /f "usebackq delims=" %%F in ("%PATCHROOT%\files.lst") do (
  call :install "%%F"
  if errorlevel 1 goto :copy_error
)

echo [4/4] Patch installe avec succes.
echo.
echo Sauvegarde : %BACKUP%
echo.
echo Pour preparer la release Android :
echo   %TARGET%\RELEASE_3.1.2.cmd
echo.
echo Version attendue : 3.1.2 / versionCode 44
echo.
echo Note : certains launchers Android peuvent conserver temporairement lancienne icone en cache.
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
echo ERREUR pendant la copie. Aucun build na ete lance.
echo Sauvegarde disponible : %BACKUP%
echo.
pause
exit /b 1
