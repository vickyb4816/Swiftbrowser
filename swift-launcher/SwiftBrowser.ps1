param(
    [string[]]$BrowserArgs = @()
)
$ErrorActionPreference = "Stop"
# Use syntax supported by the Windows PowerShell 2.0 shipped with many Windows 7 PCs.
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$browserRoot = Join-Path (Split-Path -Parent $scriptDir) "Supermium"
$browser = Join-Path $browserRoot "chrome.exe"
if (-not (Test-Path -LiteralPath $browser)) {
    $candidate = Get-ChildItem -LiteralPath $browserRoot -Recurse -ErrorAction SilentlyContinue |
        Where-Object { -not $_.PSIsContainer -and $_.Name -ieq "chrome.exe" } |
        Select-Object -First 1
    if ($null -eq $candidate) { throw "Supermium chrome.exe was not found. Reinstall Swift Browser." }
    $browser = $candidate.FullName
}
$profile = Join-Path $env:LOCALAPPDATA "SwiftBrowser\User Data"
New-Item -ItemType Directory -Force -Path $profile | Out-Null
# Keep Chromium certificate verification and sandbox enabled. TLS is restricted to 1.2 by request.
$arguments = @(
    "--user-data-dir=$profile",
    "--ssl-version-min=tls1.2",
    "--ssl-version-max=tls1.2",
    "--no-first-run",
    "--no-default-browser-check"
) + $BrowserArgs
Start-Process -FilePath $browser -ArgumentList $arguments -WorkingDirectory (Split-Path $browser)
