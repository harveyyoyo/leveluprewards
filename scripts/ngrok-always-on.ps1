# Install or control ngrok as a Windows service (always-on dev tunnel).
#
# Uses ngrok's built-in service: https://ngrok.com/docs/agent/#ngrok-as-a-service
# Reads NGROK_DOMAIN from .env.local (repo root). Requires admin for install/uninstall.
#
# Usage (from repo root):
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ngrok-always-on.ps1 -Action install
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ngrok-always-on.ps1 -Action start
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ngrok-always-on.ps1 -Action stop
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ngrok-always-on.ps1 -Action status
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ngrok-always-on.ps1 -Action uninstall

param(
    [ValidateSet('install', 'start', 'stop', 'restart', 'status', 'uninstall')]
    [string]$Action = 'status',
    [string]$Port = '3000'
)

$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
    return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
}

function Read-EnvLocalValue {
    param([string]$Key, [string]$Root)
    $path = Join-Path $Root '.env.local'
    if (-not (Test-Path -LiteralPath $path)) { return '' }
    foreach ($line in Get-Content -LiteralPath $path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
        $eq = $trimmed.IndexOf('=')
        if ($eq -le 0) { continue }
        $name = $trimmed.Substring(0, $eq).Trim()
        if ($name -ne $Key) { continue }
        $value = $trimmed.Substring($eq + 1).Trim()
        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        return $value
    }
    return ''
}

function Find-NgrokExe {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'ngrok\ngrok.exe'),
        (Join-Path $env:ProgramFiles 'ngrok\ngrok.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'ngrok\ngrok.exe')
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    $cmd = Get-Command ngrok -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw 'ngrok not found. Install from https://ngrok.com/download or winget install ngrok.ngrok'
}

function Write-TunnelConfig {
    param(
        [string]$Path,
        [string]$Domain,
        [string]$ListenPort
    )
    $yaml = @"
version: "2"
tunnels:
  levelup-dev:
    proto: http
    addr: 127.0.0.1:$ListenPort
    domain: $Domain
"@
    Set-Content -LiteralPath $Path -Value $yaml -Encoding UTF8
}

function Stop-StandaloneNgrok {
    Get-Process -Name ngrok -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host ('[ngrok-always-on] Stopping standalone ngrok (PID ' + $_.Id + ')...')
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
}

function Get-TunnelPublicUrl {
    try {
        $data = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 3
        $tunnel = $data.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1
        return $tunnel.public_url
    } catch {
        return $null
    }
}

$root = Get-RepoRoot
$ngrokExe = Find-NgrokExe
$authConfig = Join-Path $env:LOCALAPPDATA 'ngrok\ngrok.yml'
$tunnelConfig = Join-Path $env:LOCALAPPDATA 'ngrok\levelup-edu-dev.yml'
$domain = Read-EnvLocalValue -Key 'NGROK_DOMAIN' -Root $root

if (-not (Test-Path -LiteralPath $authConfig)) {
    throw "Missing ngrok authtoken config at $authConfig. Run: ngrok config add-authtoken YOUR_TOKEN"
}

switch ($Action) {
    'install' {
        if (-not $domain) {
            throw @"
NGROK_DOMAIN is not set in .env.local.

Add your free dev domain, for example:
  NGROK_DOMAIN=your-name.ngrok-free.dev

Claim it at https://dashboard.ngrok.com/domains
"@
        }

        Write-TunnelConfig -Path $tunnelConfig -Domain $domain -ListenPort $Port
        Write-Host "[ngrok-always-on] Tunnel config: $tunnelConfig"
        Write-Host "[ngrok-always-on] Domain: https://$domain"

        Stop-StandaloneNgrok

        & $ngrokExe service uninstall 2>$null | Out-Null

        Write-Host '[ngrok-always-on] Installing ngrok Windows service (admin may be required)…'
        & $ngrokExe service install --config="$authConfig" --config="$tunnelConfig"
        if ($LASTEXITCODE -ne 0) {
            throw 'ngrok service install failed. Re-run PowerShell as Administrator.'
        }

        & $ngrokExe service start
        if ($LASTEXITCODE -ne 0) {
            throw 'ngrok service start failed.'
        }

        Start-Sleep -Seconds 2
        $url = Get-TunnelPublicUrl
        if ($url) {
            Write-Host "[ngrok-always-on] Running: $url"
        } else {
            Write-Host '[ngrok-always-on] Service started. Check http://127.0.0.1:4040 for tunnel status.'
        }

        Write-Host @'

[ngrok-always-on] ngrok will now start automatically when Windows boots.

Keep the dev server running on port 3000:
  npm run dev

Service commands:
  npm run dev:tunnel:service:status
  npm run dev:tunnel:service:stop
  npm run dev:tunnel:service:start
  npm run dev:tunnel:service:uninstall
'@
    }

    'start' {
        & $ngrokExe service start
        Start-Sleep -Seconds 2
        $url = Get-TunnelPublicUrl
        if ($url) { Write-Host "[ngrok-always-on] Running: $url" }
    }

    'stop' {
        & $ngrokExe service stop
        Write-Host '[ngrok-always-on] Service stopped.'
    }

    'restart' {
        & $ngrokExe service restart
        Start-Sleep -Seconds 2
        $url = Get-TunnelPublicUrl
        if ($url) { Write-Host "[ngrok-always-on] Running: $url" }
    }

    'uninstall' {
        Stop-StandaloneNgrok
        & $ngrokExe service stop 2>$null | Out-Null
        & $ngrokExe service uninstall
        if (Test-Path -LiteralPath $tunnelConfig) {
            Remove-Item -LiteralPath $tunnelConfig -Force
        }
        Write-Host '[ngrok-always-on] Service uninstalled.'
    }

    'status' {
        $url = Get-TunnelPublicUrl
        if ($url) {
            Write-Host "[ngrok-always-on] Tunnel active: $url"
        } else {
            Write-Host '[ngrok-always-on] No active tunnel on http://127.0.0.1:4040'
        }
        if ($domain) {
            Write-Host "[ngrok-always-on] Configured domain (.env.local): https://$domain"
        } else {
            Write-Host '[ngrok-always-on] NGROK_DOMAIN not set in .env.local'
        }
        Write-Host "[ngrok-always-on] Auth config: $authConfig"
        Write-Host "[ngrok-always-on] Tunnel config: $tunnelConfig"
    }
}
