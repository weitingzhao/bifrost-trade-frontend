/**
 * The sentence that stops a six-week-old grade reading as today's.
 */
import { describe, expect, it } from 'vitest'
import { momentumWindow } from './momentumWindow'

const row = (symbol: string, trade_date: string) => ({ symbol, trade_date })

describe('momentumWindow', () => {
  it('says how much of the grid is the newest session, and how much is not', () => {
    // DEV 2026-09-22: 100 rows over twelve weeks, 13 of them from the newest
    // day. The grid showed no date at all.
    const rows = [
      row('AMD', '2026-09-21'),
      row('TWST', '2026-09-21'),
      row('PLTR', '2026-08-04'),
      row('PLTR', '2026-08-07'),
      row('MRNA', '2026-07-02'),
    ]
    expect(momentumWindow(rows)).toBe(
      "Top 5 scores across the radar's history — 02JUL26 to 21SEP26, 2 from the newest session · 1 name appears more than once, on different days. Each card carries the session it was scored on.",
    )
  })

  it('says so plainly when every row really is one day', () => {
    const s = momentumWindow([row('AMD', '2026-09-21'), row('TWST', '2026-09-21')])
    expect(s).toContain('all from 21SEP26')
    expect(s).not.toContain('more than once')
  })

  it('does not claim a window over an empty grid', () => {
    expect(momentumWindow([])).toBe('no scores in view')
  })
})
