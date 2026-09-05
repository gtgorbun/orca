import { afterEach, describe, expect, it } from 'vitest'
import { isUpdaterDisabledByBuild } from './updater-build-opt-out'

const realm = globalThis as { ORCA_UPDATES_DISABLED?: boolean }

describe('isUpdaterDisabledByBuild', () => {
  afterEach(() => {
    delete realm.ORCA_UPDATES_DISABLED
  })

  it('reads as enabled when the build substituted nothing', () => {
    expect(isUpdaterDisabledByBuild()).toBe(false)
  })

  it('reads as enabled for the official literal false', () => {
    realm.ORCA_UPDATES_DISABLED = false
    expect(isUpdaterDisabledByBuild()).toBe(false)
  })

  it('reads as disabled only for the literal true', () => {
    realm.ORCA_UPDATES_DISABLED = true
    expect(isUpdaterDisabledByBuild()).toBe(true)
  })
})
