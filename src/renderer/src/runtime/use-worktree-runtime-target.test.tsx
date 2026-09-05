// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { useAppStore } = await vi.hoisted(async () => {
  // Why: hoisted code runs before static imports initialize, so zustand is loaded here.
  const { create } = await import('zustand')
  type State = { revision: number }
  // Why: a real zustand store, not a spy — the regression is zustand's Object.is snapshot
  // comparison looping on a selector that allocates, which a `selector(state)` stub cannot show.
  const useAppStore = create<State>()(() => ({ revision: 0 }))
  return { useAppStore }
})

vi.mock('@/store', () => ({ useAppStore }))

vi.mock('@/lib/worktree-runtime-owner', () => ({
  getExecutionHostIdForWorktree: (_state: unknown, worktreeId: string | null | undefined) =>
    worktreeId === 'runtime-repo::/srv/app' ? 'runtime:env-1' : 'local'
}))

import { useWorktreeRuntimeTarget } from './use-worktree-runtime-target'

describe('useWorktreeRuntimeTarget', () => {
  it('returns a referentially stable target across rerenders and unrelated store updates', () => {
    const view = renderHook(({ worktreeId }) => useWorktreeRuntimeTarget(worktreeId), {
      initialProps: { worktreeId: null as string | null }
    })
    const first = view.result.current
    expect(first).toEqual({ kind: 'local' })

    view.rerender({ worktreeId: null })
    expect(view.result.current).toBe(first)

    act(() => {
      useAppStore.setState({ revision: 1 })
    })
    expect(view.result.current).toBe(first)
  })

  it('re-derives the target only when the owning host changes', () => {
    const view = renderHook(({ worktreeId }) => useWorktreeRuntimeTarget(worktreeId), {
      initialProps: { worktreeId: null as string | null }
    })
    const local = view.result.current

    view.rerender({ worktreeId: 'runtime-repo::/srv/app' })
    expect(view.result.current).toEqual({ kind: 'environment', environmentId: 'env-1' })
    expect(view.result.current).not.toBe(local)
  })
})
