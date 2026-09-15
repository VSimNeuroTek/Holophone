@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1

REM ============================================================
REM  Holophone / Lumen - Diagnostic environnement de build
REM  Lecture seule : ce script ne modifie aucune configuration.
REM ============================================================

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "REPORT=%ROOT%\DIAGNOSTIC_ENVIRONNEMENT.txt"

> "%REPORT%" echo ============================================================
>>"%REPORT%" echo HOLOPHONE / LUMEN - DIAGNOSTIC ENVIRONNEMENT
>>"%REPORT%" echo ============================================================
>>"%REPORT%" echo Date : %DATE% %TIME%
>>"%REPORT%" echo Dossier du script : %ROOT%
>>"%REPORT%" echo.

echo.
echo ============================================================
echo  Diagnostic Holophone / Lumen
echo ============================================================
echo.
echo Le rapport sera cree ici :
echo %REPORT%
echo.
echo Aucune configuration Windows ne sera modifiee.
echo.

call :section "1. WINDOWS / MACHINE"
call :run "ver"
call :run "wmic os get Caption,Version,BuildNumber,OSArchitecture /value"
call :run "wmic computersystem get SystemType /value"
call :run "where powershell"
call :run "powershell -NoProfile -Command ""$PSVersionTable | Format-List *"""
call :run "where pwsh"
call :run "pwsh -NoProfile -Command ""$PSVersionTable | Format-List *"""

call :section "2. VARIABLES D'ENVIRONNEMENT IMPORTANTES"
call :echoenv JAVA_HOME
call :echoenv JDK_HOME
call :echoenv ANDROID_HOME
call :echoenv ANDROID_SDK_ROOT
call :echoenv ANDROID_USER_HOME
call :echoenv GRADLE_HOME
call :echoenv GRADLE_USER_HOME
call :echoenv NODE_HOME
call :echoenv NVM_HOME
call :echoenv NVM_SYMLINK
>>"%REPORT%" echo PATH=
>>"%REPORT%" echo %PATH%
>>"%REPORT%" echo.

call :section "3. JAVA - COMMANDES ACTUELLEMENT RESOLUES"
call :run "where java"
call :run "java -version"
call :run "where javac"
call :run "javac -version"
call :run "where keytool"
call :run "keytool -help"

call :section "4. INSTALLATIONS JAVA / JDK / JBR DETECTEES"
call :run "powershell -NoProfile -ExecutionPolicy Bypass -Command ""$roots=@('C:\Program Files\Java','C:\Program Files\Eclipse Adoptium','C:\Program Files\Microsoft','C:\Program Files\Zulu','C:\Program Files\BellSoft','C:\Program Files\Amazon Corretto','C:\Program Files\Android\Android Studio','C:\Program Files\Android','C:\Program Files (x86)\Java'); foreach($r in $roots){ if(Test-Path $r){ Write-Host ('--- '+$r); Get-ChildItem $r -Directory -ErrorAction SilentlyContinue | Select-Object FullName,LastWriteTime | Format-Table -AutoSize } }"""
call :run "powershell -NoProfile -ExecutionPolicy Bypass -Command ""$c=@(); $bases=@('C:\Program Files','C:\Program Files (x86)'); foreach($b in $bases){ if(Test-Path $b){ $c += Get-ChildItem $b -Filter java.exe -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match '\\(bin|jbr)\\java\.exe$' } } ; $c | Select-Object -ExpandProperty FullName -Unique"""
call :run "powershell -NoProfile -ExecutionPolicy Bypass -Command ""$paths=Get-ChildItem 'C:\Program Files' -Filter java.exe -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match '\\bin\\java\.exe$' } | Select-Object -ExpandProperty FullName -Unique; foreach($p in $paths){ Write-Host ('--- '+$p); & $p -version 2>&1 }"""

call :section "5. REGISTRE JAVA"
call :run "reg query ""HKLM\SOFTWARE\JavaSoft"" /s"
call :run "reg query ""HKLM\SOFTWARE\Eclipse Adoptium"" /s"
call :run "reg query ""HKLM\SOFTWARE\Microsoft\JDK"" /s"
call :run "reg query ""HKLM\SOFTWARE\WOW6432Node\JavaSoft"" /s"

call :section "6. NODE / NPM / NPX"
call :run "where node"
call :run "node --version"
call :run "where npm"
call :run "npm --version"
call :run "where npx"
call :run "npx --version"
call :run "npm config get prefix"
call :run "npm config get cache"
call :run "npm root -g"

call :section "7. CAPACITOR - PROJET HOLOPHONE"
if exist "%ROOT%\package.json" (
  call :run "type ""%ROOT%\package.json"""
  pushd "%ROOT%" >nul
  call :run "npm list --depth=0"
  call :run "npx cap --version"
  call :run "npx cap doctor"
  popd >nul
) else (
  >>"%REPORT%" echo package.json introuvable dans %ROOT%
  >>"%REPORT%" echo Le script devrait normalement etre place a la racine de Bureau\Holophone.
  >>"%REPORT%" echo.
)

if exist "%ROOT%\capacitor.config.json" (
  call :section "8. CONFIGURATION CAPACITOR"
  call :run "type ""%ROOT%\capacitor.config.json"""
)
if exist "%ROOT%\capacitor.config.ts" (
  call :section "8B. CONFIGURATION CAPACITOR TYPESCRIPT"
  call :run "type ""%ROOT%\capacitor.config.ts"""
)

call :section "9. ANDROID STUDIO"
call :run "where studio64.exe"
call :run "where studio.exe"
call :run "powershell -NoProfile -ExecutionPolicy Bypass -Command ""$p=@('C:\Program Files\Android\Android Studio','C:\Program Files\Android\Android Studio Preview'); foreach($x in $p){ if(Test-Path $x){ Write-Host ('--- '+$x); Get-ChildItem $x -Force | Select-Object Name,FullName,LastWriteTime | Format-Table -AutoSize; $j=Join-Path $x 'jbr\bin\java.exe'; if(Test-Path $j){ Write-Host ('JBR : '+$j); & $j -version 2>&1 } } }"""
call :run "reg query ""HKLM\SOFTWARE\Android Studio"" /s"
call :run "reg query ""HKCU\SOFTWARE\Google\AndroidStudio*"" /s"

call :section "10. ANDROID SDK"
call :run "where adb"
call :run "adb version"
call :run "where sdkmanager"
call :run "sdkmanager --version"
call :run "where avdmanager"
call :run "avdmanager --version"

REM Detection SDK via variables + emplacements usuels
call :run "powershell -NoProfile -ExecutionPolicy Bypass -Command ""$roots=@($env:ANDROID_HOME,$env:ANDROID_SDK_ROOT,(Join-Path $env:LOCALAPPDATA 'Android\Sdk')); $roots=$roots | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique; foreach($r in $roots){ Write-Host ('SDK ROOT: '+$r); foreach($d in @('platforms','build-tools','platform-tools','cmdline-tools','emulator')){ $p=Join-Path $r $d; if(Test-Path $p){ Write-Host ('--- '+$p); Get-ChildItem $p -Directory -ErrorAction SilentlyContinue | Select-Object Name,FullName,LastWriteTime | Format-Table -AutoSize } } }"""

call :section "11. BUILD-TOOLS : APKSIGNER / ZIPALIGN / AAPT2"
call :run "where apksigner"
call :run "apksigner version"
call :run "where zipalign"
call :run "zipalign -h"
call :run "where aapt2"
call :run "aapt2 version"
call :run "powershell -NoProfile -ExecutionPolicy Bypass -Command ""$sdk=@($env:ANDROID_HOME,$env:ANDROID_SDK_ROOT,(Join-Path $env:LOCALAPPDATA 'Android\Sdk')) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1; if($sdk){ $bt=Join-Path $sdk 'build-tools'; if(Test-Path $bt){ Get-ChildItem $bt -Directory | Sort-Object Name -Descending | ForEach-Object { Write-Host ('--- Build-tools '+$_.Name); foreach($f in @('apksigner.bat','zipalign.exe','aapt2.exe')){ $p=Join-Path $_.FullName $f; if(Test-Path $p){ Write-Host $p } } } } }"""

call :section "12. GRADLE DU PROJET"
if exist "%ROOT%\android\gradlew.bat" (
  call :run "type ""%ROOT%\android\gradle\wrapper\gradle-wrapper.properties"""
  if exist "%ROOT%\android\gradle.properties" call :run "type ""%ROOT%\android\gradle.properties"""
  if exist "%ROOT%\android\settings.gradle" call :run "type ""%ROOT%\android\settings.gradle"""
  if exist "%ROOT%\android\build.gradle" call :run "type ""%ROOT%\android\build.gradle"""
  if exist "%ROOT%\android\variables.gradle" call :run "type ""%ROOT%\android\variables.gradle"""
  if exist "%ROOT%\android\app\build.gradle" call :run "type ""%ROOT%\android\app\build.gradle"""
  pushd "%ROOT%\android" >nul
  call :run "gradlew.bat --version"
  call :run "gradlew.bat -q javaToolchains"
  popd >nul
) else (
  >>"%REPORT%" echo android\gradlew.bat introuvable.
  >>"%REPORT%" echo.
)

call :section "13. OUTILS DE DEVELOPPEMENT COMPLEMENTAIRES"
call :run "where git"
call :run "git --version"
call :run "where gradle"
call :run "gradle --version"

call :section "14. FICHIERS / DOSSIERS DU PROJET"
call :run "dir ""%ROOT%"""
if exist "%ROOT%\android" call :run "dir ""%ROOT%\android"""
if exist "%ROOT%\www" call :run "dir ""%ROOT%\www"""

call :section "15. RESUME CIBLE - EXECUTABLES RESOLUS"
call :whereonly java
call :whereonly javac
call :whereonly keytool
call :whereonly node
call :whereonly npm
call :whereonly npx
call :whereonly adb
call :whereonly sdkmanager
call :whereonly apksigner
call :whereonly zipalign
call :whereonly git

>>"%REPORT%" echo ============================================================
>>"%REPORT%" echo FIN DU DIAGNOSTIC
>>"%REPORT%" echo ============================================================
>>"%REPORT%" echo.
>>"%REPORT%" echo IMPORTANT :
>>"%REPORT%" echo Ce rapport ne recherche pas et n'affiche pas les mots de passe
>>"%REPORT%" echo ni le contenu de la cle privee de signature.
>>"%REPORT%" echo.

echo.
echo ============================================================
echo  Diagnostic termine
echo ============================================================
echo.
echo Rapport :
echo %REPORT%
echo.
echo Envoie-moi simplement le fichier DIAGNOSTIC_ENVIRONNEMENT.txt.
echo.
pause
exit /b 0


:section
>>"%REPORT%" echo.
>>"%REPORT%" echo ============================================================
>>"%REPORT%" echo %~1
>>"%REPORT%" echo ============================================================
exit /b 0

:echoenv
>>"%REPORT%" echo %~1 = !%~1!
exit /b 0

:run
>>"%REPORT%" echo.
>>"%REPORT%" echo ^> %~1
cmd /d /c "%~1" >>"%REPORT%" 2>&1
>>"%REPORT%" echo [exitcode=!ERRORLEVEL!]
exit /b 0

:whereonly
>>"%REPORT%" echo.
>>"%REPORT%" echo --- %~1 ---
where %~1 >>"%REPORT%" 2>&1
exit /b 0
