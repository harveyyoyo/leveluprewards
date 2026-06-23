$ErrorActionPreference = "Stop"

function Resolve-GsutilCmd() {
  $cmd = Get-Command "gsutil" -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidates = @(
    "C:\Program Files\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd",
    "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd",
    "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd"
  )
  foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
  throw "gsutil not found. Install Google Cloud SDK or run: npm run setup:gcs-backup"
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Gsutil = Resolve-GsutilCmd

function Import-BackupEnvFile([string]$Path) {
  if (-not (Test-Path $Path)) { return }
  foreach ($line in Get-Content $Path) {
    if ($line -match '^\s*#' -or $line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*$') { continue }
    $name = $Matches[1]
    $value = $Matches[2].Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
      Set-Item -Path "Env:$name" -Value $value
    }
  }
}

Import-BackupEnvFile (Join-Path $RepoRoot ".gcs-backup.env")

$Bucket = $env:GCS_BACKUP_BUCKET
if ([string]::IsNullOrWhiteSpace($Bucket)) {
  throw "GCS_BACKUP_BUCKET is not set. Run: npm run setup:gcs-backup"
}

$Prefix = $env:GCS_BACKUP_PREFIX
if ([string]::IsNullOrWhiteSpace($Prefix)) { $Prefix = "local-folder-backups/studio" }

$EnvPrefix = "$Prefix/env"
$TargetName = ".env.local"
if ($args.Count -gt 0) { $TargetName = $args[0] }

$remoteUri = "gs://$Bucket/$EnvPrefix/latest/$TargetName"
$localPath = Join-Path $RepoRoot $TargetName

Write-Host "Downloading $remoteUri"
Write-Host "         -> $localPath"
& $Gsutil -q cp $remoteUri $localPath
Write-Host "Restore complete."
