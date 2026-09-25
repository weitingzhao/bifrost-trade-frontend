import { describe, expect, it } from 'vitest'
import { menubarSession } from './marketSession'

// 2026-09-24 is a Thursday; New York is on EDT (UTC−4) then.
const ny = (iso: string) => new Date(`${iso}-04:00`)

describe('the menu bar session', () => {
  it('counts down to the open, the close and the end of after-hours', () => {
    expect(menubarSession(ny('2026-09-24T03:30:00'))).toMatchObject({ phase: 'CLOSED', left: '6h00' })
    expect(menubarSession(ny('2026-09-24T08:48:00'))).toMatchObject({ phase: 'PRE', left: '42m' })
    expect(menubarSession(ny('2026-09-24T10:00:00'))).toMatchObject({ phase: 'RTH', left: '6h00', closing: false })
    expect(menubarSession(ny('2026-09-24T15:40:00'))).toMatchObject({ phase: 'RTH', left: '20m', closing: true })
    expect(menubarSession(ny('2026-09-24T17:00:00'))).toMatchObject({ phase: 'POST', left: '3h00' })
  })

  it('carries a Friday evening over the weekend to Monday', () => {
    // Fri 2026-09-25 21:00 → Mon 09:30 = 2 days 12h30.
    expect(menubarSession(ny('2026-09-25T21:00:00'))).toMatchObject({ phase: 'CLOSED', left: '2d12h' })
    expect(menubarSession(ny('2026-09-26T12:00:00')).phase).toBe('CLOSED')
  })

  it('reads the clock in New York', () => {
    expect(menubarSession(ny('2026-09-24T10:05:09')).clock).toBe('10:05:09')
  })
})
