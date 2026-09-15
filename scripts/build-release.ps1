param(
    [string]$VersionName,
    [int]$VersionCode
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$StatePath = Join-Path $ProjectRoot 'release-state.json'
$SigningConfigPath = Join-Path $ProjectRoot 'signing-config.json'
$JdkConfigPath = Join-Path $ProjectRoot 'build-jdk.json'

function Invoke-Capture {
    param(
        [Parameter(Mandatory=$true)][string]$Executable,
        [string[]]$ArgumentList = @(),
        [string]$WorkingDirectory = $null
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $Executable
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true

    if ($WorkingDirectory) {
        $psi.WorkingDirectory = $WorkingDirectory
    }

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
    } catch {}

    return $null
}

function Get-BuildJdk21 {
    if (Test-Path $JdkConfigPath) {
        try {
            $saved = Get-Content -Raw $JdkConfigPath | ConvertFrom-Json
            $savedRoot = [string]$saved.javaHome
            if ((Get-JavaMajor $savedRoot) -eq 21) {
                return $savedRoot
            }
        } catch {}
    }

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
                if ((Get-JavaMajor $dir.FullName) -eq 21) {
                    return $dir.FullName
                }
            }
        } catch {}
    }

    return $null
}

function Invoke-NativeConsole {
    param(
        [Parameter(Mandatory=$true)][string]$Executable,
        [string[]]$ArgumentList = @()
    )

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $Executable @ArgumentList
        return $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
}

if (-not (Test-Path $StatePath)) {
    throw "release-state.json introuvable : $StatePath"
}

if (-not (Test-Path $SigningConfigPath)) {
    throw 'Signature non initialisee. Lance d abord 01_CREER_NOUVELLE_SIGNATURE.cmd.'
}

$signing = Get-Content -Raw $SigningConfigPath | ConvertFrom-Json
$KeystorePath = [string]$signing.keystorePath
if (-not [IO.Path]::IsPathRooted($KeystorePath)) {
    $KeystorePath = Join-Path $ProjectRoot $KeystorePath
}
$Alias = [string]$signing.alias

if (-not (Test-Path $KeystorePath)) {
    throw "Keystore introuvable : $KeystorePath"
}

$state = Get-Content -Raw $StatePath | ConvertFrom-Json
$lastCode = [int]$state.lastVersionCode
$expectedSigner = ([string]$state.signerSha256 -replace ':','').ToUpperInvariant()

if (-not $VersionName) {
    if ($lastCode -eq 0) {
        $defaultName = '1.0'
    } else {
        $defaultName = [string]$state.lastVersionName
    }

    $rawName = Read-Host "VersionName [$defaultName]"
    if ($rawName) {
        $VersionName = $rawName
    } else {
        $VersionName = $defaultName
    }
}

if (-not $VersionCode) {
    $defaultCode = $lastCode + 1
    $rawCode = Read-Host "VersionCode Android [$defaultCode]"
    if ($rawCode) {
        $VersionCode = [int]$rawCode
    } else {
        $VersionCode = $defaultCode
    }
}

if ($VersionCode -le $lastCode) {
    throw "VersionCode $VersionCode invalide : il doit etre > $lastCode."
}

Write-Host ''
Write-Host "Release demandee : Lumen $VersionName / code $VersionCode" -ForegroundColor Green

Write-Host "`n1/7 - Synchronisation Capacitor..." -ForegroundColor Cyan
$syncExit = Invoke-NativeConsole -Executable 'npx.cmd' -ArgumentList @('cap','sync','android')
if ($syncExit -ne 0) {
    throw 'npx cap sync android a echoue.'
}

Write-Host "`n2/7 - Configuration Android..." -ForegroundColor Cyan
$configScript = Join-Path $PSScriptRoot 'configure-android.ps1'
$configExit = Invoke-NativeConsole -Executable 'powershell.exe' -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $configScript,
    '-VersionName', $VersionName,
    '-VersionCode', [string]$VersionCode
)
if ($configExit -ne 0) {
    throw 'Configuration Android echouee.'
}

Write-Host "`n3/7 - Selection du JDK 21..." -ForegroundColor Cyan
$buildJdkRoot = Get-BuildJdk21

if (-not $buildJdkRoot) {
    throw @"
JDK 21 introuvable pour Holophone.

Lance une seule fois :
  05_FINIR_PREMIERE_RELEASE.cmd

Ce script installe Microsoft OpenJDK 21 et memorise son chemin pour le projet.
"@
}

$buildJavaExe = Join-Path $buildJdkRoot 'bin\java.exe'
$javaInfo = Invoke-Capture -Executable $buildJavaExe -ArgumentList @('-version')
$javaInfoText = $javaInfo.Text.Trim()

$env:JAVA_HOME = $buildJdkRoot
$env:Path = (Join-Path $buildJdkRoot 'bin') + ';' + $env:Path

Write-Host $javaInfoText -ForegroundColor DarkGray
Write-Host "JAVA_HOME temporaire : $buildJdkRoot" -ForegroundColor Green

Write-Host "`n4/7 - Verification Gradle/JVM..." -ForegroundColor Cyan
$androidRoot = Join-Path $ProjectRoot 'android'
$gradlewPath = Join-Path $androidRoot 'gradlew.bat'
if (-not (Test-Path $gradlewPath)) {
    throw 'android\gradlew.bat introuvable.'
}

$gradleInfo = Invoke-Capture -Executable $gradlewPath -ArgumentList @('--version') -WorkingDirectory $androidRoot
Write-Host $gradleInfo.Text.Trim()

if ($gradleInfo.ExitCode -ne 0) {
    throw 'Gradle ne demarre pas avec le JDK 21 selectionne.'
}

if ($gradleInfo.Text -notmatch '(?im)Launcher JVM:\s+21(?:\.|\s)') {
    throw @"
Gradle ne semble pas utiliser Java 21.
Le build est interrompu pour eviter de retomber sur Java 25.
"@
}

Write-Host "`n5/7 - Compilation Gradle release..." -ForegroundColor Cyan
Push-Location $androidRoot
try {
    $gradleExit = Invoke-NativeConsole -Executable $gradlewPath -ArgumentList @(
        'clean',
        'assembleRelease',
        '--no-daemon'
    )
    if ($gradleExit -ne 0) {
        throw 'Gradle assembleRelease a echoue.'
    }
}
finally {
    Pop-Location
}

$unsigned = Join-Path $ProjectRoot 'android\app\build\outputs\apk\release\app-release-unsigned.apk'
if (-not (Test-Path $unsigned)) {
    $candidateApk = Join-Path $ProjectRoot 'android\app\build\outputs\apk\release\app-release.apk'
    if (Test-Path $candidateApk) {
        $unsigned = $candidateApk
    } else {
        throw 'APK release introuvable apres compilation.'
    }
}

$sdkRoot = $env:ANDROID_SDK_ROOT
if (-not $sdkRoot) { $sdkRoot = $env:ANDROID_HOME }
if (-not $sdkRoot) { $sdkRoot = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }

$buildToolsRoot = Join-Path $sdkRoot 'build-tools'
if (-not (Test-Path $buildToolsRoot)) {
    throw "Android build-tools introuvables sous $buildToolsRoot"
}

$preferredBuildTools = Join-Path $buildToolsRoot '36.0.0'
if (Test-Path $preferredBuildTools) {
    $selectedBuildTools = Get-Item $preferredBuildTools
} else {
    $selectedBuildTools = Get-ChildItem $buildToolsRoot -Directory |
        Sort-Object {
            try { [version]$_.Name }
            catch { [version]'0.0' }
        } -Descending |
        Select-Object -First 1
}

if (-not $selectedBuildTools) {
    throw 'Aucune version Android Build Tools utilisable.'
}

$zipalignPath = Join-Path $selectedBuildTools.FullName 'zipalign.exe'
$apksignerPath = Join-Path $selectedBuildTools.FullName 'apksigner.bat'

if (-not (Test-Path $zipalignPath)) {
    throw "zipalign.exe introuvable : $zipalignPath"
}

if (-not (Test-Path $apksignerPath)) {
    throw "apksigner.bat introuvable : $apksignerPath"
}

$releaseDir = Join-Path $ProjectRoot 'releases'
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

$releaseBaseName = "Lumen-v$VersionName-code$VersionCode"
$alignedApk = Join-Path $releaseDir "$releaseBaseName-aligned-unsigned.apk"
$finalApk = Join-Path $releaseDir "$releaseBaseName.apk"

Remove-Item $alignedApk -Force -ErrorAction SilentlyContinue
Remove-Item $finalApk -Force -ErrorAction SilentlyContinue

Write-Host "`n6/7 - Alignement et signature..." -ForegroundColor Cyan
Write-Host "Build Tools : $($selectedBuildTools.Name)" -ForegroundColor DarkGray

$alignExit = Invoke-NativeConsole -Executable $zipalignPath -ArgumentList @(
    '-f',
    '-p',
    '4',
    $unsigned,
    $alignedApk
)
if ($alignExit -ne 0) {
    throw 'zipalign a echoue.'
}

Write-Host ''
Write-Host 'apksigner va demander le mot de passe du keystore Lumen.' -ForegroundColor Yellow
Write-Host ''

$signArgumentList = @(
    'sign',
    '--ks', $KeystorePath,
    '--ks-key-alias', $Alias,
    '--out', $finalApk,
    $alignedApk
)

$signExit = Invoke-NativeConsole -Executable $apksignerPath -ArgumentList $signArgumentList
if ($signExit -ne 0) {
    throw 'Signature APK echouee.'
}

Remove-Item $alignedApk -Force -ErrorAction SilentlyContinue

Write-Host "`n7/7 - Verification finale..." -ForegroundColor Cyan
$verifyResult = Invoke-Capture -Executable $apksignerPath -ArgumentList @(
    'verify',
    '--verbose',
    '--print-certs',
    $finalApk
)

Write-Host $verifyResult.Text.Trim()

if ($verifyResult.ExitCode -ne 0) {
    throw 'Verification APK echouee.'
}

$shaMatch = [regex]::Match(
    $verifyResult.Text,
    '(?im)certificate SHA-256 digest:\s*([0-9a-f:]+)'
)

if (-not $shaMatch.Success) {
    throw 'Impossible de lire le SHA-256 du certificat dans apksigner.'
}

$actualSigner = ($shaMatch.Groups[1].Value -replace ':','').ToUpperInvariant()

if (-not $expectedSigner) {
    $state.signerSha256 = $actualSigner
    Write-Host "Empreinte de signature enregistree : $actualSigner" -ForegroundColor Green
}
elseif ($actualSigner -ne $expectedSigner) {
    $badApk = Join-Path $releaseDir "$releaseBaseName-SIGNATURE-INCORRECTE.apk"
    Move-Item -Force $finalApk $badApk
    throw "Mauvaise cle de signature. APK isolee : $badApk"
}

$state.lastVersionName = $VersionName
$state.lastVersionCode = $VersionCode

$stateJson = $state | ConvertTo-Json
[IO.File]::WriteAllText(
    $StatePath,
    $stateJson,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
Write-Host 'RELEASE TERMINEE' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor Green
Write-Host "APK : $finalApk" -ForegroundColor Green
Write-Host ''

if ($VersionCode -eq 1) {
    Write-Host 'Premiere release du nouveau projet Lumen.' -ForegroundColor Cyan
    Write-Host 'L ancienne application com.mudva.lumen doit etre desinstallee avant cette premiere installation.' -ForegroundColor Yellow
} else {
    Write-Host 'Cette APK peut mettre a jour les versions precedentes du nouveau projet.' -ForegroundColor Cyan
}

exit 0
