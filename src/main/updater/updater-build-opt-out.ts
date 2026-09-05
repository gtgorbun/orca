/**
 * Whether this build was compiled with the in-app updater switched off.
 *
 * Why a compile-time constant and not a setting: the builds that need this are
 * the ones no release feed will ever serve (a fork, a one-off local package).
 * Left on, the updater polls upstream's feed and offers to replace the build
 * with an upstream release, which is exactly the wrong thing for such a build.
 */
export function isUpdaterDisabledByBuild(): boolean {
  // Why the typeof guard: the constant is substituted by electron-vite's `define`;
  // plain-Node entry points and tests have no substitution and must read as enabled.
  return typeof ORCA_UPDATES_DISABLED !== 'undefined' && ORCA_UPDATES_DISABLED === true
}
