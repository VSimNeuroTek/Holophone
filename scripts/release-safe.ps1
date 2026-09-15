param(
    [Parameter(Mandatory=$true)][string]$VersionName,
    [Parameter(Mandatory=$true)][int]$VersionCode,
    [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Write-Utf8NoBom {
    param([Parameter(Mandatory=$true)][string]$Path,[Parameter(Mandatory=$true)][string]$Text)
    [IO.File]::WriteAllText($Path,$Text,(New-Object System.Text.UTF8Encoding($false)))
}

function Invoke-Checked {
    param([Parameter(Mandatory=$true)][string]$Exe,[string[]]$Args=@(),[string]$WorkingDirectory=$null)
    $oldLocation = Get-Location
    if($WorkingDirectory){Set-Location $WorkingDirectory}
    try{
        & $Exe @Args
        if($LASTEXITCODE -ne 0){throw "$Exe a echoue avec le code $LASTEXITCODE"}
    }
    finally{if($WorkingDirectory){Set-Location $oldLocation}}
}

if($VersionName -notmatch '^\d+\.\d+\.\d+$'){
    throw "VersionName invalide : $VersionName. Format attendu : x.y.z"
}
if($VersionCode -lt 1){throw 'VersionCode doit etre positif.'}

$IndexPath = Join-Path $ProjectRoot 'www\index.html'
$V2Path = Join-Path $ProjectRoot 'www\js\holophone-v2.js'
$GradlePath = Join-Path $ProjectRoot 'android\app\build.gradle'
$TestScript = Join-Path $PSScriptRoot 'test-stable-v330.js'
$PrepareScript = Join-Path $PSScriptRoot 'prepare-android-v20.ps1'
$PatchSource = Join-Path $PSScriptRoot 'patches\local-notifications\SoundResolver.kt'
$PatchTarget = Join-Path $ProjectRoot 'node_modules\@capacitor\local-notifications\android\src\main\kotlin\com\capacitorjs\plugins\localnotifications\SoundResolver.kt'
$MainPatch = Join-Path $PSScriptRoot 'patches\android\MainActivity.java'
$PrivacyPatch = Join-Path $PSScriptRoot 'patches\android\PrivacyControlPlugin.java'

foreach($required in @($IndexPath,$V2Path,$GradlePath,$TestScript,$PrepareScript,$MainPatch,$PrivacyPatch)){
    if(-not (Test-Path $required)){throw "Fichier requis absent : $required"}
}

$indexText=[IO.File]::ReadAllText($IndexPath)
$v2Text=[IO.File]::ReadAllText($V2Path)
if($indexText -notmatch [regex]::Escape("const APPV='$VersionName'")){
    throw "Le code web n'est pas en $VersionName. APPV doit correspondre avant la release."
}
if($v2Text -notmatch [regex]::Escape("version: '$VersionName'")){
    throw "holophone-v2.js n'est pas en $VersionName."
}

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host " HOLOPHONE $VersionName - PREPARATION RELEASE SURE" -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ''

Write-Host '[1/6] Recette statique...' -ForegroundColor Cyan
Invoke-Checked -Exe 'node.exe' -Args @($TestScript)

$backupDir=Join-Path $ProjectRoot '_release_backup'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$gradleBackup=Join-Path $backupDir ("build.gradle.$stamp.bak")
Copy-Item -Force $GradlePath $gradleBackup

try{
    Write-Host '[2/6] Version Android...' -ForegroundColor Cyan
    $g=[IO.File]::ReadAllText($GradlePath)
    $codePattern='(?m)^(\s*)versionCode\s+\d+\s*$'
    $namePattern='(?m)^(\s*)versionName\s+"[^"]+"\s*$'
    $codeMatches=[regex]::Matches($g,$codePattern).Count
    $nameMatches=[regex]::Matches($g,$namePattern).Count
    if($codeMatches -ne 1){throw "versionCode : $codeMatches occurrence(s), attendu 1."}
    if($nameMatches -ne 1){throw "versionName : $nameMatches occurrence(s), attendu 1."}
    $codeMatch=[regex]::Match($g,$codePattern)
    $codeLine=$codeMatch.Groups[1].Value + 'versionCode ' + [string]$VersionCode
    $g=$g.Substring(0,$codeMatch.Index)+$codeLine+$g.Substring($codeMatch.Index+$codeMatch.Length)
    $nameMatch=[regex]::Match($g,$namePattern)
    $nameLine=$nameMatch.Groups[1].Value + 'versionName "' + $VersionName + '"'
    $g=$g.Substring(0,$nameMatch.Index)+$nameLine+$g.Substring($nameMatch.Index+$nameMatch.Length)
    Write-Utf8NoBom -Path $GradlePath -Text $g
    $verify=[IO.File]::ReadAllText($GradlePath)
    if($verify -notmatch "versionCode\s+$VersionCode\b"){throw 'VersionCode non applique.'}
    if($verify -notmatch ('versionName\s+"'+[regex]::Escape($VersionName)+'"')){throw 'VersionName non applique.'}

    Write-Host '[3/6] Correctif sons Android...' -ForegroundColor Cyan
    if((Test-Path $PatchSource) -and (Test-Path (Split-Path -Parent $PatchTarget))){Copy-Item -Force $PatchSource $PatchTarget}

    Write-Host '[4/6] Synchronisation Capacitor...' -ForegroundColor Cyan
    Invoke-Checked -Exe 'npx.cmd' -Args @('cap','sync','android')

    Write-Host '[5/6] Preparation native Android...' -ForegroundColor Cyan
    Invoke-Checked -Exe 'powershell.exe' -Args @('-NoProfile','-ExecutionPolicy','Bypass','-File',$PrepareScript)

    Write-Host '[6/6] Verification finale...' -ForegroundColor Cyan
    Invoke-Checked -Exe 'node.exe' -Args @($TestScript)

    if(-not $NoOpen){
        Write-Host ''
        Write-Host 'Ouverture Android Studio...' -ForegroundColor Cyan
        Invoke-Checked -Exe 'npx.cmd' -Args @('cap','open','android')
    }

    Write-Host ''
    Write-Host 'PREPARATION RELEASE TERMINEE' -ForegroundColor Green
    Write-Host "Version : $VersionName / code $VersionCode" -ForegroundColor Green
    Write-Host "Backup Gradle : $gradleBackup" -ForegroundColor DarkGray
    Write-Host 'Il reste uniquement a generer l APK signe release dans Android Studio.' -ForegroundColor Yellow
}
catch{
    Write-Host ''
    Write-Host 'ECHEC - restauration de android\app\build.gradle' -ForegroundColor Red
    Copy-Item -Force $gradleBackup $GradlePath
    throw
}
