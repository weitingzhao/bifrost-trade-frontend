/**
 * Where the Symbol list stands (design `_Shell TopBar.dc.html`, Rev .57–.58).
 *
 * Docked and strip are a column at the right edge that the page gives width
 * to — a sibling of the content, after the side panel's spacer, so the order
 * from the edge inward is list · panel · page, and the panel card sits at
 * `right = column + 8`. Float is a card over the page, top right, and leaves
 * the edge empty. Hidden (the toolbar's Lists button) draws nothing.
 *
 * The column runs the full height, where the design starts it under the top
 * bar: the design narrows the whole body, header included, so its column
 * has an empty notch above it. Here the header lives inside the content
 * column, and a full-height list with its head on the top bar's line is the
 * same geometry without the notch.
 */
import { useSurfaces } from '../equipSurface'
import { SHELL_TOP_BAR_PX } from '../shellChrome'
import { DOCK_FULL_PX, useDockColumn, useDockState } from './dockState'
import { SymbolDock } from './SymbolDock'

export function SymbolDockHost() {
  const { mode, hidden } = useDockState()
  const column = useDockColumn()
  const panelOpen = useSurfaces().panel != null
  if (hidden) return null
  if (mode === 'float') {
    return (
      <div
        className="fixed"
        style={{
          top: SHELL_TOP_BAR_PX + 8,
          right: 12,
          width: DOCK_FULL_PX,
          height: `min(520px, calc(100svh - ${SHELL_TOP_BAR_PX + 40}px))`,
          zIndex: 57,
        }}
      >
        <SymbolDock mode="float" />
      </div>
    )
  }
  return (
    <div className="h-svh flex-none" style={{ width: column.width, transition: 'width .22s ease' }}>
      <SymbolDock
        mode={column.mode ?? 'strip'}
        narrowedBy={mode === 'docked' && column.mode === 'strip' ? (panelOpen ? 'panel' : 'room') : null}
      />
    </div>
  )
}
