# Swift Browser 1.2.0 — Fresh Supermium-Based Roadmap

## Project reset

This is a clean implementation track. The existing Electron 1.1.5 application and the earlier experimental branch are not the foundation for this build. The existing `main` branch and published releases remain untouched.

**Product:** Swift Browser  
**Credit:** Made by Vicky Bhalerao  
**Engine foundation:** Official Supermium for Windows 7  
**Target machine:** Windows 7 Enterprise SP1 x64, Intel Core i3, integrated graphics, 8 GB RAM, SSD  
**First target:** Windows x64 installer and portable ZIP  
**Pinned upstream baseline:** Supermium 150.0.7871.255 R2.02, tag `v150-r2.02`, upstream commit `bf7e71c` (verify tag and release assets again at build time).

## Non-negotiable product requirements

1. A ready-to-install browser. TLS compatibility is configured automatically at launch; the user must not edit shortcut properties, flags, or browser settings.
2. Supermium is the browser engine. Do not substitute Electron, WebView2, or Chromium 108.
3. Preserve normal certificate verification. Never globally ignore certificate errors.
4. Requested TLS profile for the first radio-device test build: minimum TLS 1.2 and maximum TLS 1.2. This forces TLS 1.2 negotiation. It does **not** guarantee compatibility if a radio has no cipher suite in common or uses an untrusted certificate.
5. Keep the original Supermium sandbox enabled. Do not disable it to make office devices work.
6. Build and test on Windows 7 SP1 x64. Do not claim compatibility based only on a successful build on Windows 10/11.
7. Do not overwrite the existing Swift Browser 1.1.5 release or its source branch.

## Product requirements carried forward

- Protected/pinned work tabs: Siebel, WhatsApp Web, and Capstone. These tabs must not be discarded by automatic tab sleeping.
- Other inactive tabs may be suspended after a configurable idle period; restore them when selected.
- Siebel compatibility: launch the installed Windows Internet Explorer 10 engine as a separate native window for the required IE10, Java, and ActiveX workflow. Supermium cannot host IE ActiveX/Java plugins natively. Verify the actual installed Java/ActiveX prerequisites and enterprise policy; do not claim embedded IE mode.
- Office radio/device pages: test the user's actual devices, including `https://172.26.64.115`, and the previously reported office endpoint `https://192.168.249.102`. Do not assume one device's result proves all models.
- WhatsApp Web and Capstone: test sign-in, session persistence, file upload/download, calls/media where applicable, and normal browsing.
- MAC address converter: a small built-in utility page.
- Hindi-English chatbot: optional feature only; opt-in, clearly disclose network/API use, and never collect page contents or credentials by default.
- Cache cleaner: clear cache only by default; do not silently erase cookies, passwords, or sessions.
- In-app updater: signed/versioned release metadata and a clear confirmation before installing an update.
- App attribution: “Made by Vicky Bhalerao”. Do not display GitHub branding in the browser UI.

## Architecture decision

### Phase 1: Supermium distribution wrapper (first usable milestone)

Use the official, unmodified Supermium x64 distribution as the engine. Build a Swift Browser installer/launcher package around it:
- Install the pinned Supermium distribution into a Swift Browser-owned application directory.
- Launch its browser executable with a controlled, documented set of startup arguments. TLS 1.2 min/max are supplied automatically by the launcher; no user shortcut editing.
- Keep user profile data in a dedicated Swift Browser profile directory and never overwrite an existing Supermium profile.
- Provide Swift Browser Start Menu and desktop shortcuts, product metadata, app icon/branding where redistribution terms permit, and clean uninstall.
- Include upstream notices, license texts, version manifest, and SHA-256 hashes for every upstream binary.
- Do not patch or replace Supermium executable/DLL resources in the first milestone. Avoid binary patching that could break signatures, sandboxing, or updates.

This phase delivers a working Supermium-based browser package with the TLS policy and a stable install/uninstall path. It does not yet promise a fully custom Chromium tab strip or custom browser chrome.

### Phase 2: Swift Browser controls

Add a small, separately maintained control layer for:
- Protected tab list and tab-sleep policy.
- Siebel external IE10 launcher.
- MAC converter.
- Cache-only cleanup.
- Update checks and release channel.
The control layer must not inject code into arbitrary pages, weaken same-origin protections, or turn off the Supermium sandbox.

### Phase 3: Compatibility and performance qualification

Run a repeatable Windows 7 test matrix:
- Cold start, warm start, 1/5/10/20 tabs, memory use after 10 minutes idle, and tab restore time.
- Office radio endpoints across every available model; record TLS protocol, negotiated cipher, certificate result, and page outcome.
- HTTPS sites that require current TLS/ciphers and certificate validation.
- WhatsApp Web, Capstone, extensions, downloads, printing, audio/video, and session persistence.
- IE10/Siebel workflow separately.
- Sleep/wake, crash recovery, uninstall/reinstall, and profile preservation.

No performance claim such as “fastest” or a fixed RAM limit without measurements.

### Phase 4: Release

Publish only after:
- The installer and portable ZIP are built from the same pinned source inputs.
- SHA-256 checksums and upstream license/notices are included.
- Clean install, upgrade, rollback, and uninstall pass on Windows 7 SP1 x64.
- The actual radio devices pass the TLS 1.2 compatibility matrix.
- A release notes page lists known limitations and tested OS/build.

## Build pipeline and repository layout

Keep the new project isolated under `fresh/supermium-swift-1.2.0`. Suggested layout:

- `packaging/` — installer definitions, launcher configuration, icons, and version manifest.
- `scripts/` — reproducible download, hash verification, staging, packaging, and smoke-test scripts.
- `docs/` — architecture, compatibility matrix, release checklist, and upstream notices.
- `tests/` — launch/TLS configuration checks and Windows 7 manual test records.
- `vendor-notices/` — Supermium and third-party license/attribution files.

The CI pipeline must download only the pinned official upstream release, verify its SHA-256, package it, and publish a draft artifact first. It must not silently publish a production release or overwrite v1.1.5.

## Explicit technical risks / gates

- **TLS protocol is not the whole handshake.** If a radio's TLS 1.2 cipher suites, signature algorithms, key exchange, or certificate chain are incompatible, forcing TLS 1.2 alone will not fix it. Collect a handshake diagnostic from each model before adding any narrowly scoped compatibility exception.
- **Certificate validation stays on.** If an office device uses a self-signed or privately issued certificate, install the correct office CA certificate or use a clearly approved, exact-host exception as a separate decision. Never disable verification globally.
- **Siebel is not Chromium IE mode.** The required IE10/Java/ActiveX path remains an external native IE window unless a separately tested enterprise integration is developed.
- **Supermium licensing and binary redistribution.** Confirm the exact upstream license and redistribution conditions for the pinned release, include all notices, and preserve attribution. Do not claim to be the official Supermium project.
- **Security maintenance.** A wrapper does not make upstream Supermium security updates automatic. Every Swift Browser release must pin and test a current upstream Supermium release.

## Milestones and exit criteria

| Milestone | Deliverable | Exit condition |
|---|---|---|
| M0 — Reset and pin | This roadmap, pinned upstream baseline, clean branch | No Electron dependency in the new project plan |
| M1 — Engine package | Swift Browser installer + portable ZIP | Installs and launches Supermium on Windows 7; TLS 1.2 policy applied automatically |
| M2 — Work features | Protected tabs, IE10 launcher, utilities, cache cleaner | Each feature passes its own test checklist |
| M3 — Compatibility | Radio, WhatsApp, Capstone, extension and performance report | Actual target devices and workflows pass or documented blockers remain |
| M4 — Release candidate | Signed/versioned installer, ZIP, checksums, notices | Clean-install and upgrade tests pass |
| M5 — Public release | Swift Browser 1.2.0 | Release checklist signed off |

## Current status

- [x] Fresh branch created from the existing stable `main` branch.
- [x] Product requirements and architecture reset documented.
- [ ] Pinned Supermium archive downloaded and SHA-256 verified in the build environment.
- [ ] Launcher and installer implemented.
- [ ] Windows 7 build and smoke tests run.
- [ ] Radio device TLS handshakes tested.
- [ ] Installer and portable ZIP published.

**Important:** This roadmap commit is not a browser installer. No binary should be advertised as ready until the remaining build and test gates are complete.


## Build update — 2026-11-13

- First Windows x64 packaging build completed successfully in GitHub Actions.
- Verified official Supermium 150.0.7871.255 R2.02 portable archive against SHA-256: `50498112ed7107df9ec3b59794850eff5a9c08918895308bcb529171a5e9a007`.
- Produced Swift Browser 1.2.0 Windows x64 installer and portable ZIP as workflow artifacts; checksum file included.
- Launcher applies the requested TLS 1.2-only min/max policy at startup and uses a separate Swift Browser profile. Certificate validation and Chromium sandbox are not disabled.
- Launcher script adjusted to avoid PowerShell 3+ syntax and remain compatible with Windows PowerShell 2.0.
- Build run: https://github.com/vickyb4816/Swiftbrowser/actions/runs/43410064863
- Artifact expires 2026-12-13; it is a CI artifact, not a permanent public release.
- Not yet verified on the user's Windows 7 PC or office radio devices. The hosted packaging runner was Windows Server 2025; successful packaging does not prove Windows 7 runtime compatibility.
- Remaining before a public release: install/launch test on Windows 7 x64, confirm TLS flags are honored by this Supermium build, test office device TLS cipher/certificate compatibility, test WhatsApp Web/Capstone/extensions, then implement the separate tab-management and utility features.
