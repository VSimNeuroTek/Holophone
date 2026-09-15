$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SigningDir = Join-Path $ProjectRoot 'signing'
$Keystore = Join-Path $SigningDir 'lumen-release.jks'
$Config = Join-Path $ProjectRoot 'signing-config.json'
$Alias = 'lumen'

function Find-Keytool {
    $cmd = Get-Command keytool.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    if ($env:JAVA_HOME) {
        $p = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
        if (Test-Path $p) { return $p }
    }
    $candidates = @(
        (Join-Path $env:ProgramFiles 'Android\Android Studio\jbr\bin\keytool.exe'),
        (Join-Path $env:ProgramFiles 'Android\Android Studio\jre\bin\keytool.exe')
    )
    foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
    throw 'keytool.exe introuvable. Installe Android Studio/JDK ou configure JAVA_HOME.'
}

$keytool = Find-Keytool
New-Item -ItemType Directory -Force -Path $SigningDir | Out-Null

if (Test-Path $Keystore) {
    Write-Host "Un keystore existe deja : $Keystore" -ForegroundColor Yellow
    Write-Host 'Il NE faut PAS le recreer si des APK de ce nouveau projet ont deja ete installees.' -ForegroundColor Yellow
    $answer = Read-Host 'Remplacer definitivement cette cle ? Tape exactement OUI pour continuer'
    if ($answer -ne 'OUI') { exit 0 }
    $backup = "$Keystore.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $Keystore $backup
    Write-Host "Sauvegarde creee : $backup" -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Creation de la NOUVELLE signature Lumen.' -ForegroundColor Cyan
Write-Host 'keytool va demander un mot de passe. CONSERVE-LE PRECIEUSEMENT.' -ForegroundColor Yellow
Write-Host 'Utilise le meme mot de passe pour le keystore et la cle si keytool le demande.' -ForegroundColor Yellow
Write-Host ''

& $keytool -genkeypair -v `
    -keystore $Keystore `
    -alias $Alias `
    -keyalg RSA `
    -keysize 4096 `
    -validity 10000 `
    -dname 'CN=Lumen Release, O=Lumen, C=FR'
if ($LASTEXITCODE -ne 0) { throw 'Creation du keystore echouee.' }

@{
    keystorePath = 'signing/lumen-release.jks'
    alias = $Alias
} | ConvertTo-Json | Set-Content -Encoding UTF8 $Config

Write-Host ''
Write-Host 'NOUVELLE CLE CREEE.' -ForegroundColor Green
Write-Host "Keystore : $Keystore" -ForegroundColor Green
Write-Host "Alias    : $Alias" -ForegroundColor Green
Write-Host ''
Write-Host 'IMPORTANT : copie maintenant lumen-release.jks dans au moins deux emplacements de sauvegarde.' -ForegroundColor Yellow
Write-Host 'Ne perds jamais cette cle : elle signera toutes les futures versions de ce nouveau Lumen.' -ForegroundColor Yellow
