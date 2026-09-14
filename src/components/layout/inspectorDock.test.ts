import { describe, expect, it } from 'vitest'
import { INSPECTOR_WIDTH_READ_PX, INSPECTOR_WIDTH_WIDE_PX, inspectorDocksAt } from './inspectorDock'

describe('inspectorDocksAt', () => {
  it('docks the reading width by the shared formula: sidebar 240 + floor 760 + panel', () => {
    // Design 09-14 ③. The old spec line this file reproduced (560 + 840 = 1400)
    // is retired with the per-panel thresholds it justified.
    expect(inspectorDocksAt(INSPECTOR_WIDTH_READ_PX, 1560)).toBe(true)
    expect(inspectorDocksAt(INSPECTOR_WIDTH_READ_PX, 1559)).toBe(false)
  })

  it('floats every panel wider than the reading width', () => {
    // Wide, instance compare, and the run inspector’s M/L are the panel as the
    // work; they overlay on any screen rather than dock beside a sliver.
    expect(inspectorDocksAt(INSPECTOR_WIDTH_WIDE_PX, 3840)).toBe(false)
    expect(inspectorDocksAt(1360, 2560)).toBe(false)
    expect(inspectorDocksAt(880, 2560)).toBe(false)
  })

  it('docks a narrower override sooner — the formula, not a stored threshold', () => {
    expect(inspectorDocksAt(400, 1400)).toBe(true)
    expect(inspectorDocksAt(400, 1399)).toBe(false)
  })
})
