param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectRoot
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = [IO.Path]::GetFullPath($ProjectRoot)
$AndroidRoot = Join-Path $ProjectRoot 'android'

if (-not (Test-Path $AndroidRoot)) {
    throw "Dossier Android introuvable : $AndroidRoot"
}

$patterns = @('*.gradle', '*.gradle.kts', '*.properties')
$files = New-Object 'System.Collections.Generic.List[System.IO.FileInfo]'

foreach ($pattern in $patterns) {
    $foundFiles = Get-ChildItem -Path $AndroidRoot -Filter $pattern -File -Recurse -ErrorAction SilentlyContinue
    foreach ($foundFile in $foundFiles) {
        [void]$files.Add($foundFile)
    }
}

$fixedCount = 0
$checkedCount = 0

foreach ($fileItem in $files) {
    $checkedCount++

    $bytes = [IO.File]::ReadAllBytes($fileItem.FullName)

    if (
        ($bytes.Length -ge 3) -and
        ($bytes[0] -eq 0xEF) -and
        ($bytes[1] -eq 0xBB) -and
        ($bytes[2] -eq 0xBF)
    ) {
        $newLength = $bytes.Length - 3
        $newBytes = New-Object byte[] $newLength

        if ($newLength -gt 0) {
            [Array]::Copy($bytes, 3, $newBytes, 0, $newLength)
        }

        [IO.File]::WriteAllBytes($fileItem.FullName, $newBytes)
        $fixedCount++

        Write-Host ("BOM retire : " + $fileItem.FullName) -ForegroundColor Yellow
    }
}

Write-Host ''
Write-Host ("Fichiers verifies : " + $checkedCount) -ForegroundColor Cyan
Write-Host ("Fichiers corriges : " + $fixedCount) -ForegroundColor Green

$variablesGradle = Join-Path $AndroidRoot 'variables.gradle'
if (Test-Path $variablesGradle) {
    $checkBytes = [IO.File]::ReadAllBytes($variablesGradle)
    $stillBom = (
        ($checkBytes.Length -ge 3) -and
        ($checkBytes[0] -eq 0xEF) -and
        ($checkBytes[1] -eq 0xBB) -and
        ($checkBytes[2] -eq 0xBF)
    )

    if ($stillBom) {
        throw 'Le BOM de variables.gradle est toujours present.'
    }

    Write-Host ''
    Write-Host 'variables.gradle est maintenant propre.' -ForegroundColor Green
}

Write-Host ''
Write-Host 'Tu peux revenir dans Android Studio et relancer la synchronisation Gradle.' -ForegroundColor Green
exit 0
