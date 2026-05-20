# Prints .env.local keys and lengths for copying into Cursor Cloud Agents → Secrets.
# Does NOT print values. Run: powershell -File .cursor/cloud-secrets-copy.ps1

$envPath = Join-Path (Join-Path $PSScriptRoot '..') '.env.local' | Resolve-Path -ErrorAction SilentlyContinue
if (-not $envPath) {
  Write-Host 'No .env.local found at repo root.'
  exit 1
}

Write-Host 'Add these in https://cursor.com/dashboard/cloud-agents (Secrets tab):'
Write-Host ''

Get-Content $envPath | ForEach-Object {
  if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
    $name = $matches[1]
    $val = $matches[2].Trim().Trim('"').Trim("'")
    if ($val.Length -gt 0) {
      Write-Host ("  {0}  (value length: {1})" -f $name, $val.Length)
    }
  }
}

Write-Host ''
Write-Host 'Optional production secrets (if missing locally): AUTH_GATE_SIGNING_SECRET, OPENAI_API_KEY, GEMINI_API_KEY'
