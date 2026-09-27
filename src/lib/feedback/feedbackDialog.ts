/**
 * The Send-feedback dialog's switch and the shell-collected context
 * (design Rev .96/.97: the context is the shell's job, never the writer's).
 *
 * Collected today: page, app design rev, theme, window, the carried symbol
 * and the objective scope. Named owed with the design's own words: the last
 * 10 operations trail and the recent front-end errors need a collector the
 * shell does not keep yet, and the screenshot ("Include this page") needs a
 * renderer — a new dependency, which is the Owner's call.
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'
import type { FeedbackKind } from '@/api/research/feedback'

/** What the wrong-number pick captured (design Rev .96's cell card). */
export interface PickedCell {
  value: string
  column: string
  row: string
  panel: string
}

interface FeedbackDialogState {
  open: boolean
  kind: FeedbackKind
  /** Seeded once on the next open (a ViewState failure reporting itself). */
  prefill: { title?: string; body?: string } | null
  /** The cell-picking mode: dialog closed, page under a crosshair. */
  picking: boolean
  cell: PickedCell | null
}

const store = createExternalStore<FeedbackDialogState>({
  open: false,
  kind: 'bug',
  prefill: null,
  picking: false,
  cell: null,
})

export function openFeedbackDialog(
  kind: FeedbackKind = 'bug',
  prefill?: { title?: string; body?: string },
): void {
  store.setState((prev) => ({ ...prev, open: true, picking: false, kind, prefill: prefill ?? null }))
}

export function closeFeedbackDialog(): void {
  store.setState((prev) => ({ ...prev, open: false }))
}

/** Rev .96: point at the number — the dialog steps aside, the page takes a crosshair. */
export function startCellPick(): void {
  store.setState((prev) => ({ ...prev, open: false, picking: true }))
}

export function finishCellPick(cell: PickedCell | null): void {
  // Null = cancelled (esc, or a click that hit nothing readable).
  store.setState((prev) => ({
    ...prev,
    picking: false,
    open: true,
    kind: 'data',
    cell: cell ?? prev.cell,
  }))
}

export function clearPickedCell(): void {
  store.setState((prev) => ({ ...prev, cell: null }))
}

export function useFeedbackDialog(): FeedbackDialogState {
  return store.useStore()
}

export function collectFeedbackContext(input: {
  pathname: string
  pageLabel: string
  designRev: string
  theme: string
  symbol: string | null
  objective: string | null
}): Record<string, unknown> {
  return {
    page: input.pageLabel,
    route: input.pathname,
    rev: input.designRev,
    theme: input.theme,
    window:
      typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : 'unknown',
    symbol: input.symbol ?? '',
    objective: input.objective ?? '',
    // Owed (design .96): sources · errors · the last-10-ops trail — no shell
    // collector keeps these yet; absent, not empty.
  }
}
