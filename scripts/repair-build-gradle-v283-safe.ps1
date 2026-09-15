param()

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$GradlePath = Join-Path $ProjectRoot 'android\app\build.gradle'

if (-not (Test-Path $GradlePath)) {
    throw "Fichier introuvable : $GradlePath"
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$BackupPath = $GradlePath + '.before-v283-fix'

# Sauvegarde brute avant toute modification.
[IO.File]::Copy($GradlePath, $BackupPath, $true)

$lines = [IO.File]::ReadAllLines($GradlePath)
$fixedCorruption = $false
$foundVersionCode = $false
$foundVersionName = $false

for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    $trim = $line.Trim()
    $indentLength = $line.Length - $line.TrimStart().Length
    $indent = ''
    if ($indentLength -gt 0) {
        $indent = $line.Substring(0, $indentLength)
    }

    # Corruption exacte creee par l'ancien script : la ligne versionCode est devenue "$133".
    # On ne fait AUCUN remplacement regex avec $1/$2 ici.
    if ($trim -eq '$133') {
        $lines[$i] = $indent + 'versionCode 33'
        $fixedCorruption = $true
        $foundVersionCode = $true
        continue
    }

    if ($trim.StartsWith('versionCode ')) {
        $lines[$i] = $indent + 'versionCode 33'
        $foundVersionCode = $true
        continue
    }

    if ($trim.StartsWith('versionName ')) {
        $lines[$i] = $indent + 'versionName "2.8.3"'
        $foundVersionName = $true
        continue
    }
}

if (-not $foundVersionCode) {
    throw 'Impossible de trouver/reparer la ligne versionCode (ou $133).'
}
if (-not $foundVersionName) {
    throw 'Impossible de trouver la ligne versionName.'
}

[IO.File]::WriteAllLines($GradlePath, $lines, $Utf8NoBom)

# Verification APRES ecriture, en relisant physiquement le fichier.
$check = [IO.File]::ReadAllLines($GradlePath)
$hasBad = $false
$hasCode = $false
$hasName = $false
$codeLine = 0
$nameLine = 0

for ($i = 0; $i -lt $check.Length; $i++) {
    $trim = $check[$i].Trim()
    if ($trim -eq '$133') { $hasBad = $true }
    if ($trim -eq 'versionCode 33') {
        $hasCode = $true
        $codeLine = $i + 1
    }
    if ($trim -eq 'versionName "2.8.3"') {
        $hasName = $true
        $nameLine = $i + 1
    }
}

if ($hasBad) {
    throw 'ECHEC : $133 est encore present dans build.gradle apres ecriture.'
}
if (-not $hasCode) {
    throw 'ECHEC : versionCode 33 absent apres ecriture.'
}
if (-not $hasName) {
    throw 'ECHEC : versionName "2.8.3" absent apres ecriture.'
}

Write-Host ''
if ($fixedCorruption) {
    Write-Host 'Corruption $133 detectee et remplacee.' -ForegroundColor Yellow
}
Write-Host ("OK : versionCode 33 ligne " + $codeLine) -ForegroundColor Green
Write-Host ("OK : versionName 2.8.3 ligne " + $nameLine) -ForegroundColor Green
Write-Host ("Sauvegarde : " + $BackupPath) -ForegroundColor DarkGray
Write-Host ("Fichier : " + $GradlePath) -ForegroundColor DarkGray
