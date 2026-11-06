# idlescreen.github.io

<div align="center">

| Security Pillar | Verification Badge |
| :--- | :---: |
| **Platform Standard** | [![secured by studio2201][b-studio]][u-home] |
| **Credential Defense** | [![snip][b-snip]][u-snip] |
| **Supply Chain Surface** | [![vigil][b-vigil]][u-vigil] |
| **Post-Quantum Cryptography** | [![aegis][b-aegis]][u-aegis] |
| **Build Provenance & SLSA** | [![proven][b-proven]][u-proven] |
| **Repository Governance** | [![boneyard][b-boneyard]][u-boneyard] |

[b-studio]: https://img.shields.io/badge/secured%20by-studio2201-2f6f5e?logo=shield
[u-home]: https://studio2201.com
[b-snip]: https://img.shields.io/badge/snip-0%20secrets-2f6f5e?logo=shield
[u-snip]: https://studio2201.com/snip
[b-vigil]: https://img.shields.io/badge/vigil-0%20dependencies-2f6f5e?logo=shield
[u-vigil]: https://studio2201.com/vigil
[b-aegis]: https://img.shields.io/badge/aegis-PQC%20compliant-2f6f5e?logo=shield
[u-aegis]: https://studio2201.com/aegis
[b-proven]: https://img.shields.io/badge/proven-ML--DSA--65%20verified-2f6f5e?logo=shield
[u-proven]: https://studio2201.com/proven
[b-boneyard]: https://img.shields.io/badge/boneyard-maintained-2f6f5e?logo=shield
[u-boneyard]: https://studio2201.com/boneyard

</div>

The product site — landing page, interactive 53-scene showcase (53 built-in 16-bit
arcade & mathematical scenes in a single unified binary), and the documented install
entry point for [IdleScreen](https://idlescreen.github.io) (`v5.0.0`) —
a capability-secured screensaver and idle management suite for Linux (`ELF`) and Windows (`PE32+`) built natively in **openOODA (`.oo`)** with zero external runtime dependencies:

- **`339 KB` Single Binary & `< 2.7 MiB` Flat 1,000-Frame RSS**: Per-frame OODA arena reclamation (`@oo_arena_mark` / `@oo_arena_reset_mark`) sustains a flat `2.62 MiB` resident footprint across 1,000+ frames with `0.00%` CPU at idle.
- **Default-Deny Capability Security (`std/core/ooda.oo` + `std/sec/pqc.oo`)**: Explicit capability tokens for every I/O surface (`CAP_FS_READ`, `CAP_STDIO`) and zero `unsafe` blocks.
- **53 Built-In Scenes & `18/18` Bit-Exact Golden Parity**: Clean OS-only (or custom text) 16-bit block wordmarks (`OPENOODA`, `SUPERFEDORA`, `FEDORA`, `ARCH`, `UBUNTU`, `DEBIAN`, etc.), 4×8 sub-cell sprite Scale2x compositing (`mmx`, `zero`), 3-layer parallax starfields, interactive `idlescreen tui` director, `idlescreen preview --tour`, container/cage detection (`CosmicCage`, `PodmanContainer`, `GenericContainer`, `Host`), and multi-init service support (`systemd`, `OpenRC`, `runit`, `s6`, `dinit`, XDG autostart).

## Install

Visit <https://idlescreen.github.io>. The install command surfaces the
[`packages`](https://github.com/idlescreen/packages) channel:

```sh
curl -fsSL https://idlescreen.github.io/install.sh | sh
```

To verify before running:

```sh
curl -fsSL https://idlescreen.github.io/install.sh -o install.sh
./install.sh --verify
./install.sh
```

The canonical installer forwards securely to the package channel installer (`https://idlescreen.github.io/packages/install.sh`), enforcing cryptographic SHA-256 validation before execution. The channel installer verifies all modular bootstrap components, configures package repositories (DNF/APT/pacman), deploys packages, and safely preserves existing user configurations in `~/.config/idlescreen/config.toml` (and legacy `config.yaml`).

## License

Apache-2.0 · © 2026 IdleScreen
