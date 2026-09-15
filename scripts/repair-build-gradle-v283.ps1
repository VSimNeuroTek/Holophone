param()

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$GroovyPath = Join-Path $ProjectRoot 'android\app\build.gradle'
$KtsPath = Join-Path $ProjectRoot 'android\app\build.gradle.kts'

function Write-Utf8NoBom([string]$Path, [string]$Text) {
    [IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding($false)))
}

if (Test-Path $GroovyPath) {
    $text = [IO.File]::ReadAllText($GroovyPath)

    # Repare explicitement la corruption produite par l'ancien script : $133
    $text = [regex]::Replace($text, '(?m)^(\s*)\$133\s*$', '${1}versionCode 33')

    $codePattern = '(?m)^(\s*versionCode\s+)\d+(\s*)$'
    $namePattern = '(?m)^(\s*versionName\s+)["''][^"'']*["''](\s*)$'

    if (-not [regex]::IsMatch($text, $codePattern)) {
        throw "versionCode introuvable dans $GroovyPath"
    }
    if (-not [regex]::IsMatch($text, $namePattern)) {
        throw "versionName introuvable dans $GroovyPath"
    }

    # ${1}/${2} evitent l'ambiguite '$133' des references de groupes .NET.
    $text = [regex]::Replace($text, $codePattern, '${1}33${2}')
    $text = [regex]::Replace($text, $namePattern, '${1}"2.8.3"${2}')

    Write-Utf8NoBom $GroovyPath $text
    Write-Host 'build.gradle repare : versionCode 33 / versionName 2.8.3' -ForegroundColor Green
    exit 0
}

if (Test-Path $KtsPath) {
    $text = [IO.File]::ReadAllText($KtsPath)
    $codePattern = '(?m)^(\s*versionCode\s*=\s*)\d+(\s*)$'
    $namePattern = '(?m)^(\s*versionName\s*=\s*)"[^"]*"(\s*)$'

    if (-not [regex]::IsMatch($text, $codePattern)) {
        throw "versionCode introuvable dans $KtsPath"
    }
    if (-not [regex]::IsMatch($text, $namePattern)) {
        throw "versionName introuvable dans $KtsPath"
    }

    $text = [regex]::Replace($text, $codePattern, '${1}33${2}')
    $text = [regex]::Replace($text, $namePattern, '${1}"2.8.3"${2}')
    Write-Utf8NoBom $KtsPath $text
    Write-Host 'build.gradle.kts repare : versionCode 33 / versionName 2.8.3' -ForegroundColor Green
    exit 0
}

throw 'android\app\build.gradle introuvable.'
