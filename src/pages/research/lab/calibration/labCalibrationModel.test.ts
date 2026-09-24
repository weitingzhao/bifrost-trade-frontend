import { describe, expect, it } from 'vitest'
import {
  countNote,
  DOC_TALLY,
  FIXES,
  LAYERS,
  ROWS,
  rowTally,
  STATE_ORDER,
  talliesDisagree,
} from './labCalibrationModel'

describe('the transcription', () => {
  it('carries the document round whole: 28 rows across the five layers', () => {
    expect(ROWS).toHaveLength(28)
    const byLayer = Object.fromEntries(
      LAYERS.map(([key]) => [key, ROWS.filter((r) => r.layer === key).length])
    )
    expect(byLayer).toEqual({ F: 5, R: 6, A: 8, C: 5, U: 4 })
    // every row's layer letter is its own id's third character
    expect(ROWS.every((r) => r.id[2] === r.layer)).toBe(true)
    // ids are unique — the stable anchor cannot repeat
    expect(new Set(ROWS.map((r) => r.id)).size).toBe(28)
  })

  it('every smallest-change entry names contracts that exist in the rows', () => {
    const known = new Set(ROWS.map((r) => r.id))
    for (const f of FIXES) {
      const ids = f.ids.split('/').map((s) => s.trim())
      expect(ids.length).toBeGreaterThan(0)
      for (const id of ids) expect(known.has(id)).toBe(true)
    }
    expect(FIXES).toHaveLength(8)
  })

  it('the document disagrees with its own rows — the panel exists because of it', () => {
    const row = rowTally(ROWS)
    expect(row).toEqual({ ok: 16, warn: 5, fail: 5, ramp: 2 })
    // The doc's roll-up says 27; the rows say 28. If a future round
    // reconciles them, talliesDisagree goes false and the panel must not draw.
    expect(talliesDisagree(DOC_TALLY, row)).toBe(true)
    const note = countNote(DOC_TALLY, row)
    expect(note).toContain('= 27')
    expect(note).toContain('= 28')
  })

  it('states stay on the four-lamp vocabulary', () => {
    expect(STATE_ORDER).toEqual(['ok', 'warn', 'fail', 'ramp'])
    expect(ROWS.every((r) => STATE_ORDER.includes(r.state))).toBe(true)
  })
})
