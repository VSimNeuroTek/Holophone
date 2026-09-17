param([switch]$NoOpen)

$ErrorActionPreference='Stop'
$ProjectRoot=Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Write-Utf8NoBom {
    param([Parameter(Mandatory=$true)][string]$Path,[Parameter(Mandatory=$true)][string]$Text)
    [IO.File]::WriteAllText($Path,$Text,(New-Object System.Text.UTF8Encoding($false)))
}

function Invoke-Checked {
    param([Parameter(Mandatory=$true)][string]$Exe,[string[]]$Args=@(),[string]$WorkingDirectory=$null)
    $old=Get-Location
    if($WorkingDirectory){Set-Location $WorkingDirectory}
    try{
        & $Exe @Args
        if($LASTEXITCODE -ne 0){throw "$Exe a echoue avec le code $LASTEXITCODE"}
    }
    finally{if($WorkingDirectory){Set-Location $old}}
}

$VersionName='3.4.2'
$VersionCode=56
$BaselineVersion='3.4.1'
$Test342=Join-Path $PSScriptRoot 'test-stable-v342.js'
$BaseRelease=Join-Path $PSScriptRoot 'release-safe.ps1'
$Gradle=Join-Path $ProjectRoot 'android\app\build.gradle'
$BackupModule=Join-Path $ProjectRoot 'www\js\holophone-backup342.js'
$I18n=Join-Path $ProjectRoot 'www\js\holophone-i18n.js'
$SyncedBackup=Join-Path $ProjectRoot 'android\app\src\main\assets\public\js\holophone-backup342.js'
$SyncedI18n=Join-Path $ProjectRoot 'android\app\src\main\assets\public\js\holophone-i18n.js'

foreach($p in @($Test342,$BaseRelease,$Gradle,$BackupModule,$I18n)){
    if(-not(Test-Path -LiteralPath $p -PathType Leaf)){throw "Fichier requis absent : $p"}
}

$backupText=[IO.File]::ReadAllText($BackupModule)
$i18nText=[IO.File]::ReadAllText($I18n)
if($backupText -notmatch [regex]::Escape("const PATCH_VERSION='3.4.2'")){throw 'Module sauvegarde 3.4.2 invalide.'}
if($i18nText -notmatch [regex]::Escape("s.src='js/holophone-backup342.js'")){throw 'Chargeur sauvegarde 3.4.2 absent de holophone-i18n.js.'}

$backupDir=Join-Path $ProjectRoot '_release_backup'
New-Item -ItemType Directory -Force -Path $backupDir|Out-Null
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$gradleBefore=Join-Path $backupDir ("build.gradle.pre342.$stamp.bak")
Copy-Item -LiteralPath $Gradle -Destination $gradleBefore -Force

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' HOLOPHONE 3.4.2 - HOTFIX SAUVEGARDE MEMOIRE' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Le coeur web reste volontairement base sur 3.4.1.' -ForegroundColor DarkGray
Write-Host 'La couche 3.4.2 remplace uniquement sauvegarde/restauration.' -ForegroundColor DarkGray
Write-Host ''

try{
    Write-Host '[1/5] Recette hotfix 3.4.2...' -ForegroundColor Cyan
    Invoke-Checked -Exe 'node.exe' -Args @($Test342)

    Write-Host '[2/5] Preparation native depuis la base stable 3.4.1...' -ForegroundColor Cyan
    Invoke-Checked -Exe 'powershell.exe' -Args @('-NoProfile','-ExecutionPolicy','Bypass','-File',$BaseRelease,'-VersionName',$BaselineVersion,'-VersionCode',[string]$VersionCode,'-NoOpen')

    Write-Host '[3/5] Verification des assets Capacitor synchronises...' -ForegroundColor Cyan
    if(-not(Test-Path -LiteralPath $SyncedBackup -PathType Leaf)){throw 'holophone-backup342.js absent des assets Android apres cap sync.'}
    if(-not(Test-Path -LiteralPath $SyncedI18n -PathType Leaf)){throw 'holophone-i18n.js absent des assets Android apres cap sync.'}
    $sb=[IO.File]::ReadAllText($SyncedBackup)
    $si=[IO.File]::ReadAllText($SyncedI18n)
    if($sb -notmatch [regex]::Escape("const PATCH_VERSION='3.4.2'")){throw 'Asset Android backup342 incorrect.'}
    if($si -notmatch [regex]::Escape("s.src='js/holophone-backup342.js'")){throw 'Asset Android i18n ne charge pas backup342.'}

    Write-Host '[4/5] Version Android 3.4.2 / code 56...' -ForegroundColor Cyan
    $g=[IO.File]::ReadAllText($Gradle)
    $codePattern='(?m)^(\s*)versionCode\s+\d+\s*$'
    $namePattern='(?m)^(\s*)versionName\s+"[^"]+"\s*$'
    if([regex]::Matches($g,$codePattern).Count -ne 1){throw 'versionCode Android ambigu.'}
    if([regex]::Matches($g,$namePattern).Count -ne 1){throw 'versionName Android ambigu.'}
    $cm=[regex]::Match($g,$codePattern)
    $g=$g.Substring(0,$cm.Index)+$cm.Groups[1].Value+'versionCode '+$VersionCode+$g.Substring($cm.Index+$cm.Length)
    $nm=[regex]::Match($g,$namePattern)
    $g=$g.Substring(0,$nm.Index)+$nm.Groups[1].Value+'versionName "'+$VersionName+'"'+$g.Substring($nm.Index+$nm.Length)
    Write-Utf8NoBom -Path $Gradle -Text $g
    $verify=[IO.File]::ReadAllText($Gradle)
    if($verify -notmatch 'versionCode\s+56\b'){throw 'versionCode 56 non applique.'}
    if($verify -notmatch 'versionName\s+"3\.4\.2"'){throw 'versionName 3.4.2 non applique.'}

    Write-Host '[5/5] Recette finale 3.4.2...' -ForegroundColor Cyan
    Invoke-Checked -Exe 'node.exe' -Args @($Test342)

    Write-Host ''
    Write-Host 'PREPARATION 3.4.2 TERMINEE' -ForegroundColor Green
    Write-Host 'Android : versionName 3.4.2 / versionCode 56' -ForegroundColor Green
    Write-Host 'IMPORTANT : genere un APK RELEASE SIGNE avec le MEME keystore que 3.4.1.' -ForegroundColor Yellow
    Write-Host 'Ne genere pas un APK debug pour le test sur les donnees actuelles : signature differente.' -ForegroundColor Yellow
    Write-Host ('Backup build.gradle avant preparation : '+$gradleBefore) -ForegroundColor DarkGray

    if(-not $NoOpen){
        Write-Host ''
        Write-Host 'Ouverture Android Studio...' -ForegroundColor Cyan
        Invoke-Checked -Exe 'npx.cmd' -Args @('cap','open','android')
    }
}
catch{
    Write-Host ''
    Write-Host ('ECHEC 3.4.2 : '+$_.Exception.Message) -ForegroundColor Red
    Write-Host 'Restauration du build.gradle initial.' -ForegroundColor Yellow
    Copy-Item -LiteralPath $gradleBefore -Destination $Gradle -Force
    throw
}
