import { describe, expect, it } from 'vitest'
import { CONTENT_FLOOR_PX, SIDE_PANEL_FLOOR_PX, panelDocks } from './panelDocks'
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
  it('derives every threshold from sidebar + floor + panel, storing none', () => {
    // 240 + 560 + 456 = 1256 · 240 + 760 + 560 = 1560. The numbers in the
    // design’s table are consequences, not constants. The side panel counts
    // its 8px insets: the card is 440 and the column it takes is 456. Its
    // floor is 560 since Rev .25; the inspector keeps 760.
    expect(240 + SIDE_PANEL_FLOOR_PX + PANEL_CARD_PX).toBe(1256)
    expect(240 + CONTENT_FLOOR_PX + INSPECTOR_WIDTH_READ_PX).toBe(1560)
  })

  it('flips exactly at the boundaries', () => {
    expect(sidePanelPushes(true, 1255)).toBe(false)
    expect(sidePanelPushes(true, 1256)).toBe(true)
    expect(panelDocks(INSPECTOR_WIDTH_READ_PX, 1559)).toBe(false)
    expect(panelDocks(INSPECTOR_WIDTH_READ_PX, 1560)).toBe(true)
  })

  it('counts the sidebar expanded even while it is collapsed to the icon rail', () => {
    // The formula takes no sidebar state on purpose: a collapsed rail at 1200
    // leaves arithmetic room for a pushed panel, but expanding the rail is
    // the reader’s toggle, so the push must survive it — it overlays instead.
    expect(sidePanelPushes(true, 1200)).toBe(false)
  })
})

describe('the docking table (Design 09-14 ③, side panel floor from Rev .25)', () => {
  it('≥1560 — panel push · Inspector push · both open: panel push, Inspector overlay', () => {
    for (const vp of [1560, 1920]) {
      expect(sidePanelPushes(true, vp)).toBe(true)
      expect(inspectorDocked(vp)).toBe(true)
      expect(inspectorDocked(vp, { panelOpen: true })).toBe(false)
    }
  })

  it('1256–1559 — panel push · Inspector overlay · both open: panel push, Inspector overlay', () => {
    for (const vp of [1256, 1440, 1559]) {
      expect(sidePanelPushes(true, vp)).toBe(true)
      expect(inspectorDocked(vp)).toBe(false)
      expect(inspectorDocked(vp, { panelOpen: true })).toBe(false)
    }
  })

  it('<1256 — everything overlays', () => {
    for (const vp of [1255, 1024]) {
      expect(sidePanelPushes(true, vp)).toBe(false)
      expect(inspectorDocked(vp)).toBe(false)
      expect(inspectorDocked(vp, { panelOpen: true })).toBe(false)
    }
  })

  it('wide tiers never dock, whatever the glass measures', () => {
    // The Copilot’s own wide tier (760) retired with the dock: size belongs
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
    expect(inspectorOverlayInsetRightPx(true, 1256)).toBe(PANEL_CARD_PX)
    expect(inspectorOverlayInsetRightPx(true, 1255)).toBe(0)
    expect(inspectorOverlayInsetRightPx(false, 2560)).toBe(0)
  })
})
