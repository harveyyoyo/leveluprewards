@echo off
setlocal
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup-local-folder-to-gcs.ps1"
exit /b %ERRORLEVEL%
