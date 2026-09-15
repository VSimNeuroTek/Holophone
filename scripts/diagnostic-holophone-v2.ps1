param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectRoot
)

$ErrorActionPreference = 'Continue'
$ProjectRoot = [IO.Path]::GetFullPath($ProjectRoot)
$Report = Join-Path $ProjectRoot 'DIAGNOSTIC_ENVIRONNEMENT_V2.txt'

function Add-Line {
    param([AllowNull()][string]$Text = '')
    if ($null -eq $Text) { $Text = '' }
    [IO.File]::AppendAllText($Report, $Text + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
}

function Add-Block {
    param([AllowNull()]$Value)
    if ($null -eq $Value) {
        Add-Line '<null>'
        return
    }
    $s = ($Value | Out-String -Width 4096).TrimEnd()
    if ($s) {
        foreach ($line in ($s -split "`r?`n")) { Add-Line $line }
    }
}

function Section {
    param([string]$Title)
    Add-Line ''
    Add-Line '============================================================'
    Add-Line $Title
    Add-Line '============================================================'
}

function Native {
    param(
        [string]$Label,
        [string]$File,
        [string[]]$Arguments = @(),
        [string]$WorkingDirectory = $null
    )
    Add-Line ''
    Add-Line ('> ' + $Label)

    $old = Get-Location
    try {
        if ($WorkingDirectory -and (Test-Path $WorkingDirectory)) {
            Set-Location $WorkingDirectory
        }

        $cmd = Get-Command $File -ErrorAction SilentlyContinue
        if (-not $cmd) {
            Add-Line ('[INTROUVABLE] ' + $File)
            return
        }

        Add-Line ('Executable : ' + $cmd.Source)
        $global:LASTEXITCODE = 0
        $out = & $cmd.Source @Arguments 2>&1
        Add-Block $out
        Add-Line ('[exitcode=' + $LASTEXITCODE + ']')
    }
    catch {
        Add-Line ('[ERREUR] ' + $_.Exception.Message)
    }
    finally {
        Set-Location $old
    }
}

function CmdNative {
    param(
        [string]$Label,
        [string]$CommandLine,
        [string]$WorkingDirectory = $null
    )
    Add-Line ''
    Add-Line ('> ' + $Label)
    $old = Get-Location
    try {
        if ($WorkingDirectory -and (Test-Path $WorkingDirectory)) {
            Set-Location $WorkingDirectory
        }
        $global:LASTEXITCODE = 0
        $out = & $env:ComSpec /d /c $CommandLine 2>&1
        Add-Block $out
        Add-Line ('[exitcode=' + $LASTEXITCODE + ']')
    }
    catch {
        Add-Line ('[ERREUR] ' + $_.Exception.Message)
    }
    finally {
        Set-Location $old
    }
}

function Add-JavaHome {
    param(
        [System.Collections.Generic.HashSet[string]]$Set,
        [string]$Home
    )
    if (-not $Home) { return }
    try { $Home = [IO.Path]::GetFullPath($Home) } catch { return }
    $java = Join-Path $Home 'bin\java.exe'
    if (Test-Path $java) { [void]$Set.Add($Home) }
}

if (Test-Path $Report) { Remove-Item $Report -Force }

Add-Line '============================================================'
Add-Line 'HOLOPHONE / LUMEN - DIAGNOSTIC ENVIRONNEMENT V2'
Add-Line '============================================================'
Add-Line ('Date : ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'))
Add-Line ('Dossier projet : ' + $ProjectRoot)

Section '1. WINDOWS / MACHINE'
try {
    $os = Get-CimInstance Win32_OperatingSystem
    $cs = Get-CimInstance Win32_ComputerSystem
    Add-Line ('Windows : ' + $os.Caption)
    Add-Line ('Version : ' + $os.Version)
    Add-Line ('Build   : ' + $os.BuildNumber)
    Add-Line ('OS Arch : ' + $os.OSArchitecture)
    Add-Line ('Machine : ' + $cs.SystemType)
} catch {
    Add-Line ('[ERREUR CIM] ' + $_.Exception.Message)
}
Add-Line ('PowerShell : ' + $PSVersionTable.PSVersion)
Add-Line ('PS Edition : ' + $PSVersionTable.PSEdition)

Section '2. VARIABLES ENVIRONNEMENT'
$vars = @(
    'JAVA_HOME','JDK_HOME','ANDROID_HOME','ANDROID_SDK_ROOT','ANDROID_USER_HOME',
    'GRADLE_HOME','GRADLE_USER_HOME','NODE_HOME','NVM_HOME','NVM_SYMLINK'
)
foreach ($v in $vars) {
    $value = [Environment]::GetEnvironmentVariable($v, 'Process')
    Add-Line ($v + ' = ' + $value)
}
Add-Line ''
Add-Line 'PATH ='
Add-Line $env:PATH

Section '3. EXECUTABLES RESOLUS PAR WINDOWS'
$tools = @('java.exe','javac.exe','keytool.exe','node.exe','npm.cmd','npx.cmd','adb.exe','sdkmanager.bat','apksigner.bat','zipalign.exe','git.exe','gradle.bat')
foreach ($tool in $tools) {
    Add-Line ''
    Add-Line ('--- ' + $tool + ' ---')
    try {
        $all = Get-Command $tool -All -ErrorAction SilentlyContinue
        if ($all) {
            foreach ($x in $all) { Add-Line $x.Source }
        } else {
            Add-Line '<introuvable dans PATH>'
        }
    } catch {
        Add-Line ('[ERREUR] ' + $_.Exception.Message)
    }
}

Section '4. JAVA ACTUEL'
Native 'java -version' 'java.exe' @('-version')
Native 'javac -version' 'javac.exe' @('-version')
Native 'keytool -help' 'keytool.exe' @('-help')

Section '5. TOUS LES JAVA / JDK / JBR DETECTES'
$javaHomes = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)

Add-JavaHome $javaHomes $env:JAVA_HOME
try {
    $currentJava = Get-Command java.exe -ErrorAction SilentlyContinue
    if ($currentJava) {
        $bin = Split-Path -Parent $currentJava.Source
        Add-JavaHome $javaHomes (Split-Path -Parent $bin)
    }
} catch {}

$commonHomes = @(
    (Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'),
    (Join-Path $env:ProgramFiles 'Android\Android Studio\jre'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Android Studio\jbr'),
    (Join-Path $env:LOCALAPPDATA 'Android\Android Studio\jbr')
)
foreach ($h in $commonHomes) { Add-JavaHome $javaHomes $h }

$roots = @(
    (Join-Path $env:ProgramFiles 'Java'),
    (Join-Path $env:ProgramFiles 'Eclipse Adoptium'),
    (Join-Path $env:ProgramFiles 'Microsoft'),
    (Join-Path $env:ProgramFiles 'Zulu'),
    (Join-Path $env:ProgramFiles 'BellSoft'),
    (Join-Path $env:ProgramFiles 'Amazon Corretto')
)
foreach ($root in $roots) {
    if ($root -and (Test-Path $root)) {
        Add-Line ''
        Add-Line ('Dossier Java detecte : ' + $root)
        try {
            foreach ($dir in Get-ChildItem $root -Directory -ErrorAction SilentlyContinue) {
                Add-Line ('  ' + $dir.FullName)
                Add-JavaHome $javaHomes $dir.FullName
            }
        } catch {}
    }
}

# Recherche des installations declarees dans les desinstalleurs Windows.
$uninstallKeys = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
foreach ($key in $uninstallKeys) {
    try {
        $apps = Get-ItemProperty $key -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -match '(?i)Java|JDK|Temurin|Adoptium|OpenJDK|Android Studio' }
        foreach ($app in $apps) {
            Add-Line ''
            Add-Line ('Application : ' + $app.DisplayName)
            if ($app.DisplayVersion) { Add-Line ('Version     : ' + $app.DisplayVersion) }
            if ($app.InstallLocation) {
                Add-Line ('Emplacement : ' + $app.InstallLocation)
                Add-JavaHome $javaHomes $app.InstallLocation
                Add-JavaHome $javaHomes (Join-Path $app.InstallLocation 'jbr')
            }
        }
    } catch {}
}

Add-Line ''
Add-Line '--- Versions des homes Java detectes ---'
if ($javaHomes.Count -eq 0) {
    Add-Line '<aucun home Java detecte>'
} else {
    foreach ($home in ($javaHomes | Sort-Object)) {
        Add-Line ''
        Add-Line ('JAVA_HOME candidat : ' + $home)
        $javaExe = Join-Path $home 'bin\java.exe'
        try {
            $global:LASTEXITCODE = 0
            $out = & $javaExe -version 2>&1
            Add-Block $out
            Add-Line ('[exitcode=' + $LASTEXITCODE + ']')
        } catch {
            Add-Line ('[ERREUR] ' + $_.Exception.Message)
        }
    }
}

Section '6. NODE / NPM / NPX'
Native 'node --version' 'node.exe' @('--version')
Native 'npm --version' 'npm.cmd' @('--version')
Native 'npx --version' 'npx.cmd' @('--version')
Native 'npm config get prefix' 'npm.cmd' @('config','get','prefix')
Native 'npm config get cache' 'npm.cmd' @('config','get','cache')

Section '7. PROJET CAPACITOR'
$packageJson = Join-Path $ProjectRoot 'package.json'
if (Test-Path $packageJson) {
    Add-Line ''
    Add-Line '--- package.json ---'
    Add-Block (Get-Content -Raw $packageJson)
    Native 'npm list --depth=0' 'npm.cmd' @('list','--depth=0') $ProjectRoot
    Native 'npx cap --version' 'npx.cmd' @('cap','--version') $ProjectRoot
    Native 'npx cap doctor' 'npx.cmd' @('cap','doctor') $ProjectRoot
} else {
    Add-Line 'package.json introuvable a la racine du projet.'
}

foreach ($cfg in @('capacitor.config.json','capacitor.config.ts')) {
    $p = Join-Path $ProjectRoot $cfg
    if (Test-Path $p) {
        Add-Line ''
        Add-Line ('--- ' + $cfg + ' ---')
        Add-Block (Get-Content -Raw $p)
    }
}

Section '8. ANDROID STUDIO'
$studioHomes = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$studioCandidates = @(
    (Join-Path $env:ProgramFiles 'Android\Android Studio'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Android Studio'),
    (Join-Path $env:LOCALAPPDATA 'Android\Android Studio')
)
foreach ($s in $studioCandidates) {
    if ($s -and (Test-Path $s)) { [void]$studioHomes.Add($s) }
}
foreach ($s in ($studioHomes | Sort-Object)) {
    Add-Line ('Android Studio : ' + $s)
    $jbr = Join-Path $s 'jbr'
    if (Test-Path (Join-Path $jbr 'bin\java.exe')) {
        Add-Line ('JBR            : ' + $jbr)
        Add-JavaHome $javaHomes $jbr
        try {
            $out = & (Join-Path $jbr 'bin\java.exe') -version 2>&1
            Add-Block $out
        } catch {}
    } else {
        Add-Line 'JBR            : <introuvable>'
    }
}
if ($studioHomes.Count -eq 0) { Add-Line '<Android Studio non detecte dans les emplacements usuels>' }

Section '9. ANDROID SDK'
$sdkRoots = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($sdk in @($env:ANDROID_HOME,$env:ANDROID_SDK_ROOT,(Join-Path $env:LOCALAPPDATA 'Android\Sdk'))) {
    if ($sdk -and (Test-Path $sdk)) {
        try { [void]$sdkRoots.Add([IO.Path]::GetFullPath($sdk)) } catch {}
    }
}
if ($sdkRoots.Count -eq 0) {
    Add-Line '<aucun Android SDK detecte>'
} else {
    foreach ($sdk in ($sdkRoots | Sort-Object)) {
        Add-Line ''
        Add-Line ('SDK ROOT : ' + $sdk)
        foreach ($folder in @('platforms','build-tools','platform-tools','cmdline-tools','emulator')) {
            $path = Join-Path $sdk $folder
            Add-Line ('--- ' + $folder + ' ---')
            if (Test-Path $path) {
                try {
                    foreach ($d in Get-ChildItem $path -Directory -ErrorAction SilentlyContinue | Sort-Object Name) {
                        Add-Line ('  ' + $d.Name)
                    }
                    foreach ($f in Get-ChildItem $path -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -in @('adb.exe','sdkmanager.bat','avdmanager.bat') }) {
                        Add-Line ('  ' + $f.FullName)
                    }
                } catch {}
            } else {
                Add-Line '  <absent>'
            }
        }

        $adb = Join-Path $sdk 'platform-tools\adb.exe'
        if (Test-Path $adb) {
            Add-Line ''
            Add-Line ('> ' + $adb + ' version')
            Add-Block (& $adb version 2>&1)
        }

        $sdkManagers = Get-ChildItem (Join-Path $sdk 'cmdline-tools') -Filter sdkmanager.bat -Recurse -ErrorAction SilentlyContinue
        foreach ($sm in $sdkManagers) {
            Add-Line ''
            Add-Line ('sdkmanager : ' + $sm.FullName)
            try { Add-Block (& $sm.FullName --version 2>&1) } catch {}
        }

        $btRoot = Join-Path $sdk 'build-tools'
        if (Test-Path $btRoot) {
            foreach ($bt in Get-ChildItem $btRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending) {
                Add-Line ''
                Add-Line ('Build-tools : ' + $bt.Name)
                foreach ($file in @('apksigner.bat','zipalign.exe','aapt2.exe')) {
                    $fp = Join-Path $bt.FullName $file
                    if (Test-Path $fp) { Add-Line ('  ' + $fp) }
                }
            }
        }
    }
}

Section '10. GRADLE DU PROJET'
$androidRoot = Join-Path $ProjectRoot 'android'
$gradlew = Join-Path $androidRoot 'gradlew.bat'
$gradleFiles = @(
    'gradle\wrapper\gradle-wrapper.properties',
    'gradle.properties',
    'settings.gradle',
    'build.gradle',
    'variables.gradle',
    'app\build.gradle'
)
foreach ($rel in $gradleFiles) {
    $p = Join-Path $androidRoot $rel
    if (Test-Path $p) {
        Add-Line ''
        Add-Line ('--- android\' + $rel + ' ---')
        Add-Block (Get-Content -Raw $p)
    }
}
if (Test-Path $gradlew) {
    CmdNative 'gradlew.bat --version AVEC JAVA ACTUEL' 'gradlew.bat --version' $androidRoot
} else {
    Add-Line 'android\gradlew.bat introuvable.'
}

Section '11. TEST GRADLE AVEC CHAQUE JAVA DETECTE'
if (Test-Path $gradlew -and $javaHomes.Count -gt 0) {
    $oldJavaHome = $env:JAVA_HOME
    $oldPath = $env:PATH
    foreach ($home in ($javaHomes | Sort-Object)) {
        Add-Line ''
        Add-Line ('--- Test avec JAVA_HOME=' + $home + ' ---')
        try {
            $env:JAVA_HOME = $home
            $env:PATH = (Join-Path $home 'bin') + ';' + $oldPath
            $global:LASTEXITCODE = 0
            $out = & $gradlew --version 2>&1
            Add-Block $out
            Add-Line ('[exitcode=' + $LASTEXITCODE + ']')
        } catch {
            Add-Line ('[ERREUR] ' + $_.Exception.Message)
        }
    }
    $env:JAVA_HOME = $oldJavaHome
    $env:PATH = $oldPath
} else {
    Add-Line 'Test non effectue : Gradle Wrapper ou Java candidats absents.'
}

Section '12. GIT / OUTILS COMPLEMENTAIRES'
Native 'git --version' 'git.exe' @('--version')
Native 'gradle --version' 'gradle.bat' @('--version')

Section '13. ARBORESCENCE RACINE DU PROJET'
try {
    Get-ChildItem $ProjectRoot -Force |
        Select-Object Mode,Length,LastWriteTime,Name |
        Format-Table -AutoSize |
        Out-String -Width 4096 |
        ForEach-Object { Add-Block $_ }
} catch {
    Add-Line ('[ERREUR] ' + $_.Exception.Message)
}

Section '14. RESUME'
Add-Line ('Projet : ' + $ProjectRoot)
try {
    $javaNow = Get-Command java.exe -ErrorAction SilentlyContinue
    Add-Line ('Java PATH : ' + $(if($javaNow){$javaNow.Source}else{'<introuvable>'}))
} catch {}
Add-Line ('JAVA_HOME : ' + $env:JAVA_HOME)
Add-Line ('Nombre de JAVA_HOME candidats : ' + $javaHomes.Count)
Add-Line ('Nombre de SDK Android detectes : ' + $sdkRoots.Count)
Add-Line ('Nombre d installations Android Studio usuelles : ' + $studioHomes.Count)

Add-Line ''
Add-Line '============================================================'
Add-Line 'FIN DU DIAGNOSTIC V2'
Add-Line '============================================================'
Add-Line 'Aucun mot de passe ni contenu de cle privee n a ete collecte.'

Write-Host ''
Write-Host 'Diagnostic V2 termine.' -ForegroundColor Green
Write-Host ('Rapport : ' + $Report) -ForegroundColor Cyan
exit 0
