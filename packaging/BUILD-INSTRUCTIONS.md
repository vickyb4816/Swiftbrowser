# Swift Browser build

The isolated `build-supermium.yml` workflow downloads the pinned upstream Supermium x64 portable archive, verifies its SHA-256, packages the Swift Browser launcher, and creates an Inno Setup installer plus a portable ZIP. Build output is published as a GitHub Actions artifact, not as a public release, until Windows 7 compatibility and TLS behavior are tested.
