# Swift Browser 1.2.0 — Supermium Foundation Roadmap

Status: planning / feasibility validation. This document does not claim that 1.2.0 has been implemented or tested.

## Goal

Replace the Electron 22 / Chromium 108 application with a properly branded Swift Browser built from the Supermium Chromium fork, targeting Windows 7 Enterprise SP1 x64 first. Preserve the existing 1.1.5 release and user data until the replacement passes acceptance tests.

Upstream reference: https://github.com/win32ss/supermium
Initial upstream baseline to evaluate: Supermium 150.0.7871.255 R2.02 (tag v150-r2.02). Re-check upstream before pinning a build revision.

## Non-negotiable engineering rules

- Do not ship a renamed upstream installer as if it were a Swift Browser rebuild.
- Do not delete or overwrite the 1.1.5 release or its source history.
- Keep this work on the rebuild/supermium-1.2.0 branch until the foundation builds and passes tests.
- Preserve user profile data; migration must be explicit, backed up and reversible.
- Keep certificate validation and the browser sandbox enabled. Swift Browser 1.2.0's initial compatibility profile is TLS 1.2 only (minimum and maximum TLS 1.2), using Chromium's `--ssl-version-min=tls1.2` and `--ssl-version-max=tls1.2` switches. Do not enable TLS 1.0/1.1 or globally ignore certificate errors. Keep a documented return to automatic TLS 1.2–1.3 negotiation if a site requires TLS 1.3.
- Do not promise a RAM ceiling or "fastest browser" without reproducible measurements.
- Separate features that can ship in 1.2.0 from items requiring a later milestone.
- Check upstream licensing and notices before distributing modified binaries or source.

## Phase 0 — feasibility and baseline

1. Inspect Supermium source, patch format, build instructions, license, third-party notices and release assets.
2. Confirm the selected upstream revision supports Windows 7 SP1 x64 and determine required system updates/runtime dependencies.
3. Confirm available CI capacity. A full Chromium build is not an ordinary Electron build; estimate disk, RAM, CPU, build time and artifact storage before committing to a build pipeline.
4. Download and test the official upstream x64 build on a clean Windows 7 SP1 x64 machine as a compatibility baseline.
5. Test target office sites, WhatsApp Web, representative extensions and hardware acceleration.
6. Record baseline startup time, idle RAM, RAM with 5/10 tabs, CPU usage, page load behavior and crashes.

Exit gate: no product implementation is declared complete until the baseline is reproducible on the target OS.

## Phase 1 — browser foundation

- Build Swift Browser from the selected Supermium source revision, with proper product branding, installer metadata and About attribution.
- Retain upstream Chromium security sandbox and update relevant security patches.
- Provide a clean browser interface: tabs, address/search bar, back/forward/reload, bookmarks, history, downloads, profiles, context menus and settings.
- Support modern websites and extensions according to the exact upstream engine capabilities. Do not claim every Chrome extension works.
- Keep the interface lightweight; avoid unnecessary background services, animations and bundled services.
- Add import/migration for bookmarks and, where safe and supported, browsing data from the previous Swift Browser. Never overwrite the old profile.

Exit gate: clean install, launch, navigation, downloads, extension installation, profile persistence and uninstall/reinstall tests pass.

## Phase 2 — performance and tab lifecycle

- Establish measured performance baselines before tuning.
- Add pinned tabs and protected tabs that are excluded from automatic discard.
- Add configurable discard/sleep for ordinary inactive tabs, plus manual discard and reload.
- Make discarded tabs visibly identifiable and reload them on selection.
- Restore session and preserve cookies/profile state.
- Do not claim a discarded tab retains live JavaScript state.
- Tune memory saver, process reuse, cache and background throttling only after measuring regressions.

Exit gate: compare idle and multi-tab RAM/CPU with the same test set; ensure protected tabs remain loaded.

## Phase 3 — office device compatibility

- Start with the approved TLS 1.2-only browser profile recorded in `TLS-1.2-COMPATIBILITY-DECISION.md`; verify the actual radio handshakes across multiple models.
- Do not assume TLS 1.2 alone fixes cipher-suite mismatches; capture/inspect handshake details when a device still fails.
- Add per-host certificate trust/compatibility controls only where required, without disabling validation globally.
- Add a per-host legacy-device compatibility profile for explicitly approved private office devices.
- Prefer installing/trusting the correct internal CA certificate. Provide narrowly scoped certificate exceptions only when necessary and clearly warn about risks.
- Do not turn off certificate validation globally, and do not silently weaken TLS for public websites.
- Test HTTP/HTTPS, self-signed certificates, legacy TLS versions/ciphers, redirects, WebSockets and device login workflows separately.
- Investigate Siebel as a separate native IE10/MSHTML host integration. Chromium does not provide IE10, Java browser plugin or ActiveX support. The existing 1.1.5 separate-IE launcher is not equivalent to embedded IE mode.
- Test Siebel with the actual installed Java architecture/version and ActiveX controls on the target PC.

Exit gate: named office-device test matrix and actual Siebel workflow pass on the target machine.

## Phase 4 — productivity tools

- MAC address converter in sidebar/toolbar: colon, hyphen, Cisco dotted and plain hexadecimal formats; validation, copy and clear.
- Cache controls in Settings: cache-only cleanup separately from cookies, site data, history and downloads. Explain that clearing cookies/site data can sign users out.
- Hindi/English website assistant: opt-in sidebar, user-triggered page context only, explicit privacy disclosure, no automatic upload of passwords, form contents or private pages. Decide on a supported translation/chat provider and key-handling model before implementation.
- Keep tools optional and lazy-loaded so they do not consume RAM when unused.

Exit gate: each tool works offline where applicable, persists settings, and has no always-running background process unless required.

## Phase 5 — updates and release engineering

- Settings > About: current version, build date and manual update check.
- Signed/verified update metadata and secure download/install flow, with rollback and profile backup.
- Preserve profile, cookies, bookmarks, extensions, settings and pinned tabs across upgrades.
- Test 1.1.5-to-1.2.0 migration and at least one 1.2.x in-app update on Windows 7.
- Publish a public GitHub release with installer, portable ZIP, checksums, release notes and required third-party notices.

Exit gate: install, upgrade, rollback and data-preservation tests pass on target Windows 7 x64.

## Acceptance matrix

| Area | Required proof |
|---|---|
| OS | Windows 7 Enterprise SP1 x64 clean-machine install |
| Web | User's actual office sites, local IP radios, Capstone and WhatsApp Web |
| Extensions | Install, enable, update and run a representative extension set |
| Siebel | Embedded IE10 host, Java and ActiveX tested separately |
| Security | Sandbox remains enabled; no global TLS/certificate bypass |
| Performance | Repeatable startup, idle RAM, 5/10-tab RAM and CPU measurements |
| Tabs | Protected tabs stay loaded; ordinary discarded tabs restore predictably |
| Updates | Manual check, download, install, rollback and profile preservation |
| Productivity | MAC converter, cache controls and optional Hindi/English assistant |

## Release policy

Version 1.2.0 must not be tagged or published until Phase 1 and the required Windows 7 acceptance gates pass. If the upstream source cannot be built reproducibly with available infrastructure, stop and present the blocker rather than publishing a misleading installer.
