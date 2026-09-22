import { describe, expect, it } from 'vitest'
import { CONTENT_FLOOR_PX, panelDocks } from './panelDocks'
import { PANEL_CARD_PX } from '@/layout/equipSurface'
import {
  INSPECTOR_WIDTH_READ_PX,
  INSPECTOR_WIDTH_WIDE_PX,
  inspectorDocksAt,
  inspectorOverlayInsetRightPx,
  sidePanelPushes,
} from '@/components/layout/inspectorDock'

/** The shell's composition, as `RightInspectorShell` computes `docked`. */
function inspectorDocked(
  viewport: number,
  { panelOpen = false, width = INSPECTOR_WIDTH_READ_PX } = {},
) {
  return !sidePanelPushes(panelOpen, viewport) && inspectorDocksAt(width, viewport)
}

describe('panelDocks', () => {
  it('derives both columns’ thresholds from sidebar + floor + panel, storing neither', () => {
    // 240 + 760 + 456 = 1456 · 240 + 760 + 560 = 1560. The numbers in the
    // design’s table are consequences, not constants. The side panel counts
    // its 8px insets: the card is 440 and the column it takes is 456.
    expect(240 + CONTENT_FLOOR_PX + PANEL_CARD_PX).toBe(1456)
    expect(240 + CONTENT_FLOOR_PX + INSPECTOR_WIDTH_READ_PX).toBe(1560)
  })

  it('flips exactly at the boundaries', () => {
    expect(panelDocks(PANEL_CARD_PX, 1455)).toBe(false)
    expect(panelDocks(PANEL_CARD_PX, 1456)).toBe(true)
    expect(panelDocks(INSPECTOR_WIDTH_READ_PX, 1559)).toBe(false)
    expect(panelDocks(INSPECTOR_WIDTH_READ_PX, 1560)).toBe(true)
  })

  it('counts the sidebar expanded even while it is collapsed to the icon rail', () => {
    // The formula takes no sidebar state on purpose: a collapsed rail at 1400
    // leaves arithmetic room for a docked panel, but expanding the rail is
    // the reader’s toggle, so the dock must survive it — it overlays instead.
    expect(panelDocks(PANEL_CARD_PX, 1400)).toBe(false)
  })
})

describe('the docking table (Design 09-14 ③)', () => {
  it('≥1560 — panel push · Inspector push · both open: panel push, Inspector overlay', () => {
    for (const vp of [1560, 1920]) {
      expect(sidePanelPushes(true, vp)).toBe(true)
      expect(inspectorDocked(vp)).toBe(true)
      expect(inspectorDocked(vp, { panelOpen: true })).toBe(false)
    }
  })

  it('1456–1559 — panel push · Inspector overlay · both open: panel push, Inspector overlay', () => {
    for (const vp of [1456, 1559]) {
      expect(sidePanelPushes(true, vp)).toBe(true)
      expect(inspectorDocked(vp)).toBe(false)
      expect(inspectorDocked(vp, { panelOpen: true })).toBe(false)
    }
  })

  it('<1456 — everything overlays', () => {
    for (const vp of [1455, 1280]) {
      expect(sidePanelPushes(true, vp)).toBe(false)
      expect(inspectorDocked(vp)).toBe(false)
      expect(inspectorDocked(vp, { panelOpen: true })).toBe(false)
    }
  })

  it('wide tiers never dock, whatever the glass measures', () => {
    // The Copilot's own wide tier (760) retired with the dock: size belongs
    // to the float now, and a float you drag remembers more than two tiers.
    expect(inspectorDocksAt(INSPECTOR_WIDTH_WIDE_PX, 2560)).toBe(false)
    // Instance compare mode (1360) — used to dock at 2200; it is the work, it floats.
    expect(inspectorDocksAt(1360, 2560)).toBe(false)
  })

  it('a closed panel never pushes', () => {
    expect(sidePanelPushes(false, 1920)).toBe(false)
  })

  it('the floating inspector yields the panel column when it pushes, else sits flush right', () => {
    expect(inspectorOverlayInsetRightPx(true, 1560)).toBe(PANEL_CARD_PX)
    expect(inspectorOverlayInsetRightPx(true, 1455)).toBe(0)
    expect(inspectorOverlayInsetRightPx(false, 2560)).toBe(0)
  })
})
