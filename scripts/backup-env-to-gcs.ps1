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
  throw @"
GCS_BACKUP_BUCKET is not set.
Run one-time setup first:
  npm run setup:gcs-backup
"@
}

$Prefix = $env:GCS_BACKUP_PREFIX
if ([string]::IsNullOrWhiteSpace($Prefix)) { $Prefix = "local-folder-backups/studio" }

$EnvPrefix = "$Prefix/env"
$RetentionDays = 30
if (-not [string]::IsNullOrWhiteSpace($env:GCS_BACKUP_RETENTION_DAYS)) {
  $RetentionDays = [int]$env:GCS_BACKUP_RETENTION_DAYS
}

$Stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$EnvFiles = @(".env.local", ".env") | ForEach-Object {
  $path = Join-Path $RepoRoot $_
  if (Test-Path $path) { Get-Item $path }
}

if (-not $EnvFiles -or $EnvFiles.Count -eq 0) {
  Write-Host "No .env.local or .env file found - nothing to upload."
  exit 0
}

foreach ($file in $EnvFiles) {
  $name = $file.Name
  $latestUri = "gs://$Bucket/$EnvPrefix/latest/$name"
  $historyUri = "gs://$Bucket/$EnvPrefix/history/$name-$Stamp"

  Write-Host "Uploading $name to GCS..."
  & $Gsutil -q cp $file.FullName $latestUri
  & $Gsutil -q cp $file.FullName $historyUri
  Write-Host "  latest:  $latestUri"
  Write-Host "  history: $historyUri"
}

try {
  $cutoffStamp = (Get-Date).ToUniversalTime().AddDays(-$RetentionDays).ToString("yyyyMMdd-HHmmss")
  $objs = & $Gsutil ls "gs://$Bucket/$EnvPrefix/history/*" 2>$null
  foreach ($o in $objs) {
    if ($o -match "(\d{8}-\d{6})$") {
      $objStamp = $Matches[1]
      if ($objStamp -lt $cutoffStamp) {
        & $Gsutil -q rm $o
      }
    }
  }
} catch {
  Write-Warning "GCS env history cleanup skipped/failed: $($_.Exception.Message)"
}

Write-Host "Env backup complete."
