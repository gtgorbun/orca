#!/usr/bin/env node
/**
 * Build a Linux package of this fork with a suffixed version and the in-app
 * updater compiled out, then file the artifacts under versioned names.
 *
 * Usage: node config/scripts/build-fork-linux.mjs [<n>] [--suffix <id>]
 *        pnpm build:fork [<n>]
 *
 * The version is `<package.json version>-<suffix>.<n>` (default suffix `gg`,
 * default n `1`), stamped through ORCA_LOCAL_BUILD_VERSION so package.json stays
 * untouched and never conflicts with upstream's version bumps. The dash makes
 * the build report itself as a prerelease, and ORCA_UPDATES_DISABLED=1 keeps it
 * from polling upstream's feed.
 *
 * electron-builder writes an unversioned `dist/orca-linux.AppImage`, which a
 * rebuild would overwrite underneath a running copy. So each build's AppImage
 * and .deb are moved to `dist/fork/` with the version in the file name, and a
 * version that is already there is refused before any work starts.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '../..')
const distDir = resolve(repoRoot, 'dist')
const forkDir = resolve(distDir, 'fork')

function parseArgs(argv) {
  let suffix = 'gg'
  let n = '1'
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--suffix') {
      suffix = argv[i + 1] ?? ''
      i += 1
    } else if (/^\d+$/.test(arg)) {
      n = arg
    } else {
      throw new Error(`Unexpected argument: ${arg}`)
    }
  }
  if (!/^[0-9A-Za-z-]+$/.test(suffix)) {
    throw new Error(`Suffix must be a semver prerelease identifier, got "${suffix}"`)
  }
  return { suffix, n }
}

/** The artifacts a build leaves in dist/, mapped to their versioned names. */
function collectArtifacts(version) {
  if (!existsSync(distDir)) {
    return []
  }
  return readdirSync(distDir)
    .filter(
      (name) =>
        name.endsWith('.AppImage') || name.includes(`_${version}_`) || name.includes(`-${version}.`)
    )
    .filter((name) => name.endsWith('.AppImage') || name.endsWith('.deb') || name.endsWith('.rpm'))
    .map((name) => ({
      from: resolve(distDir, name),
      to: resolve(
        forkDir,
        name.endsWith('.AppImage') ? name.replace(/\.AppImage$/, `-${version}.AppImage`) : name
      )
    }))
}

const { suffix, n } = parseArgs(process.argv.slice(2))
const baseVersion = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')).version
const version = `${baseVersion}-${suffix}.${n}`

const alreadyBuilt = existsSync(forkDir)
  ? readdirSync(forkDir).filter(
      (name) => name.includes(`-${version}.`) || name.includes(`_${version}_`)
    )
  : []
if (alreadyBuilt.length > 0) {
  console.error(
    `[fork-build] ${version} already exists in dist/fork (${alreadyBuilt.join(', ')}); pass a higher n.`
  )
  process.exit(2)
}

console.log(`[fork-build] version ${version} (base ${baseVersion}), updater disabled`)
const result = spawnSync('pnpm', ['run', 'build:linux'], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    ORCA_LOCAL_BUILD_VERSION: version,
    ORCA_UPDATES_DISABLED: '1'
  }
})

const artifacts = collectArtifacts(version)
const hasDeb = artifacts.some((a) => a.from.endsWith('.deb'))
const hasAppImage = artifacts.some((a) => a.from.endsWith('.AppImage'))
if (result.status !== 0 && !(hasDeb && hasAppImage)) {
  console.error('[fork-build] build failed before the .deb and AppImage were produced')
  process.exit(result.status ?? 1)
}
if (result.status !== 0) {
  // Why: the RPM target runs last and needs rpmbuild; without it the useful artifacts already exist.
  console.warn(
    '[fork-build] electron-builder exited non-zero after the .deb and AppImage were built (usually the RPM step); keeping them'
  )
}

mkdirSync(forkDir, { recursive: true })
for (const { from, to } of artifacts) {
  renameSync(from, to)
  console.log(`[fork-build] ${to}`)
}
console.log(`[fork-build] done: run dist/fork/orca-linux-${version}.AppImage, or install the .deb`)
