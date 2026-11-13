# Swift Browser build

The isolated workflow downloads the pinned official Supermium x64 portable archive, verifies its SHA-256, flattens the upstream folder layout, compiles a small .NET 2.0-compatible SwiftBrowser.exe launcher, and creates an installer plus portable ZIP.

For the portable ZIP, extract the complete archive and double-click **SwiftBrowser.exe** at the top level. Do not launch chrome.exe inside the Supermium folder: that bypasses Swift Browser's TLS launch arguments.

The launcher starts Windows PowerShell 2.0-compatible script code and requests TLS 1.2 only. It does not disable certificate validation or the browser sandbox. A TLS 1.2 setting cannot fix a server's invalid certificate, unsupported cipher suite, or incompatible signature algorithm.

CI packaging success is not proof of Windows 7 device compatibility. Test on the target Windows 7 PC before treating this as a release.
