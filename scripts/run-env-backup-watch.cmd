@echo off
setlocal
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0watch-env-backup.ps1"
exit /b %ERRORLEVEL%
