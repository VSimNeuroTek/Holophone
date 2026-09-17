param([Parameter(Position=0)][string]$Target)
$ErrorActionPreference='Stop'
$PatchRoot=$PSScriptRoot
if([string]::IsNullOrWhiteSpace($Target)){$Target=Join-Path $env:USERPROFILE 'Desktop\Holophone'}
$FilesRoot=Join-Path $PatchRoot 'files'
$ManifestPath=Join-Path $PatchRoot 'files.lst'
$BackupRoot=Join-Path $Target '_backup_patch_3.4.1'
$IndexPath=Join-Path $Target 'www\index.html'
function Ensure-Parent{param([string]$Path)$p=[IO.Path]::GetDirectoryName($Path);if($p){[IO.Directory]::CreateDirectory($p)|Out-Null}}
if(-not(Test-Path -LiteralPath $IndexPath -PathType Leaf)){throw "Projet Holophone introuvable : $Target"}
$txt=[IO.File]::ReadAllText($IndexPath)
$m=[regex]::Match($txt,"const\s+APPV\s*=\s*'([^']+)'")
$cur=if($m.Success){$m.Groups[1].Value}else{''}
if(@('3.4.0','3.4.1') -notcontains $cur){throw "Patch 3.4.1 attendu depuis 3.4.0. Version detectee : $cur"}
$files=@(Get-Content -LiteralPath $ManifestPath | ForEach-Object{$_.Trim()} | Where-Object{$_})
$original=New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
$touched=New-Object 'System.Collections.Generic.List[string]'
[IO.Directory]::CreateDirectory($BackupRoot)|Out-Null
try{
 Write-Host '============================================================'
 Write-Host ' HOLOPHONE - PATCH 3.4.1 - RELEASE TECHNIQUE'
 Write-Host '============================================================'
 Write-Host ('Cible : '+$Target)
 foreach($rel0 in $files){
  $rel=$rel0 -replace '/','\';$src=Join-Path $FilesRoot $rel;$dst=Join-Path $Target $rel
  if(-not(Test-Path -LiteralPath $src -PathType Leaf)){throw "Fichier patch absent : $rel"}
  if(Test-Path -LiteralPath $dst -PathType Leaf){[void]$original.Add($rel);$bak=Join-Path $BackupRoot $rel;Ensure-Parent $bak;Copy-Item -LiteralPath $dst -Destination $bak -Force}
  Ensure-Parent $dst;Copy-Item -LiteralPath $src -Destination $dst -Force;[void]$touched.Add($rel)
 }
 # Préserve l empreinte du keystore existant.
 $bakState=Join-Path $BackupRoot 'release-state.json';$dstState=Join-Path $Target 'release-state.json'
 if((Test-Path -LiteralPath $bakState) -and (Test-Path -LiteralPath $dstState)){
  $old=Get-Content -LiteralPath $bakState -Raw|ConvertFrom-Json;$new=Get-Content -LiteralPath $dstState -Raw|ConvertFrom-Json
  if(-not[string]::IsNullOrWhiteSpace([string]$old.signerSha256)){$new.signerSha256=[string]$old.signerSha256}
  $new.lastVersionName='3.4.1';$new.lastVersionCode=55
  [IO.File]::WriteAllText($dstState,($new|ConvertTo-Json -Depth 8)+[Environment]::NewLine,(New-Object Text.UTF8Encoding($false)))
 }
 $check=[IO.File]::ReadAllText($IndexPath);if($check -notmatch [regex]::Escape("const APPV='3.4.1'")){throw 'APPV 3.4.1 absent apres copie.'}
 Write-Host 'Patch 3.4.1 installe.' -ForegroundColor Green
 Write-Host ('Backup : '+$BackupRoot)
 Write-Host 'Lance maintenant RELEASE_3.4.1.cmd'
 exit 0
}catch{
 Write-Host ('ERREUR : '+$_.Exception.Message) -ForegroundColor Red
 foreach($rel in $touched){$dst=Join-Path $Target $rel;$bak=Join-Path $BackupRoot $rel;try{if($original.Contains($rel)-and(Test-Path -LiteralPath $bak)){Ensure-Parent $dst;Copy-Item -LiteralPath $bak -Destination $dst -Force}elseif(Test-Path -LiteralPath $dst){Remove-Item -LiteralPath $dst -Force}}catch{}}
 throw
}
