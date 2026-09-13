import { describe, expect, it } from 'vitest'
import {
  INSPECTOR_DOCK_MIN_CONTENT_PX,
  INSPECTOR_WIDTH_DEFAULT_PX,
  inspectorDocksAt,
} from './inspectorDock'

describe('inspectorDocksAt', () => {
  it('reproduces the spec threshold at the default width', () => {
    // Shell Spec §5b says dock at 1400. That number is 560 + 840, so the rule
    // derives it rather than storing it — and stays right for other widths.
    expect(INSPECTOR_WIDTH_DEFAULT_PX + INSPECTOR_DOCK_MIN_CONTENT_PX).toBe(1400)
    expect(inspectorDocksAt(INSPECTOR_WIDTH_DEFAULT_PX, 1400)).toBe(true)
    expect(inspectorDocksAt(INSPECTOR_WIDTH_DEFAULT_PX, 1399)).toBe(false)
  })

  it('floats a wide panel that a wide screen still cannot spare the room for', () => {
    // Instance compare mode. 1360 docked on a 1920 screen would leave 560 for
    // the table it is comparing against.
    expect(inspectorDocksAt(1360, 1920)).toBe(false)
    expect(inspectorDocksAt(1360, 2200)).toBe(true)
  })
})
