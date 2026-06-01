$ErrorActionPreference = "Stop"

function Resolve-GcloudCmd() {
  $cmd = Get-Command "gcloud" -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidates = @(
    "C:\Program Files\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
  )
  foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
  throw "gcloud not found. Install Google Cloud SDK or add it to PATH."
}

function Resolve-GsutilCmd() {
  $cmd = Get-Command "gsutil" -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidates = @(
    "C:\Program Files\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd",
    "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd",
    "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd"
  )
  foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
  throw "gsutil not found. Install Google Cloud SDK or add it to PATH."
}

$Gsutil = Resolve-GsutilCmd

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

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

# You can override these via environment variables.
$Bucket = $env:GCS_BACKUP_BUCKET
if ([string]::IsNullOrWhiteSpace($Bucket)) {
  throw "Set environment variable GCS_BACKUP_BUCKET (example: my-backup-bucket)."
}

$Prefix = $env:GCS_BACKUP_PREFIX
if ([string]::IsNullOrWhiteSpace($Prefix)) { $Prefix = "local-folder-backups/studio" }

$RetentionDays = 30
if (-not [string]::IsNullOrWhiteSpace($env:GCS_BACKUP_RETENTION_DAYS)) {
  $RetentionDays = [int]$env:GCS_BACKUP_RETENTION_DAYS
}

$NowUtc = (Get-Date).ToUniversalTime()
$Stamp = $NowUtc.ToString("yyyyMMdd-HHmmss")
$BackupDir = Join-Path $RepoRoot ".local-backups"
$ZipName = "studio-$Stamp.zip"
$ZipPath = Join-Path $BackupDir $ZipName

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

Write-Host "Creating zip: $ZipPath"

# Prefer git archive (tracks only committed files) if git is available and repo is clean enough,
# otherwise zip the folder contents while excluding common junk.
$UseGitArchive = $false
if (Get-Command "git" -ErrorAction SilentlyContinue) {
  try {
    Push-Location $RepoRoot
    $null = git rev-parse --is-inside-work-tree 2>$null
    if ($LASTEXITCODE -eq 0) { $UseGitArchive = $true }
  } catch {
    $UseGitArchive = $false
  } finally {
    Pop-Location
  }
}

if ($UseGitArchive) {
  Push-Location $RepoRoot
  try {
    # Includes only tracked files, which avoids secrets and build output.
    git archive -o $ZipPath HEAD
  } finally {
    Pop-Location
  }
} else {
  # Includes the working folder. Excludes a few well-known large/ephemeral directories.
  $Exclude = @(
    ".git",
    "node_modules",
    ".next",
    "out",
    "coverage",
    ".firebase",
    "functions\node_modules",
    ".local-backups"
  )

  $Files = Get-ChildItem -Path $RepoRoot -Recurse -File -Force |
    Where-Object {
      $rel = $_.FullName.Substring($RepoRoot.Length).TrimStart("\")
      foreach ($ex in $Exclude) {
        if ($rel -like "$ex*") { return $false }
      }
      return $true
    }

  if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }
  Compress-Archive -Path $Files.FullName -DestinationPath $ZipPath -CompressionLevel Optimal
}

$RemoteObject = "$Prefix/$ZipName"
$RemoteUri = "gs://$Bucket/$RemoteObject"

Write-Host "Uploading to GCS: $RemoteUri"
& $Gsutil -q cp $ZipPath $RemoteUri

Write-Host "Uploaded ok."

# Best-effort retention on the local machine
try {
  $LocalCutoff = (Get-Date).ToUniversalTime().AddDays(-$RetentionDays)
  Get-ChildItem -Path $BackupDir -Filter "studio-*.zip" -File |
    Where-Object { $_.LastWriteTimeUtc -lt $LocalCutoff } |
    Remove-Item -Force
} catch {
  Write-Warning "Local retention cleanup failed: $($_.Exception.Message)"
}

# Best-effort retention in bucket (requires list/delete perms)
try {
  $cutoffStamp = (Get-Date).ToUniversalTime().AddDays(-$RetentionDays).ToString("yyyyMMdd-HHmmss")
  $objs = & $Gsutil ls "gs://$Bucket/$Prefix/studio-*.zip" 2>$null
  foreach ($o in $objs) {
    if ($o -match "studio-(\d{8}-\d{6})\.zip$") {
      $objStamp = $Matches[1]
      if ($objStamp -lt $cutoffStamp) {
        & $Gsutil -q rm $o
      }
    }
  }
} catch {
  Write-Warning "GCS retention cleanup skipped/failed: $($_.Exception.Message)"
}

Write-Host "Done."

