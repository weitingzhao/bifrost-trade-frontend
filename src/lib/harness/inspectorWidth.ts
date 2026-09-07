/**
 * How wide the run inspector opens, remembered per browser.
 *
 * The drawer was pinned at 560px. A judge's reasoning is a paragraph, and four
 * of them per judge per candidate in a 560px column is a very tall, very narrow
 * read — the panel decided how much of the page you could use, and it decided
 * wrong for this content. The width is the reader's call, and it should still
 * be their call next time they open it.
 *
 * The shell clamps to 96vw, so a wide choice on a narrow screen degrades to the
 * screen rather than overflowing it.
 */
import { createPersistedStore } from '@/lib/cockpit/externalStore'

export type InspectorWidth = 'sm' | 'md' | 'lg'

export const INSPECTOR_WIDTH_PX: Record<InspectorWidth, number> = {
  sm: 560,
  md: 880,
  lg: 1360,
}

export const INSPECTOR_WIDTH_OPTIONS: { value: InspectorWidth; label: string; title: string }[] = [
  { value: 'sm', label: 'S', title: 'Narrow — 560px, leaves the table readable behind it' },
  { value: 'md', label: 'M', title: 'Medium — 880px, fits a judge’s paragraph on two lines' },
  { value: 'lg', label: 'L', title: 'Wide — 1360px, the whole verdict table without wrapping' },
]

function valid(v: unknown): InspectorWidth {
  return v === 'sm' || v === 'md' || v === 'lg' ? v : 'md'
}

const store = createPersistedStore<{ width: InspectorWidth }>(
  'harness_inspector_width',
  { width: 'md' },
  (s) => ({ width: s.width }),
)

export const inspectorWidthStore = {
  getState: store.getState,
  subscribe: store.subscribe,
  set(width: InspectorWidth) {
    store.setState({ width: valid(width) })
  },
}

export function useInspectorWidth(): [InspectorWidth, (w: InspectorWidth) => void] {
  const { width } = store.useStore()
  return [valid(width), inspectorWidthStore.set]
}

/** Pixels for the shell's `panelWidthPx`. */
export function inspectorWidthPx(width: InspectorWidth): number {
  return INSPECTOR_WIDTH_PX[valid(width)]
}
