import { describe, expect, it } from 'vitest'
import { CONTENT_FLOOR_PX, panelDocks } from './panelDocks'
import {
  COPILOT_DOCK_WIDTH,
  copilotDockPushes,
} from '@/hooks/useCopilotDock'
import {
  INSPECTOR_WIDTH_READ_PX,
  INSPECTOR_WIDTH_WIDE_PX,
  inspectorDocksAt,
  inspectorOverlayInsetRightPx,
} from '@/components/layout/inspectorDock'

const copilotOpen = { open: true, wide: false }
const copilotWide = { open: true, wide: true }

/** The shell's composition, as `RightInspectorShell` computes `docked`. */
function inspectorDocked(viewport: number, { copilotPushing = false, width = INSPECTOR_WIDTH_READ_PX } = {}) {
  const pushes = copilotPushing && copilotDockPushes(copilotOpen, viewport)
  return !pushes && inspectorDocksAt(width, viewport)
}

describe('panelDocks', () => {
  it('derives both panels’ thresholds from sidebar + floor + panel, storing neither', () => {
    // 240 + 760 + 440 = 1440 · 240 + 760 + 560 = 1560. The numbers in the
    // design’s table are consequences, not constants.
    expect(240 + CONTENT_FLOOR_PX + COPILOT_DOCK_WIDTH).toBe(1440)
    expect(240 + CONTENT_FLOOR_PX + INSPECTOR_WIDTH_READ_PX).toBe(1560)
  })

  it('flips exactly at the boundaries', () => {
    expect(panelDocks(COPILOT_DOCK_WIDTH, 1439)).toBe(false)
    expect(panelDocks(COPILOT_DOCK_WIDTH, 1440)).toBe(true)
    expect(panelDocks(INSPECTOR_WIDTH_READ_PX, 1559)).toBe(false)
    expect(panelDocks(INSPECTOR_WIDTH_READ_PX, 1560)).toBe(true)
  })

  it('counts the sidebar expanded even while it is collapsed to the icon rail', () => {
    // The formula takes no sidebar state on purpose: a collapsed rail at 1400
    // leaves arithmetic room for a docked 440 panel, but expanding the rail is
    // the reader’s toggle, so the dock must survive it — it overlays instead.
    expect(panelDocks(COPILOT_DOCK_WIDTH, 1400)).toBe(false)
  })
})

describe('the docking table (Design 09-14 ③)', () => {
  it('≥1560 — Copilot push · Inspector push · both open: Copilot push, Inspector overlay', () => {
    for (const vp of [1560, 1920]) {
      expect(copilotDockPushes(copilotOpen, vp)).toBe(true)
      expect(inspectorDocked(vp)).toBe(true)
      expect(inspectorDocked(vp, { copilotPushing: true })).toBe(false)
    }
  })

  it('1440–1559 — Copilot push · Inspector overlay · both open: Copilot push, Inspector overlay', () => {
    for (const vp of [1440, 1559]) {
      expect(copilotDockPushes(copilotOpen, vp)).toBe(true)
      expect(inspectorDocked(vp)).toBe(false)
      expect(inspectorDocked(vp, { copilotPushing: true })).toBe(false)
    }
  })

  it('<1440 — everything overlays', () => {
    for (const vp of [1439, 1280]) {
      expect(copilotDockPushes(copilotOpen, vp)).toBe(false)
      expect(inspectorDocked(vp)).toBe(false)
      expect(inspectorDocked(vp, { copilotPushing: true })).toBe(false)
    }
  })

  it('wide tiers never dock, whatever the glass measures', () => {
    expect(copilotDockPushes(copilotWide, 2560)).toBe(false)
    expect(inspectorDocksAt(INSPECTOR_WIDTH_WIDE_PX, 2560)).toBe(false)
    // Instance compare mode (1360) — used to dock at 2200; it is the work, it floats.
    expect(inspectorDocksAt(1360, 2560)).toBe(false)
  })

  it('a closed Copilot never pushes', () => {
    expect(copilotDockPushes({ open: false, wide: false }, 1920)).toBe(false)
  })

  it('the floating inspector yields 440px when Copilot pushes, else sits flush right', () => {
    expect(inspectorOverlayInsetRightPx(copilotOpen, 1560)).toBe(COPILOT_DOCK_WIDTH)
    expect(inspectorOverlayInsetRightPx(copilotOpen, 1439)).toBe(0)
    expect(inspectorOverlayInsetRightPx(copilotWide, 2560)).toBe(0)
  })
})
