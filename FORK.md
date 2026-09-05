# Fork workflow

This fork keeps `main` as a clean mirror of upstream and carries its own work
on `dev`. Packaged builds come from `dev`, are versioned with a `-gg.N` suffix,
and have the in-app updater compiled out, so they never offer to replace
themselves with an upstream release.

## Remotes and branches

| Branch | Tracks          | Purpose                                                    |
| ------ | --------------- | ---------------------------------------------------------- |
| `main` | `upstream/main` | Mirror of stablyai/orca. Fast-forward only, never commit.  |
| `dev`  | `origin/dev`    | Fork development. Merges `main` in; builds come from here. |

Feature branches meant for an upstream PR start from `main`. Feature branches
meant only for this fork start from `dev`.

## Pull upstream in

```bash
git checkout main && git pull --ff-only          # main mirrors upstream/main
git push origin main                             # keep the fork's mirror current
git checkout dev && git merge main               # bring upstream into dev
```

## Build a package

```bash
pnpm build:fork 2                                # -> dist/fork/orca-linux-1.4.197-gg.2.AppImage + .deb
./dist/fork/orca-linux-1.4.197-gg.2.AppImage      # run it in place, or: sudo apt install ./dist/fork/orca-ide_1.4.197-gg.2_amd64.deb
```

Each build lands under a versioned name in `dist/fork/` and is never overwritten; the script refuses a version that already exists. The AppImage needs no install and no sandbox setup (its launcher passes `--no-sandbox`). The `.deb` installer fixes Chromium's SUID sandbox helper itself, which the
AppImage cannot do on Ubuntu with restricted user namespaces. The version is
stamped at build time through `ORCA_LOCAL_BUILD_VERSION`; package.json is never
edited, so version bumps never conflict on merge. The installed CLI is
`orca-ide` (Linux keeps `orca` for GNOME's screen reader).

The RPM target runs last and needs `rpmbuild` (`sudo apt-get install rpm`).
Without it the build exits non-zero after the `.deb` and AppImage are already
in `dist/`, so the failure is harmless for a Debian-family host.

## Fork-only changes

Kept deliberately small so merges from upstream stay cheap:

- `ORCA_UPDATES_DISABLED` build constant and `src/main/updater/updater-build-opt-out.ts`
- `config/scripts/build-fork-linux.mjs`
- this file
