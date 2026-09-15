param()

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ConfigPath = Join-Path $ProjectRoot 'build-jdk.json'

function Invoke-Capture {
    param(
        [Parameter(Mandatory=$true)][string]$Executable,
        [string[]]$ArgumentList = @()
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $Executable
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true

    foreach ($item in $ArgumentList) {
        if ($item -match '[\s"]') {
            $escaped = $item.Replace('"', '\"')
            $psi.Arguments += ' "' + $escaped + '"'
        } else {
            $psi.Arguments += ' ' + $item
        }
    }

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    [void]$proc.Start()
    $stdout = $proc.StandardOutput.ReadToEnd()
    $stderr = $proc.StandardError.ReadToEnd()
    $proc.WaitForExit()

    return [pscustomobject]@{
        ExitCode = $proc.ExitCode
        StdOut = $stdout
        StdErr = $stderr
        Text = ($stdout + $stderr)
    }
}

function Get-JavaMajor {
    param([string]$JavaRoot)

    if (-not $JavaRoot) { return $null }
    $javaExe = Join-Path $JavaRoot 'bin\java.exe'
    if (-not (Test-Path $javaExe)) { return $null }

    try {
        $result = Invoke-Capture -Executable $javaExe -ArgumentList @('-version')
        if ($result.Text -match 'version\s+"(?<major>\d+)') {
            return [int]$Matches['major']
        }
    } catch {
        return $null
    }

    return $null
}

function Add-JavaCandidate {
    param(
        [System.Collections.Generic.List[string]]$CandidateList,
        [string]$CandidateRoot
    )

    if (-not $CandidateRoot) { return }

    try {
        $resolvedRoot = [IO.Path]::GetFullPath($CandidateRoot)
    } catch {
        return
    }

    if (-not (Test-Path (Join-Path $resolvedRoot 'bin\java.exe'))) { return }

    foreach ($existingRoot in $CandidateList) {
        if ($existingRoot -ieq $resolvedRoot) { return }
    }

    [void]$CandidateList.Add($resolvedRoot)
}

function Find-Jdk21 {
    $candidateList = New-Object 'System.Collections.Generic.List[string]'

    if (Test-Path $ConfigPath) {
        try {
            $saved = Get-Content -Raw $ConfigPath | ConvertFrom-Json
            Add-JavaCandidate $candidateList ([string]$saved.javaHome)
        } catch {}
    }

    Add-JavaCandidate $candidateList $env:JAVA_HOME

    try {
        $javaCommands = Get-Command java.exe -All -ErrorAction SilentlyContinue
        foreach ($javaCommand in $javaCommands) {
            $binDir = Split-Path -Parent $javaCommand.Source
            Add-JavaCandidate $candidateList (Split-Path -Parent $binDir)
        }
    } catch {}

    $searchRoots = @(
        (Join-Path $env:ProgramFiles 'Microsoft'),
        (Join-Path $env:ProgramFiles 'Eclipse Adoptium'),
        (Join-Path $env:ProgramFiles 'Java'),
        (Join-Path $env:ProgramFiles 'Zulu'),
        (Join-Path $env:ProgramFiles 'Amazon Corretto')
    )

    foreach ($searchRoot in $searchRoots) {
        if (-not $searchRoot) { continue }
        if (-not (Test-Path $searchRoot)) { continue }

        try {
            foreach ($dir in Get-ChildItem -Path $searchRoot -Directory -ErrorAction SilentlyContinue) {
                Add-JavaCandidate $candidateList $dir.FullName
            }
        } catch {}
    }

    foreach ($candidateRoot in $candidateList) {
        $major = Get-JavaMajor $candidateRoot
        if ($major -eq 21) {
            return $candidateRoot
        }
    }

    return $null
}

function Save-JdkConfig {
    param([string]$JavaRoot)

    $payload = [ordered]@{
        javaHome = $JavaRoot
        major = 21
        configuredAt = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
    } | ConvertTo-Json

    [IO.File]::WriteAllText(
        $ConfigPath,
        $payload,
        (New-Object System.Text.UTF8Encoding($false))
    )

    # Android Studio normally uses GRADLE_LOCAL_JAVA_HOME for recent projects.
    # Writing this local project file also lets Android Studio use the same JDK.
    $androidRoot = Join-Path $ProjectRoot 'android'
    if (Test-Path $androidRoot) {
        $gradleLocalDir = Join-Path $androidRoot '.gradle'
        New-Item -ItemType Directory -Path $gradleLocalDir -Force | Out-Null
        $gradleLocalConfig = Join-Path $gradleLocalDir 'config.properties'
        $forwardPath = $JavaRoot.Replace('\', '/')
        [IO.File]::WriteAllText(
            $gradleLocalConfig,
            ('java.home=' + $forwardPath + [Environment]::NewLine),
            (New-Object System.Text.UTF8Encoding($false))
        )
    }
}

Write-Host ''
Write-Host 'Recherche d un JDK 21 deja installe...' -ForegroundColor Cyan

$jdk21Root = Find-Jdk21
if ($jdk21Root) {
    Save-JdkConfig $jdk21Root
    Write-Host "JDK 21 deja disponible : $jdk21Root" -ForegroundColor Green
    exit 0
}

Write-Host 'Aucun JDK 21 detecte.' -ForegroundColor Yellow
Write-Host ''
Write-Host 'Installation de Microsoft OpenJDK 21 avec winget...' -ForegroundColor Cyan
Write-Host 'Une demande UAC Windows peut apparaitre.' -ForegroundColor DarkGray

$winget = Get-Command winget.exe -ErrorAction SilentlyContinue
if (-not $winget) {
    throw @"
winget.exe est introuvable.

Installe Microsoft OpenJDK 21 manuellement avec :
  winget install --id Microsoft.OpenJDK.21 --exact

Puis relance 05_FINIR_PREMIERE_RELEASE.cmd.
"@
}

$wingetArgs = @(
    'install',
    '--id', 'Microsoft.OpenJDK.21',
    '--exact',
    '--accept-package-agreements',
    '--accept-source-agreements'
)

& $winget.Source @wingetArgs
$wingetExitCode = $LASTEXITCODE

if (($wingetExitCode -ne 0) -and ($wingetExitCode -ne -1978335189)) {
    # Some winget versions return a non-zero code when the exact package is already installed.
    Write-Host "winget a retourne le code $wingetExitCode. Nouvelle detection du JDK..." -ForegroundColor Yellow
}

Start-Sleep -Seconds 2

$jdk21Root = Find-Jdk21
if (-not $jdk21Root) {
    throw @"
Microsoft OpenJDK 21 n a pas pu etre localise apres l installation.

Commande manuelle officielle :
  winget install --id Microsoft.OpenJDK.21 --exact

Une fois l installation terminee, relance 05_FINIR_PREMIERE_RELEASE.cmd.
"@
}

Save-JdkConfig $jdk21Root

Write-Host ''
Write-Host 'JDK 21 pret pour Holophone.' -ForegroundColor Green
Write-Host "Chemin : $jdk21Root" -ForegroundColor Green
Write-Host ''
Write-Host 'Le JAVA_HOME global de Windows n est pas modifie par les scripts Holophone.' -ForegroundColor DarkGray
Write-Host 'Le build utilisera ce JDK uniquement dans son propre processus.' -ForegroundColor DarkGray
exit 0
