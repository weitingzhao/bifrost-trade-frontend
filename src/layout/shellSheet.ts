/**
 * The shell's own sheets, opened from code that is not React (the touch
 * layer's order confirm and row detail): one at a time, drawn by
 * `ShellSheetHost` with `BottomSheet`.
 */
import { useSyncExternalStore, type ReactNode } from 'react'
import type { BottomSheetAction } from '@/components/ui/BottomSheet'

export interface ShellSheet {
  title?: ReactNode
  label?: string
  meta?: ReactNode
  material?: 'view' | 'edit'
  detent?: 'half' | 'full'
  body: ReactNode
  actions?: readonly BottomSheetAction[]
}

let current: ShellSheet | null = null
let open = false
const listeners = new Set<() => void>()
const emit = () => {
  for (const l of listeners) l()
}

export function openShellSheet(sheet: ShellSheet): void {
  current = sheet
  open = true
  emit()
}

export function closeShellSheet(): void {
  if (!open) return
  open = false
  emit()
}

interface Snapshot {
  sheet: ShellSheet | null
  open: boolean
}

let snap: Snapshot = { sheet: null, open: false }
function readSheet(): Snapshot {
  if (snap.sheet !== current || snap.open !== open) snap = { sheet: current, open }
  return snap
}

export function useShellSheet(): Snapshot {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    readSheet,
    readSheet,
  )
}
