@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo   HOLOPHONE - PUBLICATION GITHUB RELEASE
echo ============================================================
echo.

set "VERSION=%~1"
if "%VERSION%"=="" (
    set /p "VERSION=Version a publier (ex: 3.2.2) : "
)

if "%VERSION%"=="" (
    echo [ERREUR] Aucune version fournie.
    pause
    exit /b 1
)

set "PS_SCRIPT=%CD%\scripts\publish-github-release.ps1"

if not exist "%PS_SCRIPT%" (
    echo [ERREUR] Script introuvable :
    echo %PS_SCRIPT%
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -Version "%VERSION%"
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
    echo ============================================================
    echo   PUBLICATION TERMINEE AVEC SUCCES
    echo ============================================================
) else (
    echo ============================================================
    echo   PUBLICATION INTERROMPUE - CODE ERREUR %RC%
    echo ============================================================
)

echo.
pause
exit /b %RC%
