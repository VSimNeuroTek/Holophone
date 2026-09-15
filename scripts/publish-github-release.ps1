param(
    [Parameter(Mandatory = $true)]
    [string]$Version
)

$ErrorActionPreference = "Stop"

function Stop-Release {
    param([string]$Message)
    Write-Host ""
    Write-Host "[ERREUR] $Message" -ForegroundColor Red
    exit 1
}

function Run-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Exe,
        [Parameter(Mandatory = $false)][string[]]$Arguments = @()
    )

    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) {
        Stop-Release "La commande a echoue : $Exe $($Arguments -join ' ')"
    }
}

function Get-JoinedOutput {
    param(
        [Parameter(Mandatory = $true)][string]$Exe,
        [Parameter(Mandatory = $false)][string[]]$Arguments = @(),
        [switch]$AllowNonZero
    )

    $Lines = @(& $Exe @Arguments 2>$null)
    $Code = $LASTEXITCODE

    if (-not $AllowNonZero -and $Code -ne 0) {
        Stop-Release "La commande a echoue : $Exe $($Arguments -join ' ')"
    }

    return [PSCustomObject]@{
        Text = (($Lines -join "`n").Trim())
        Lines = $Lines
        ExitCode = $Code
    }
}

$Version = $Version.Trim()

if ($Version -notmatch '^\d+\.\d+\.\d+([.-][0-9A-Za-z.-]+)?$') {
    Stop-Release "Version invalide : '$Version'. Exemple attendu : 3.2.2"
}

$Tag = "v$Version"
$RepoName = "VSimNeuroTek/Holophone"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "============================================================"
Write-Host " HOLOPHONE - GitHub Release $Version"
Write-Host "============================================================"
Write-Host ""
Write-Host "Projet : $ProjectRoot"
Write-Host "Depot  : $RepoName"
Write-Host "Tag    : $Tag"
Write-Host ""

# -------------------------------------------------------------------
# Outils
# -------------------------------------------------------------------
if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {
    Stop-Release "Git n'est pas disponible dans le PATH."
}

if (-not (Get-Command gh.exe -ErrorAction SilentlyContinue)) {
    Stop-Release "GitHub CLI (gh) n'est pas disponible dans le PATH."
}

& gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    Stop-Release "GitHub CLI n'est pas authentifie. Lancez : gh auth login"
}

# -------------------------------------------------------------------
# Depot / branche
# -------------------------------------------------------------------
$RepoRootResult = Get-JoinedOutput -Exe "git" -Arguments @("rev-parse", "--show-toplevel")
$RepoRoot = $RepoRootResult.Text

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    Stop-Release "Le dossier courant n'est pas un depot Git."
}

$CurrentRoot = (Resolve-Path $ProjectRoot).Path
$ResolvedRepoRoot = (Resolve-Path $RepoRoot).Path

if ($ResolvedRepoRoot -ne $CurrentRoot) {
    Stop-Release "La racine Git ne correspond pas au dossier Holophone attendu."
}

$BranchResult = Get-JoinedOutput -Exe "git" -Arguments @("branch", "--show-current")
$Branch = $BranchResult.Text

if ($Branch -ne "main") {
    Stop-Release "La branche courante est '$Branch'. La publication doit etre faite depuis 'main'."
}

# -------------------------------------------------------------------
# Controle des fichiers sensibles
# -------------------------------------------------------------------
$TrackedResult = Get-JoinedOutput -Exe "git" -Arguments @("ls-files")
$TrackedFiles = @($TrackedResult.Lines)

$SensitiveTracked = @(
    $TrackedFiles | Where-Object {
        $_ -match '(?i)(^|/)(local\.properties|signing-config\.json)$' -or
        $_ -match '(?i)\.(jks|keystore)$' -or
        (
            $_ -match '(?i)^signing/' -and
            $_ -notmatch '(?i)^signing/README\.(md|txt)$'
        )
    }
)

if ($SensitiveTracked.Count -gt 0) {
    Write-Host ""
    Write-Host "Fichiers sensibles suivis par Git :" -ForegroundColor Red
    $SensitiveTracked | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
    Stop-Release "Publication bloquee pour eviter d'exposer des secrets ou une cle de signature."
}

$SecretResult = Get-JoinedOutput -Exe "git" -Arguments @(
    "grep", "-n", "-I", "-E", "AIza[0-9A-Za-z_-]{20,}", "--", "."
) -AllowNonZero

if ($SecretResult.ExitCode -eq 0 -and $SecretResult.Lines.Count -gt 0) {
    Write-Host ""
    Write-Host "Une chaine ressemblant a une cle Google a ete detectee :" -ForegroundColor Red
    $SecretResult.Lines | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    Stop-Release "Publication bloquee. Verifiez le resultat ci-dessus."
}
elseif ($SecretResult.ExitCode -gt 1) {
    Stop-Release "Erreur pendant le controle des cles API."
}

# -------------------------------------------------------------------
# Synchronisation GitHub
# -------------------------------------------------------------------
Write-Host "[1/8] Synchronisation avec GitHub..."
Run-Checked -Exe "git" -Arguments @("fetch", "origin")

$CountResult = Get-JoinedOutput -Exe "git" -Arguments @(
    "rev-list", "--left-right", "--count", "origin/main...main"
)

$CountText = $CountResult.Text
if ([string]::IsNullOrWhiteSpace($CountText)) {
    Stop-Release "Impossible de determiner l'ecart entre main local et origin/main."
}

$CountParts = @($CountText -split '\s+')
if ($CountParts.Count -lt 2) {
    Stop-Release "Reponse inattendue de git rev-list : '$CountText'"
}

$BehindCount = 0
$AheadCount = 0

if (-not [int]::TryParse($CountParts[0], [ref]$BehindCount)) {
    Stop-Release "Impossible de lire le nombre de commits de retard."
}

if (-not [int]::TryParse($CountParts[1], [ref]$AheadCount)) {
    Stop-Release "Impossible de lire le nombre de commits d'avance."
}

if ($BehindCount -gt 0) {
    Write-Host "La branche locale est en retard de $BehindCount commit(s)."
    Write-Host "Mise a jour automatique avec rebase/autostash..."
    Run-Checked -Exe "git" -Arguments @("pull", "--rebase", "--autostash", "origin", "main")
    Run-Checked -Exe "git" -Arguments @("fetch", "origin")
}

# -------------------------------------------------------------------
# Controle existence release / tag
# Aucune methode .Trim() n'est appelee sur une sortie native potentiellement vide.
# -------------------------------------------------------------------
$ReleaseListResult = Get-JoinedOutput -Exe "gh" -Arguments @(
    "release", "list",
    "--repo", $RepoName,
    "--limit", "100",
    "--json", "tagName"
)

$ExistingRelease = $false
if (-not [string]::IsNullOrWhiteSpace($ReleaseListResult.Text)) {
    try {
        $ReleaseObjects = @($ReleaseListResult.Text | ConvertFrom-Json)
        foreach ($ReleaseObject in $ReleaseObjects) {
            if ($null -ne $ReleaseObject -and $ReleaseObject.tagName -eq $Tag) {
                $ExistingRelease = $true
                break
            }
        }
    }
    catch {
        Stop-Release "Impossible de lire la liste des releases GitHub."
    }
}

if ($ExistingRelease) {
    Stop-Release "La release $Tag existe deja sur GitHub."
}

$LocalTagResult = Get-JoinedOutput -Exe "git" -Arguments @("tag", "--list", $Tag)

if (-not [string]::IsNullOrWhiteSpace($LocalTagResult.Text)) {
    Stop-Release "Le tag local $Tag existe deja."
}

$RemoteTagResult = Get-JoinedOutput -Exe "git" -Arguments @(
    "ls-remote", "--tags", "origin", "refs/tags/$Tag"
)

if (-not [string]::IsNullOrWhiteSpace($RemoteTagResult.Text)) {
    Stop-Release "Le tag distant $Tag existe deja."
}

# -------------------------------------------------------------------
# APK
# -------------------------------------------------------------------
Write-Host "[2/8] Recherche de l'APK $Version..."

$ReleaseDir = Join-Path $ProjectRoot "android\app\release"

if (-not (Test-Path $ReleaseDir)) {
    Stop-Release "Dossier de release Android introuvable : $ReleaseDir"
}

$CandidateNames = @(
    "Holophone$Version.apk",
    "Holophone.$Version.apk",
    "Holophone-$Version.apk",
    "Holophone_$Version.apk"
)

$ApkFile = $null

foreach ($Name in $CandidateNames) {
    $CandidatePath = Join-Path $ReleaseDir $Name

    if (Test-Path $CandidatePath) {
        $ApkFile = Get-Item $CandidatePath
        break
    }
}

if ($null -eq $ApkFile) {
    $VersionMatches = @(
        Get-ChildItem -Path $ReleaseDir -File -Filter "*.apk" |
        Where-Object { $_.Name -like "*$Version*" }
    )

    if ($VersionMatches.Count -eq 1) {
        $ApkFile = $VersionMatches[0]
    }
    elseif ($VersionMatches.Count -gt 1) {
        Write-Host "Plusieurs APK correspondent a la version :" -ForegroundColor Yellow
        $VersionMatches | ForEach-Object { Write-Host " - $($_.FullName)" }
        Stop-Release "Impossible de choisir automatiquement l'APK."
    }
}

if ($null -eq $ApkFile) {
    Stop-Release "Aucun APK contenant la version $Version n'a ete trouve dans android\app\release."
}

Write-Host "APK    : $($ApkFile.FullName)"
Write-Host "Taille : $([Math]::Round($ApkFile.Length / 1MB, 2)) MB"

$RelativeApk = $ApkFile.FullName.Substring($ProjectRoot.Length).TrimStart('\','/')
$RelativeApk = $RelativeApk.Replace('\','/')

& git check-ignore -q -- $RelativeApk
if ($LASTEXITCODE -ne 0) {
    Stop-Release "L'APK n'est pas ignore par .gitignore. Publication bloquee par securite."
}

# -------------------------------------------------------------------
# Notes de release
# -------------------------------------------------------------------
Write-Host "[3/8] Preparation des notes de release..."

$ChangesPath = Join-Path $ProjectRoot ("CHANGEMENTS_" + $Version + ".md")
$ReleaseNotesPath = Join-Path $ProjectRoot ("RELEASE_" + $Version + ".md")

$SourceNotes = $null

if (Test-Path $ChangesPath) {
    $SourceNotes = $ChangesPath
}
elseif (Test-Path $ReleaseNotesPath) {
    $SourceNotes = $ReleaseNotesPath
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$TempNotes = Join-Path $env:TEMP ("Holophone-release-notes-" + $Version + ".md")
$TempApk = Join-Path $env:TEMP ("Holophone." + $Version + ".apk")

$Header = @"
# Holophone $Version

Public release of Holophone $Version.

"@

$Footer = @"

## Installation

Download the APK attached to this release and install it manually on your Android device.

Android may ask you to authorize installation from unknown sources.

## API keys

Holophone does not include API credentials.
Users must provide their own API keys in the application settings for supported services.

## Project

Holophone is developed by VSim NeuroTek (VSNT).

**Connecting Mind & Bytes.**
"@

if ($null -ne $SourceNotes) {
    $Body = [System.IO.File]::ReadAllText(
        $SourceNotes,
        [System.Text.Encoding]::UTF8
    )

    $NotesContent = $Header + $Body.Trim() + "`r`n" + $Footer
}
else {
    $NotesContent = $Header +
        "This release contains the source changes committed for Holophone $Version." +
        "`r`n" +
        $Footer
}

[System.IO.File]::WriteAllText(
    $TempNotes,
    $NotesContent,
    $Utf8NoBom
)

Copy-Item -LiteralPath $ApkFile.FullName -Destination $TempApk -Force

try {
    # ----------------------------------------------------------------
    # Resume / confirmation
    # ----------------------------------------------------------------
    Write-Host "[4/8] Verification des changements a publier..."
    Write-Host ""
    & git status --short
    Write-Host ""

    Write-Host "Version : $Version"
    Write-Host "Tag     : $Tag"
    Write-Host "APK     : $($ApkFile.Name)"
    Write-Host ""

    $Answer = Read-Host "Publier Holophone $Version sur GitHub ? (O/N)"

    if ($Answer -notmatch '^(?i:o|oui|y|yes)$') {
        Write-Host "Publication annulee par l'utilisateur."
        exit 0
    }

    # ----------------------------------------------------------------
    # Commit
    # ----------------------------------------------------------------
    Write-Host "[5/8] Commit des sources..."
    Run-Checked -Exe "git" -Arguments @("add", "-A")

    & git diff --cached --quiet
    $DiffCode = $LASTEXITCODE

    if ($DiffCode -eq 1) {
        Run-Checked -Exe "git" -Arguments @(
            "commit", "-m", "Holophone $Version"
        )
    }
    elseif ($DiffCode -ne 0) {
        Stop-Release "Impossible de verifier les changements indexes."
    }
    else {
        Write-Host "Aucun nouveau changement source a committer."
    }

    # ----------------------------------------------------------------
    # Push
    # ----------------------------------------------------------------
    Write-Host "[6/8] Push de main..."
    Run-Checked -Exe "git" -Arguments @("push", "origin", "main")

    # ----------------------------------------------------------------
    # Tag
    # ----------------------------------------------------------------
    Write-Host "[7/8] Creation et push du tag $Tag..."
    Run-Checked -Exe "git" -Arguments @(
        "tag", "-a", $Tag, "-m", "Holophone $Version"
    )

    Run-Checked -Exe "git" -Arguments @(
        "push", "origin", $Tag
    )

    # ----------------------------------------------------------------
    # Release
    # ----------------------------------------------------------------
    Write-Host "[8/8] Creation de la release GitHub..."

    Run-Checked -Exe "gh" -Arguments @(
        "release", "create", $Tag,
        $TempApk,
        "--repo", $RepoName,
        "--title", "Holophone $Version",
        "--notes-file", $TempNotes,
        "--latest"
    )

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host " RELEASE HOLOPHONE $Version PUBLIEE AVEC SUCCES" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""

    & gh release view $Tag --repo $RepoName --web
}
finally {
    Remove-Item -LiteralPath $TempNotes -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $TempApk -Force -ErrorAction SilentlyContinue
}
