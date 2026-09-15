param([string]$ApkPath)
$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$State = Get-Content -Raw (Join-Path $ProjectRoot 'release-state.json') | ConvertFrom-Json

if (-not $ApkPath) {
    $latest = Get-ChildItem (Join-Path $ProjectRoot 'releases') -Filter 'Lumen-v*-code*.apk' -File |
        Where-Object { $_.Name -notmatch 'INCORRECTE' } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) { throw 'Aucune release signee trouvee.' }
    $ApkPath = $latest.FullName
}

$sdk = $env:ANDROID_SDK_ROOT
if (-not $sdk) { $sdk = $env:ANDROID_HOME }
if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$adb = Join-Path $sdk 'platform-tools\adb.exe'
if (-not (Test-Path $adb)) { throw "adb.exe introuvable : $adb" }

Write-Host "APK : $ApkPath" -ForegroundColor Cyan
& $adb devices
if ($LASTEXITCODE -ne 0) { throw 'adb devices a echoue.' }

$installed = (& $adb shell pm list packages com.mudva.lumen 2>$null | Out-String)
$firstNewRelease = ([int]$State.lastVersionCode -eq 1)
if ($installed -match 'package:com\.mudva\.lumen' -and $firstNewRelease) {
    Write-Host ''
    Write-Host 'Une application com.mudva.lumen est deja installee.' -ForegroundColor Yellow
    Write-Host 'Comme ce nouveau projet utilise une NOUVELLE signature, l ancienne Lumen doit etre desinstallee une seule fois.' -ForegroundColor Yellow
    Write-Host 'ATTENTION : cette desinstallation effacera ses donnees locales.' -ForegroundColor Red
    $ok = Read-Host 'Tape exactement DESINSTALLER pour supprimer l ancienne application et continuer'
    if ($ok -ne 'DESINSTALLER') { exit 0 }
    & $adb uninstall com.mudva.lumen
    if ($LASTEXITCODE -ne 0) { throw 'Desinstallation de l ancienne application echouee.' }
    & $adb install $ApkPath
} else {
    & $adb install -r $ApkPath
}
if ($LASTEXITCODE -ne 0) { throw 'Installation adb echouee.' }
Write-Host 'Installation terminee.' -ForegroundColor Green
