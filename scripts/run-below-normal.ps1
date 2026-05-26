# Run a shell command at BelowNormal CPU priority on Windows (for long Remotion renders).
# Usage from repo root or promo-video:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-below-normal.ps1 -Command "npx remotion render ..."
#   powershell -NoProfile -ExecutionPolicy Bypass -File ../scripts/run-below-normal.ps1 -WorkingDirectory . -Command "npm run render:feature:epic"
param(
    [string]$WorkingDirectory = (Get-Location).Path,
    [ValidateSet('Idle', 'BelowNormal', 'Normal')]
    [string]$PriorityClass = 'BelowNormal',
    [string]$Command,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Remaining
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Command)) {
    if ($Remaining -and $Remaining.Count -gt 0) {
        $Command = ($Remaining -join ' ').Trim()
    }
}

if ([string]::IsNullOrWhiteSpace($Command)) {
    Write-Error 'Provide -Command "<shell command>" or pass the command as remaining arguments.'
}

if (-not [System.IO.Path]::IsPathRooted($WorkingDirectory)) {
    $WorkingDirectory = Join-Path (Get-Location).Path $WorkingDirectory
}
$WorkingDirectory = (Resolve-Path -LiteralPath $WorkingDirectory).Path

if (-not (Test-Path -LiteralPath $WorkingDirectory -PathType Container)) {
    Write-Error "WorkingDirectory does not exist: $WorkingDirectory"
}

$priorityEnum = [System.Diagnostics.ProcessPriorityClass]::$PriorityClass

Write-Host "[$PriorityClass] $WorkingDirectory> $Command"

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'cmd.exe'
$psi.Arguments = "/c $Command"
$psi.WorkingDirectory = $WorkingDirectory
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$process = [System.Diagnostics.Process]::Start($psi)
if (-not $process) {
    Write-Error 'Failed to start process.'
}
$process.PriorityClass = $priorityEnum
$process.WaitForExit() | Out-Null
exit $process.ExitCode
