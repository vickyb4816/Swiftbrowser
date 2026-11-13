# Swift Browser 1.2.0 — Phase 0 feasibility assessment

Date: 2026-11-13
Branch: rebuild/supermium-1.2.0

## Current result

The project is feasible in principle, but a custom Supermium-derived Windows browser is a Chromium source-build project, not an Electron packaging task. No installer should be promised until the source build and target-OS runtime are proven.

## Upstream facts verified

- Upstream project: https://github.com/win32ss/supermium
- Evaluated release: v150-r2.02, version 150.0.7871.255 R2.02.
- Release notes specifically mention a Windows 7 fix for SetDefaultDllDirectories on systems missing pre-2013 updates.
- Upstream project describes Windows 7 compatibility, functional sandbox, security patch turnaround, Widevine on Windows 7+, and Manifest V2 support.
- Official release page: https://github.com/win32ss/supermium/releases/tag/v150-r2.02
- Official project description: https://github.com/win32ss/supermium/blob/main/.github/README.md

## Critical build-system finding

The upstream GitHub repository is a Chromium fork/patch set, not a small standalone browser project with a simple npm install and build workflow. Chromium's Windows build process uses depot_tools, gclient, GN and Ninja, plus a supported Visual Studio/Windows SDK toolchain and a very large source/dependency checkout.

Therefore:
- The existing Swift Browser Electron workflow cannot build Supermium.
- A Windows GitHub-hosted runner may not provide enough disk, RAM, build time or caching for a reliable full Chromium build.
- The repository must pin a known Supermium tag/commit and a matching Chromium source revision; never build from a floating main branch.
- We need to inspect upstream build scripts/patches and licensing before deciding whether to maintain a reproducible custom source build or distribute a separately branded integration based on upstream binaries, subject to licensing and branding requirements.

## Target-PC compatibility gate

Before custom branding, obtain a clean test machine or VM matching Windows 7 Enterprise SP1 x64 and verify:
1. Required Windows servicing stack/platform updates and Universal C Runtime prerequisites.
2. Supermium x64 clean installation and first launch.
3. HTTPS modern websites and WhatsApp Web.
4. Representative Chrome extensions: at least one Manifest V2 and one Manifest V3 extension.
5. Office local-IP device pages and certificate behavior.
6. GPU/driver stability on the Intel integrated graphics.
7. Idle RAM, 5-tab RAM, 10-tab RAM, CPU and startup measurements.

A browser that launches on a modern Windows build is not proof of Windows 7 compatibility.

## Current Swift Browser source risk

The current 1.1.5 main.js uses Electron with nodeIntegration enabled and contextIsolation disabled. That is not an acceptable foundation for a modern remote-web browser security model. The replacement should not carry this architecture forward. User-facing pages must not receive unrestricted Node access.

## Recommendation

Proceed with a two-part prototype:
A. Test the official upstream x64 release on the actual target Windows 7 PC first.
B. In parallel, create a reproducible build feasibility branch that pins upstream source, records toolchain requirements and validates the build on a properly provisioned Windows build host.

Do not merge to main or tag 1.2.0 until these gates pass. Keep 1.1.5 and its release intact.

## Explicitly not completed

- No custom Swift Browser binary has been built.
- No UI or branding has been changed.
- No Windows 7 target-PC tests have been run.
- No extension, WhatsApp, office device, Siebel, RAM or update acceptance tests have passed.
- No 1.2.0 release has been created.
