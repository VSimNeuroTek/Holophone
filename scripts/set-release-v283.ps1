param()

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$GroovyPath = Join-Path $ProjectRoot 'android\app\build.gradle'
$KtsPath = Join-Path $ProjectRoot 'android\app\build.gradle.kts'
$VersionCode = 33
$VersionName = '2.8.3'

function Write-Utf8NoBom([string]$Path, [string]$Text) {
    [IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding($false)))
}

if (Test-Path $GroovyPath) {
    $text = [IO.File]::ReadAllText($GroovyPath)
    $codePattern = '(?m)^(\s*versionCode\s+)\d+(\s*)$'
    $namePattern = '(?m)^(\s*versionName\s+)["''][^"'']*["''](\s*)$'
    if (-not ([regex]::IsMatch($text, $codePattern)) -or -not ([regex]::IsMatch($text, $namePattern))) {
        throw "versionCode/versionName introuvables dans $GroovyPath"
    }
    $text = [regex]::Replace($text, $codePattern, ('$1' + $VersionCode + '$2'))
    $text = [regex]::Replace($text, $namePattern, ('$1"' + $VersionName + '"$2'))
    Write-Utf8NoBom $GroovyPath $text
    Write-Host "Version Android reglee sur $VersionName ($VersionCode)." -ForegroundColor Green
    exit 0
}

if (Test-Path $KtsPath) {
    $text = [IO.File]::ReadAllText($KtsPath)
    $codePattern = '(?m)^(\s*versionCode\s*=\s*)\d+(\s*)$'
    $namePattern = '(?m)^(\s*versionName\s*=\s*)"[^"]*"(\s*)$'
    if (-not ([regex]::IsMatch($text, $codePattern)) -or -not ([regex]::IsMatch($text, $namePattern))) {
        throw "versionCode/versionName introuvables dans $KtsPath"
    }
    $text = [regex]::Replace($text, $codePattern, ('$1' + $VersionCode + '$2'))
    $text = [regex]::Replace($text, $namePattern, ('$1"' + $VersionName + '"$2'))
    Write-Utf8NoBom $KtsPath $text
    Write-Host "Version Android reglee sur $VersionName ($VersionCode)." -ForegroundColor Green
    exit 0
}

throw 'android\app\build.gradle introuvable.'
