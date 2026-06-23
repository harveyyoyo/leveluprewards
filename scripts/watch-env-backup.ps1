# Watches .env.local / .env and uploads to GCS when they change (debounced).
param(
  [int]$DebounceMs = 2000
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BackupScript = Join-Path $PSScriptRoot "backup-env-to-gcs.ps1"
$LogDir = Join-Path $RepoRoot ".local-backups"
$LogPath = Join-Path $LogDir "env-watch.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Log([string]$Message) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Add-Content -Path $LogPath -Value $line
  Write-Host $line
}

function Invoke-EnvBackup {
  try {
    & $BackupScript
    Write-Log "Upload ok."
  } catch {
    Write-Log "Upload failed: $($_.Exception.Message)"
  }
}

function Test-EnvFileName([string]$Name) {
  return $Name -eq ".env.local" -or $Name -eq ".env"
}

$hasEnv = (Test-Path (Join-Path $RepoRoot ".env.local")) -or (Test-Path (Join-Path $RepoRoot ".env"))
if (-not $hasEnv) {
  Write-Log "No .env.local or .env yet. Waiting for one to appear..."
} else {
  Write-Log "Initial upload..."
  Invoke-EnvBackup
}

Write-Log "Env backup watcher started (debounce ${DebounceMs}ms). Press Ctrl+C to stop."

$state = @{ dirty = $false; lastEvent = [datetime]::MinValue }

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $RepoRoot
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $false
$watcher.NotifyFilter = [IO.NotifyFilters]::LastWrite -bor [IO.NotifyFilters]::FileName

$markDirty = {
  $name = $Event.SourceEventArgs.Name
  if ($name -eq ".env.local" -or $name -eq ".env") {
    $Event.MessageData.dirty = $true
    $Event.MessageData.lastEvent = [datetime]::UtcNow
  }
}

$subChanged = Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $markDirty -MessageData $state
$subCreated = Register-ObjectEvent -InputObject $watcher -EventName Created -Action $markDirty -MessageData $state
$subRenamed = Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $markDirty -MessageData $state

$watcher.EnableRaisingEvents = $true

try {
  while ($true) {
    if ($state.dirty) {
      $quietFor = ([datetime]::UtcNow - $state.lastEvent).TotalMilliseconds
      if ($quietFor -ge $DebounceMs) {
        $state.dirty = $false
        Write-Log "Change detected - uploading..."
        Invoke-EnvBackup
      }
    }
    Start-Sleep -Milliseconds 400
  }
} finally {
  $watcher.EnableRaisingEvents = $false
  $watcher.Dispose()
  Unregister-Event -SourceIdentifier $subChanged.Name -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier $subCreated.Name -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier $subRenamed.Name -ErrorAction SilentlyContinue
  Write-Log "Env backup watcher stopped."
}
