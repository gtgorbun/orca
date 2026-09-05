import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { getExecutionHostIdForWorktree } from '@/lib/worktree-runtime-owner'
import { runtimeTargetForExecutionHostId, type RuntimeClientTarget } from './runtime-client-target'

/**
 * Runtime target that owns `worktreeId`, which is not always the globally
 * focused runtime — acting on the focused one scans the wrong host and reports
 * that workspace as having no ports. Direct-SSH owners return null.
 */
export function useWorktreeRuntimeTarget(
  worktreeId: string | null | undefined
): RuntimeClientTarget | null {
  // Why: the selector must return a stable value. runtimeTargetForExecutionHostId allocates
  // a new object per call, and zustand v5 compares snapshots with Object.is, so selecting
  // it directly re-renders forever (React #185 in every ports surface).
  const hostId = useAppStore((state) => getExecutionHostIdForWorktree(state, worktreeId))
  return useMemo(() => runtimeTargetForExecutionHostId(hostId), [hostId])
}
