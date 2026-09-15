param(
    [Parameter(Position = 0)]
    [string]$Target
)

$ErrorActionPreference = 'Stop'

$PatchRoot = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($Target)) {
    $Target = Join-Path $env:USERPROFILE 'Desktop\Holophone'
}

$FilesRoot = Join-Path $PatchRoot 'files'
$ManifestPath = Join-Path $PatchRoot 'files.lst'
$BackupRoot = Join-Path $Target '_backup_patch_3.2.3'
$IndexPath = Join-Path $Target 'www\index.html'

function Normalize-RelativePath {
    param([string]$Path)
    return (($Path.Trim()) -replace '/', '\')
}

function Ensure-ParentDirectory {
    param([string]$FilePath)
    $parent = [System.IO.Path]::GetDirectoryName($FilePath)
    if (-not [string]::IsNullOrWhiteSpace($parent)) {
        [System.IO.Directory]::CreateDirectory($parent) | Out-Null
    }
}

if (-not (Test-Path -LiteralPath $IndexPath -PathType Leaf)) {
    Write-Host 'ERREUR : projet Holophone introuvable.' -ForegroundColor Red
    Write-Host ('Chemin attendu : ' + $Target)
    Write-Host ''
    Write-Host 'Utilisation alternative :'
    Write-Host '  APPLIQUER_PATCH_3.2.3.cmd "C:\chemin\vers\Holophone"'
    exit 1
}

$currentIndex = [IO.File]::ReadAllText($IndexPath)
$currentVersion = $null
$m = [regex]::Match($currentIndex, "const\s+APPV\s*=\s*'([^']+)'")
if ($m.Success) { $currentVersion = $m.Groups[1].Value }
if (($currentVersion -ne '3.1.4') -and ($currentVersion -ne '3.2.0') -and ($currentVersion -ne '3.2.1') -and ($currentVersion -ne '3.2.2') -and ($currentVersion -ne '3.2.3')) {
    Write-Host ('ERREUR : ce patch cumulatif attend Holophone 3.1.4, 3.2.0, 3.2.1, 3.2.2 ou 3.2.3. Version detectee : ' + $currentVersion) -ForegroundColor Red
    Write-Host 'Si ton projet est sur une autre version, applique les lots intermediaires ou utilise la source de reference correspondante.'
    exit 1
}

if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
    Write-Host ('ERREUR : manifeste introuvable : ' + $ManifestPath) -ForegroundColor Red
    exit 1
}

$Files = @(
    Get-Content -LiteralPath $ManifestPath |
        ForEach-Object { Normalize-RelativePath $_ } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
)

$OriginalFiles = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
$TouchedFiles = New-Object 'System.Collections.Generic.List[string]'
$InstallStarted = $false

function Backup-OneFile {
    param([string]$RelativePath)
    $src = Join-Path $Target $RelativePath
    if (-not (Test-Path -LiteralPath $src -PathType Leaf)) { return }
    [void]$OriginalFiles.Add($RelativePath)
    $dst = Join-Path $BackupRoot $RelativePath
    Ensure-ParentDirectory $dst
    Copy-Item -LiteralPath $src -Destination $dst -Force
}

function Rollback-Patch {
    Write-Host ''
    Write-Host 'Rollback automatique en cours...' -ForegroundColor Yellow
    foreach ($relativePath in $TouchedFiles) {
        $dst = Join-Path $Target $relativePath
        $bak = Join-Path $BackupRoot $relativePath
        try {
            if ($OriginalFiles.Contains($relativePath) -and (Test-Path -LiteralPath $bak -PathType Leaf)) {
                Ensure-ParentDirectory $dst
                Copy-Item -LiteralPath $bak -Destination $dst -Force
            }
            elseif (Test-Path -LiteralPath $dst -PathType Leaf) {
                Remove-Item -LiteralPath $dst -Force
            }
        }
        catch {
            Write-Host ('  AVERTISSEMENT rollback : ' + $relativePath + ' : ' + $_.Exception.Message) -ForegroundColor Yellow
        }
    }
}

function Preserve-ReleaseSigner {
    $relative = 'release-state.json'
    $targetState = Join-Path $Target $relative
    $backupState = Join-Path $BackupRoot $relative
    if (-not (Test-Path -LiteralPath $backupState -PathType Leaf)) { return }
    try {
        $old = Get-Content -LiteralPath $backupState -Raw | ConvertFrom-Json
        $new = Get-Content -LiteralPath $targetState -Raw | ConvertFrom-Json
        if (-not [string]::IsNullOrWhiteSpace([string]$old.signerSha256)) {
            $new.signerSha256 = [string]$old.signerSha256
        }
        $new.lastVersionName = '3.2.3'
        $new.lastVersionCode = 50
        $json = $new | ConvertTo-Json -Depth 8
        [IO.File]::WriteAllText($targetState, $json + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))
    }
    catch {
        throw ('Impossible de conserver release-state.json : ' + $_.Exception.Message)
    }
}

Write-Host '============================================================'
Write-Host ' HOLOPHONE - PATCH 3.2.3 - VSNT SYSTEM PROFILE'
Write-Host '============================================================'
Write-Host ''
Write-Host ('Cible : ' + $Target)
Write-Host ('Version source : ' + $currentVersion)
Write-Host ''

try {
    Write-Host '[1/4] Verification du contenu du patch...'
    foreach ($relativePath in $Files) {
        $src = Join-Path $FilesRoot $relativePath
        if (-not (Test-Path -LiteralPath $src -PathType Leaf)) {
            throw ('Fichier du patch introuvable : ' + $src)
        }
    }

    Write-Host '[2/4] Sauvegarde des fichiers existants...'
    [System.IO.Directory]::CreateDirectory($BackupRoot) | Out-Null
    foreach ($relativePath in $Files) { Backup-OneFile $relativePath }

    Write-Host '[3/4] Installation des fichiers 3.2.3...'
    $InstallStarted = $true
    foreach ($relativePath in $Files) {
        $src = Join-Path $FilesRoot $relativePath
        $dst = Join-Path $Target $relativePath
        Ensure-ParentDirectory $dst
        Copy-Item -LiteralPath $src -Destination $dst -Force
        [void]$TouchedFiles.Add($relativePath)
    }
    Preserve-ReleaseSigner

    $installedIndex = [IO.File]::ReadAllText($IndexPath)
    if ($installedIndex -notmatch [regex]::Escape("const APPV='3.2.3'")) {
        throw 'Verification finale impossible : APPV 3.2.3 absent.'
    }

    Write-Host '[4/4] Patch installe avec succes.' -ForegroundColor Green
    Write-Host ''
    Write-Host ('Sauvegarde : ' + $BackupRoot)
    Write-Host ''
    Write-Host 'Pour preparer la release Android :'
    Write-Host ('  ' + (Join-Path $Target 'RELEASE_3.2.3.cmd'))
    Write-Host ''
    Write-Host 'Version attendue : 3.2.3 / versionCode 50 / schema 3200'
    exit 0
}
catch {
    Write-Host ''
    Write-Host ('ERREUR : ' + $_.Exception.Message) -ForegroundColor Red
    if ($InstallStarted) { Rollback-Patch }
    Write-Host ''
    Write-Host 'Aucun build na ete lance.'
    Write-Host ('Sauvegarde disponible : ' + $BackupRoot)
    exit 1
}
