param(
    [Parameter(Mandatory=$false)][string]$VersionName = "1.0",
    [Parameter(Mandatory=$false)][int]$VersionCode = 1
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ManifestPath = Join-Path $ProjectRoot 'android\app\src\main\AndroidManifest.xml'
$GradlePath = Join-Path $ProjectRoot 'android\app\build.gradle'
$VariablesPath = Join-Path $ProjectRoot 'android\variables.gradle'
$AndroidNs = 'http://schemas.android.com/apk/res/android'

if (-not (Test-Path $ManifestPath)) { throw "AndroidManifest.xml introuvable. Lance d'abord 00_INITIALISER_PROJET.cmd" }

[xml]$xml = Get-Content -Raw -Encoding UTF8 $ManifestPath
$nsmgr = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$nsmgr.AddNamespace('android', $AndroidNs)
$manifest = $xml.DocumentElement
$app = $xml.SelectSingleNode('/manifest/application')
if (-not $app) { throw 'Balise <application> introuvable.' }

function Ensure-Permission([string]$Name) {
    $node = $xml.SelectSingleNode("/manifest/uses-permission[@android:name='$Name']", $nsmgr)
    if (-not $node) {
        $node = $xml.CreateElement('uses-permission')
        $node.SetAttribute('name', $AndroidNs, $Name)
        [void]$manifest.InsertBefore($node, $app)
    }
}

Ensure-Permission 'android.permission.INTERNET'
Ensure-Permission 'android.permission.POST_NOTIFICATIONS'
Ensure-Permission 'android.permission.RECEIVE_BOOT_COMPLETED'
Ensure-Permission 'android.permission.WAKE_LOCK'
Ensure-Permission 'android.permission.SCHEDULE_EXACT_ALARM'

$app.SetAttribute('allowBackup', $AndroidNs, 'false')
$app.SetAttribute('supportsRtl', $AndroidNs, 'true')

$mainActivity = $null
foreach ($a in $xml.SelectNodes('/manifest/application/activity')) {
    $n = $a.GetAttribute('name', $AndroidNs)
    if ($n -eq 'com.mudva.lumen.MainActivity' -or $n -eq '.MainActivity') { $mainActivity = $a; break }
}
if (-not $mainActivity) { throw 'MainActivity introuvable dans le manifeste genere.' }

# Deep link historique lumen://...
$hasLumen = $false
foreach ($f in $mainActivity.SelectNodes('intent-filter')) {
    foreach ($d in $f.SelectNodes('data')) {
        if ($d.GetAttribute('scheme', $AndroidNs) -eq 'lumen') { $hasLumen = $true }
    }
}
if (-not $hasLumen) {
    $filter = $xml.CreateElement('intent-filter')
    $action = $xml.CreateElement('action'); $action.SetAttribute('name', $AndroidNs, 'android.intent.action.VIEW'); [void]$filter.AppendChild($action)
    $cat1 = $xml.CreateElement('category'); $cat1.SetAttribute('name', $AndroidNs, 'android.intent.category.DEFAULT'); [void]$filter.AppendChild($cat1)
    $cat2 = $xml.CreateElement('category'); $cat2.SetAttribute('name', $AndroidNs, 'android.intent.category.BROWSABLE'); [void]$filter.AppendChild($cat2)
    $data = $xml.CreateElement('data'); $data.SetAttribute('scheme', $AndroidNs, 'lumen'); [void]$filter.AppendChild($data)
    [void]$mainActivity.AppendChild($filter)
}

# Reception de texte partage depuis Android.
$sendActivity = $xml.SelectSingleNode("/manifest/application/activity[@android:name='de.mindlib.sendIntent.SendIntentActivity']", $nsmgr)
if (-not $sendActivity) {
    $sendActivity = $xml.CreateElement('activity')
    $sendActivity.SetAttribute('name', $AndroidNs, 'de.mindlib.sendIntent.SendIntentActivity')
    $sendActivity.SetAttribute('label', $AndroidNs, '@string/app_name')
    $sendActivity.SetAttribute('exported', $AndroidNs, 'true')
    $sendActivity.SetAttribute('theme', $AndroidNs, '@style/AppTheme.NoActionBar')
    [void]$app.AppendChild($sendActivity)
}
$hasSend = $false
foreach ($f in $sendActivity.SelectNodes('intent-filter')) {
    $actionNode = $f.SelectSingleNode("action[@android:name='android.intent.action.SEND']", $nsmgr)
    $dataNode = $f.SelectSingleNode("data[@android:mimeType='text/plain']", $nsmgr)
    if ($actionNode -and $dataNode) { $hasSend = $true }
}
if (-not $hasSend) {
    $filter = $xml.CreateElement('intent-filter')
    $action = $xml.CreateElement('action'); $action.SetAttribute('name', $AndroidNs, 'android.intent.action.SEND'); [void]$filter.AppendChild($action)
    $cat = $xml.CreateElement('category'); $cat.SetAttribute('name', $AndroidNs, 'android.intent.category.DEFAULT'); [void]$filter.AppendChild($cat)
    $data = $xml.CreateElement('data'); $data.SetAttribute('mimeType', $AndroidNs, 'text/plain'); [void]$filter.AppendChild($data)
    [void]$sendActivity.AppendChild($filter)
}

$settings = New-Object System.Xml.XmlWriterSettings
$settings.Indent = $true
$settings.Encoding = New-Object System.Text.UTF8Encoding($false)
$writer = [System.Xml.XmlWriter]::Create($ManifestPath, $settings)
$xml.Save($writer)
$writer.Close()

if (Test-Path $GradlePath) {
    $g = Get-Content -Raw -Encoding UTF8 $GradlePath
    $g = [regex]::Replace($g, 'versionCode\s+\d+', "versionCode $VersionCode")
    $g = [regex]::Replace($g, 'versionName\s+"[^"]+"', "versionName `"$VersionName`"")
    [IO.File]::WriteAllText($GradlePath, $g, (New-Object System.Text.UTF8Encoding($false)))
}

if (Test-Path $VariablesPath) {
    $v = Get-Content -Raw -Encoding UTF8 $VariablesPath
    $v = [regex]::Replace($v, 'minSdkVersion\s*=\s*\d+', 'minSdkVersion = 24')
    $v = [regex]::Replace($v, 'compileSdkVersion\s*=\s*\d+', 'compileSdkVersion = 36')
    $v = [regex]::Replace($v, 'targetSdkVersion\s*=\s*\d+', 'targetSdkVersion = 36')
    [IO.File]::WriteAllText($VariablesPath, $v, (New-Object System.Text.UTF8Encoding($false)))
}

Write-Host "Configuration Android appliquee : com.mudva.lumen / version $VersionName ($VersionCode) / SDK 24-36" -ForegroundColor Green
