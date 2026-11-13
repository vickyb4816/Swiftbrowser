@echo off
setlocal
set "SCRIPT=%~dp0swift-launcher\SwiftBrowser.ps1"
if not exist "%SCRIPT%" set "SCRIPT=%~dp0SwiftBrowser.ps1"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
if errorlevel 1 (
  echo Swift Browser could not start. Please reinstall the application.
  pause
)
endlocal
