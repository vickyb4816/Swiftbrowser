# Swift Browser 1.2.0 — TLS 1.2 compatibility decision

Date: 2026-11-13
Branch: `rebuild/supermium-1.2.0`
Status: approved design decision; implementation and radio handshake testing are still pending.

## Decision

The first Swift Browser 1.2.0 Supermium-based test build will use **TLS 1.2 only** for HTTPS negotiation:

- Minimum protocol: TLS 1.2
- Maximum protocol: TLS 1.2
- TLS 1.0 and TLS 1.1 remain disabled.
- TLS 1.3 is disabled in this compatibility profile.

Chromium exposes these command-line switches:

```text
--ssl-version-min=tls1.2
--ssl-version-max=tls1.2
```

The browser launcher must pass these switches to the actual Supermium/Chromium browser process. Firefox preferences such as `security.tls.version.min` and `security.tls.version.max` are not Chromium preferences and must not be copied into Swift Browser.

Reference: Chromium source documents `ssl-version-min` and `ssl-version-max` as SSL/TLS version switches. The maximum accepts TLS 1.2 or TLS 1.3; the minimum accepts TLS 1.0, 1.1, 1.2 or 1.3 in the referenced source revision.
- https://github.com/chromium/chromium/blob/main/chrome/common/chrome_switches.h
- https://chromium.googlesource.com/chromium/src.git/+/39562c3c175288eb4b841beb1cd00be63a9d5d50/chrome/common/chrome_switches.cc

## Important technical boundaries

1. This changes the negotiated TLS protocol version only. It does not add missing cipher suites.
2. `ERR_SSL_VERSION_CIPHER_MISMATCH` can still occur if the radio and browser have no mutually supported TLS 1.2 cipher suite.
3. TLS version selection does not fix an untrusted/self-signed certificate. Certificate validation remains enabled.
4. Do not add `--ignore-certificate-errors`, globally accept invalid certificates, enable TLS 1.0/1.1, or globally enable obsolete cipher suites as part of this decision.
5. A TLS-1.2-only profile can fail on an unusual website that requires TLS 1.3. Keep a documented rollback path to the normal TLS 1.2–1.3 profile if compatibility testing finds such a site.

## User-facing behavior

- Initial 1.2.0 test build: start in **TLS 1.2 only** mode.
- Settings should expose the selected mode and explain that changing the mode requires a browser restart.
- A fallback option may restore automatic TLS 1.2–1.3 negotiation; do not expose lower protocols as normal options.
- Display protocol mode as a setting, not as a claim that every cipher or certificate problem has been solved.

## Validation required before release

1. Confirm in `chrome://version` that the launched browser command line contains both TLS switches.
2. Open the user's radio management page at `https://172.26.64.115`.
3. Repeat against several different radio models, not just one IP/device.
4. Test the user's other office web applications, WhatsApp Web, and representative external HTTPS sites.
5. Record the negotiated protocol and cipher for successful handshakes where diagnostics are available.
6. If the radio still fails with TLS 1.2 selected, inspect the actual TLS alert/cipher overlap rather than weakening all browser security.
7. Re-run the tests on Windows 7 Enterprise SP1 x64.

## Current implementation status

- Decision recorded: yes.
- Chromium switches verified in Chromium source: yes.
- Switches wired into a custom Swift Browser/Supermium executable: no.
- Supermium source/build integration completed: no.
- Radio model matrix tested: no.
- Swift Browser 1.2.0 installer/release built: no.

The current branch still contains the Electron 22 application plus planning documents. Do not claim that the current Electron package is already a Supermium-based build.
