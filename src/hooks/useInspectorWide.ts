/**
 * The inspector's two widths.
 *
 * Design §5b: 560 to read, 1040 when the panel is the work — a compare, a
 * judge's paragraph. One reader preference rather than one per panel: the
 * choice is about this screen and these eyes, not about which entity is open.
 *
 * A caller that knows better still wins — `RightInspectorShell`'s
 * `panelWidthPx` overrides this, which is how the run inspector keeps its own
 * S/M/L and instance compare mode keeps its measured width.
 */
import { createPersistedStore } from '@/lib/cockpit/externalStore'

const store = createPersistedStore<{ wide: boolean }>(
  'bifrost.inspector.wide',
  { wide: false },
  (s) => ({ wide: s.wide }),
)

export const inspectorWideStore = {
  getState: store.getState,
  subscribe: store.subscribe,
  set: (wide: boolean) => store.setState({ wide }),
  toggle: () => store.setState({ wide: !store.getState().wide }),
}

export function useInspectorWide(): { wide: boolean; toggle: () => void } {
  const { wide } = store.useStore()
  return { wide: Boolean(wide), toggle: inspectorWideStore.toggle }
}
