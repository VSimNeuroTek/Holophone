param()

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$AndroidRoot = Join-Path $ProjectRoot 'android'
$GradleProps = Join-Path $AndroidRoot 'gradle.properties'
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Get-JavaMajor {
    param([string]$JavaHome)
    if (-not $JavaHome) { return $null }
    $exe = Join-Path $JavaHome 'bin\java.exe'
    if (-not (Test-Path -LiteralPath $exe)) { return $null }
    try {
        $out = (& $exe -version 2>&1 | Out-String)
        if ($out -match '(?im)(?:openjdk|java)\s+version\s+"(?<major>\d+)') { return [int]$Matches['major'] }
        if ($out -match '(?im)\bversion\s+"(?<major>\d+)') { return [int]$Matches['major'] }
    } catch {}
    return $null
}

function Add-Candidate {
    param([System.Collections.Generic.List[string]]$List,[string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return }
    try {
        $expanded = [Environment]::ExpandEnvironmentVariables($Path.Trim('"'))
        $full = [IO.Path]::GetFullPath($expanded)
    } catch { return }
    $exe = Join-Path $full 'bin\java.exe'
    if ((Test-Path -LiteralPath $exe) -and -not $List.Contains($full)) {
        [void]$List.Add($full)
    }
}

function Add-JavaExeCandidate {
    param([System.Collections.Generic.List[string]]$List,[string]$JavaExe)
    if ([string]::IsNullOrWhiteSpace($JavaExe)) { return }
    try {
        if (-not (Test-Path -LiteralPath $JavaExe)) { return }
        $bin = Split-Path -Parent $JavaExe
        $home = Split-Path -Parent $bin
        Add-Candidate $List $home
    } catch {}
}

$candidates = New-Object 'System.Collections.Generic.List[string]'
Add-Candidate $candidates $env:JAVA_HOME

# 1) Emplacements usuels + emplacements IntelliJ/Android Studio Download JDK.
$roots = New-Object 'System.Collections.Generic.List[string]'
function Add-Root([string]$Path) {
    if (-not [string]::IsNullOrWhiteSpace($Path) -and (Test-Path -LiteralPath $Path) -and -not $roots.Contains($Path)) {
        [void]$roots.Add($Path)
    }
}

if ($env:ProgramFiles) {
    Add-Root (Join-Path $env:ProgramFiles 'Eclipse Adoptium')
    Add-Root (Join-Path $env:ProgramFiles 'Microsoft')
    Add-Root (Join-Path $env:ProgramFiles 'Java')
    Add-Root (Join-Path $env:ProgramFiles 'Zulu')
    Add-Root (Join-Path $env:ProgramFiles 'Amazon Corretto')
    Add-Root (Join-Path $env:ProgramFiles 'BellSoft')
    Add-Candidate $candidates (Join-Path $env:ProgramFiles 'Android\Android Studio\jbr')
}
if (${env:ProgramFiles(x86)}) {
    Add-Root (Join-Path ${env:ProgramFiles(x86)} 'Eclipse Adoptium')
    Add-Root (Join-Path ${env:ProgramFiles(x86)} 'Java')
}
if ($env:USERPROFILE) {
    Add-Root (Join-Path $env:USERPROFILE '.jdks')
    Add-Root (Join-Path $env:USERPROFILE 'scoop\apps')
}
if ($env:LOCALAPPDATA) {
    Add-Root (Join-Path $env:LOCALAPPDATA 'Programs\Eclipse Adoptium')
    Add-Root (Join-Path $env:LOCALAPPDATA 'Programs\Java')
    Add-Candidate $candidates (Join-Path $env:LOCALAPPDATA 'Programs\Android Studio\jbr')
}

foreach ($root in $roots) {
    # Racine elle-meme, enfants directs, puis recherche ciblee java.exe.
    Add-Candidate $candidates $root
    try {
        Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            Add-Candidate $candidates $_.FullName
        }
        Get-ChildItem -LiteralPath $root -Filter java.exe -File -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
            Add-JavaExeCandidate $candidates $_.FullName
        }
    } catch {}
}

# 2) Registre Java/Adoptium. Winget peut connaitre le paquet meme si son dossier n'est pas dans le PATH.
$registryRoots = @(
    'HKLM:\SOFTWARE\Eclipse Adoptium',
    'HKLM:\SOFTWARE\WOW6432Node\Eclipse Adoptium',
    'HKLM:\SOFTWARE\JavaSoft',
    'HKLM:\SOFTWARE\WOW6432Node\JavaSoft',
    'HKCU:\SOFTWARE\Eclipse Adoptium',
    'HKCU:\SOFTWARE\JavaSoft'
)
foreach ($rk in $registryRoots) {
    if (-not (Test-Path $rk)) { continue }
    try {
        Get-ChildItem -Path $rk -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                $p = Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue
                foreach ($name in @('Path','JavaHome','JAVA_HOME','InstallLocation')) {
                    if ($p -and $p.PSObject.Properties.Name -contains $name) {
                        Add-Candidate $candidates ([string]$p.$name)
                    }
                }
            } catch {}
        }
    } catch {}
}

# 3) Entrees Windows Uninstall (utile avec le MSI Temurin installe par winget).
$uninstallRoots = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
foreach ($ur in $uninstallRoots) {
    try {
        Get-ItemProperty $ur -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -match '(?i)(Temurin|Adoptium|OpenJDK|JDK\s*21|Java\s*21)' } |
            ForEach-Object {
                Add-Candidate $candidates ([string]$_.InstallLocation)
                if ($_.DisplayIcon) {
                    $icon = ([string]$_.DisplayIcon -replace ',\d+$','').Trim('"')
                    if ($icon -match '(?i)javaw?\.exe$') { Add-JavaExeCandidate $candidates $icon }
                }
            }
    } catch {}
}

# 4) java.exe visibles dans le PATH.
try {
    $where = & where.exe java.exe 2>$null
    foreach ($javaExe in $where) { Add-JavaExeCandidate $candidates ([string]$javaExe) }
} catch {}

# Affiche ce qui a ete reellement trouve; utile si un poste a plusieurs JDK.
Write-Host ''
Write-Host 'JDK/JRE detectes :' -ForegroundColor Cyan
if ($candidates.Count -eq 0) {
    Write-Host '  (aucun java.exe detecte dans les emplacements inspectes)' -ForegroundColor DarkGray
} else {
    foreach ($candidate in $candidates) {
        $major = Get-JavaMajor $candidate
        Write-Host ('  Java {0,-3}  {1}' -f ($(if ($major) {$major} else {'?'}), $candidate)) -ForegroundColor DarkGray
    }
}

$java21 = $null
foreach ($candidate in $candidates) {
    if ((Get-JavaMajor $candidate) -eq 21) {
        $java21 = $candidate
        break
    }
}

if (-not $java21) {
    Write-Host ''
    Write-Host 'JDK 21 introuvable par le script, bien que Winget puisse indiquer le paquet comme installe.' -ForegroundColor Red
    Write-Host 'Cela signifie en general que l''installation MSI est incomplete/orpheline ou situee dans un emplacement atypique.' -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'Solution la plus simple :' -ForegroundColor Cyan
    Write-Host '  1. Android Studio > Settings > Build, Execution, Deployment > Build Tools > Gradle' -ForegroundColor White
    Write-Host '  2. Gradle JDK > Download JDK...' -ForegroundColor White
    Write-Host '  3. Version 21, Vendor Eclipse Temurin (ou JetBrains Runtime), puis Download' -ForegroundColor White
    Write-Host '  4. Relancer 00_JAVA21_GRADLE.cmd' -ForegroundColor White
    Write-Host ''
    Write-Host 'Le script inspecte aussi C:\Users\<toi>\.jdks, donc le JDK telecharge par Android Studio sera trouve automatiquement.' -ForegroundColor White
    exit 21
}

$javaLine = (& (Join-Path $java21 'bin\java.exe') -version 2>&1 | Select-Object -First 1 | Out-String).Trim()
Write-Host ''
Write-Host ('JDK 21 retenu : ' + $java21) -ForegroundColor Green
Write-Host ('Version        : ' + $javaLine) -ForegroundColor DarkGray

# Force le JDK du daemon Gradle au niveau du projet.
$escaped = $java21.Replace('\','/')
$lineWanted = 'org.gradle.java.home=' + $escaped
$lines = @()
if (Test-Path -LiteralPath $GradleProps) { $lines = [IO.File]::ReadAllLines($GradleProps) }
$done = $false
for ($i=0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '^\s*org\.gradle\.java\.home\s*=') {
        $lines[$i] = $lineWanted
        $done = $true
    }
}
if (-not $done) { $lines = @($lines) + $lineWanted }
[IO.File]::WriteAllLines($GradleProps, $lines, $Utf8NoBom)
Write-Host ('Gradle fixe sur Java 21 via : ' + $GradleProps) -ForegroundColor Green

$env:JAVA_HOME = $java21
$env:Path = (Join-Path $java21 'bin') + ';' + $env:Path

Push-Location $AndroidRoot
try {
    Write-Host ''
    Write-Host 'Verification Gradle...' -ForegroundColor Cyan
    & .\gradlew.bat --stop 2>$null | Out-Null
    & .\gradlew.bat --version | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'gradlew --version a echoue.' }
    & .\gradlew.bat :app:tasks --quiet | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Gradle ne charge pas encore le module app.' }
}
finally { Pop-Location }

Write-Host ''
Write-Host 'OK - Gradle charge Holophone avec Java 21.' -ForegroundColor Green
Write-Host 'Tu peux maintenant lancer 02_PREPARER_ANDROID_STUDIO.cmd.' -ForegroundColor Green
