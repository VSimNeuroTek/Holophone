param()

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ManifestPath = Join-Path $ProjectRoot 'android\app\src\main\AndroidManifest.xml'

if (-not (Test-Path $ManifestPath)) {
    throw "AndroidManifest.xml introuvable : $ManifestPath"
}

$text = [IO.File]::ReadAllText($ManifestPath)
$changed = $false

# Holophone contient des conversations privees et dispose de sa propre sauvegarde.
# On refuse la sauvegarde systeme Android afin de ne pas dupliquer silencieusement
# les donnees applicatives hors du mecanisme explicite Documents/Holophone.
if ($text -match 'android:allowBackup\s*=\s*"true"') {
    $text = [regex]::Replace($text, 'android:allowBackup\s*=\s*"true"', 'android:allowBackup="false"', 1)
    $changed = $true
    Write-Host 'Sauvegarde systeme Android desactivee (allowBackup=false).' -ForegroundColor Green
}
elseif ($text -notmatch 'android:allowBackup\s*=\s*"false"') {
    $text = [regex]::Replace($text, '<application\b', '<application android:allowBackup="false"', 1)
    $changed = $true
    Write-Host 'Attribut allowBackup=false ajoute.' -ForegroundColor Green
}

$permissions = @(
    'android.permission.RECORD_AUDIO',
    'android.permission.USE_BIOMETRIC',
    'android.permission.MODIFY_AUDIO_SETTINGS'
)

foreach ($permission in $permissions) {
    if ($text -notmatch [regex]::Escape($permission)) {
        $line = '    <uses-permission android:name="' + $permission + '" />'
        $pattern = '(?m)^(\s*<application\b)'
        $replacement = $line + [Environment]::NewLine + '$1'
        $text = [regex]::Replace($text, $pattern, $replacement, 1)
        $changed = $true
        Write-Host ('Permission ajoutee : ' + $permission) -ForegroundColor Green
    }
    else {
        Write-Host ('Permission deja presente : ' + $permission) -ForegroundColor DarkGray
    }
}

# Holophone 2.0 utilise holophone:// pour Spotify et les retours internes.
# On garde le schema historique lumen:// dans le manifeste lorsqu'il existe,
# afin de ne pas casser d'anciens liens deja en circulation.
if ($text -notmatch 'android:scheme\s*=\s*"holophone"') {
    $lumenMatch = [regex]::Match(
        $text,
        '(?m)^(?<indent>\s*)<data(?<attrs>[^>]*android:scheme\s*=\s*"lumen"[^>]*)/>'
    )

    if ($lumenMatch.Success) {
        $oldLine = $lumenMatch.Value
        $newLine = $oldLine -replace 'android:scheme\s*=\s*"lumen"', 'android:scheme="holophone"'
        $text = $text.Insert(
            $lumenMatch.Index + $lumenMatch.Length,
            [Environment]::NewLine + $newLine
        )
        $changed = $true
        Write-Host 'Schema holophone:// ajoute a cote de lumen://.' -ForegroundColor Green
    }
    else {
        $filter = [regex]::Match(
            $text,
            '(?s)<intent-filter[^>]*>.*?<category\s+android:name="android.intent.category.BROWSABLE"\s*/>.*?</intent-filter>'
        )
        if ($filter.Success) {
            $block = $filter.Value
            $patched = $block -replace '</intent-filter>', ('    <data android:scheme="holophone" />' + [Environment]::NewLine + '            </intent-filter>')
            $text = $text.Remove($filter.Index, $filter.Length).Insert($filter.Index, $patched)
            $changed = $true
            Write-Host 'Schema holophone:// ajoute au filtre BROWSABLE.' -ForegroundColor Green
        }
        else {
            Write-Host 'ATTENTION : aucun filtre BROWSABLE existant trouve pour ajouter holophone://.' -ForegroundColor Yellow
            Write-Host 'Le build reste possible, mais le retour Spotify devra etre verifie dans Android Studio.' -ForegroundColor Yellow
        }
    }
}
else {
    Write-Host 'Schema holophone:// deja present.' -ForegroundColor DarkGray
}

if ($changed) {
    [IO.File]::WriteAllText(
        $ManifestPath,
        $text,
        (New-Object System.Text.UTF8Encoding($false))
    )
    Write-Host 'AndroidManifest.xml mis a jour.' -ForegroundColor Green
}
else {
    Write-Host 'AndroidManifest.xml deja pret pour Holophone 2.0.' -ForegroundColor Green
}
