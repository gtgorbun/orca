#!/usr/bin/env node
/**
 * Build a Linux package of this fork with a suffixed version and the in-app
 * updater compiled out.
 *
 * Usage: node config/scripts/build-fork-linux.mjs [<n>] [--suffix <id>]
 *
 * The version is `<package.json version>-<suffix>.<n>` (default suffix `gg`,
 * default n `1`), stamped through ORCA_LOCAL_BUILD_VERSION so package.json stays
 * untouched and never conflicts with upstream's version bumps. The dash makes
 * the build report itself as a prerelease, and ORCA_UPDATES_DISABLED=1 keeps it
 * from polling upstream's feed. Artifacts land in dist/.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '../..')

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

const { suffix, n } = parseArgs(process.argv.slice(2))
const baseVersion = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')).version
const version = `${baseVersion}-${suffix}.${n}`

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
if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
console.log(`[fork-build] done: see dist/ for orca-ide_${version}_*.deb, .rpm and the AppImage`)
