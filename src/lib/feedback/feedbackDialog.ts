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

const store = createExternalStore<{ open: boolean; kind: FeedbackKind }>({
  open: false,
  kind: 'bug',
})

export function openFeedbackDialog(kind: FeedbackKind = 'bug'): void {
  store.setState({ open: true, kind })
}

export function closeFeedbackDialog(): void {
  store.setState((prev) => ({ ...prev, open: false }))
}

export function useFeedbackDialog(): { open: boolean; kind: FeedbackKind } {
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
