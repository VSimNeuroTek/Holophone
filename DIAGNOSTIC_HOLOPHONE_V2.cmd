@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo ============================================================
echo  Holophone / Lumen - Diagnostic environnement V2
echo ============================================================
echo.
echo Dossier projet :
echo %ROOT%
echo.
echo Ce diagnostic est en lecture seule.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\diagnostic-holophone-v2.ps1" -ProjectRoot "%ROOT%"

echo.
if errorlevel 1 (
    echo Le diagnostic a rencontre une erreur.
    echo Envoie-moi tout de meme DIAGNOSTIC_ENVIRONNEMENT_V2.txt s'il existe.
) else (
    echo Diagnostic termine.
    echo Envoie-moi :
    echo   %ROOT%\DIAGNOSTIC_ENVIRONNEMENT_V2.txt
)
echo.
pause
