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

The product site — landing page, interactive 50-scene showcase (50 built-in 16-bit
arcade & mathematical scenes in a single unified binary), and the documented install
entry point for [IdleScreen](https://idlescreen.github.io) (`v4.3.0`) —
zero-overhead Wayland screensavers for Linux featuring First-Class SuperFedora
integration, clean OS-only (or custom text) 16-bit arcade banners, 8-theme /
8-drift-mode 3-layer parallax starfields, `wp_viewporter` 1x native grid GPU
scaling, `ext-idle-notify-v1` + GNOME Mutter idle tracking, `idlescreen preview --tour`,
and multi-init support (`systemd`, `OpenRC`, `runit`, `s6`, `dinit`, XDG autostart).

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
