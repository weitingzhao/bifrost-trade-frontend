import { describe, expect, it } from 'vitest'
import { isSignalEventKind } from './backtestEvent'

describe('isSignalEventKind', () => {
  it('names the kinds research enters the session after (event_defs.SIGNAL_KINDS)', () => {
    expect(['indicator_signal', 'pine_signal', 'sepa_hit', 'iv_percentile_threshold'].every((k) => isSignalEventKind(k as never))).toBe(true)
  })

  it('leaves dated events to their own session', () => {
    expect(isSignalEventKind('earnings')).toBe(false)
    expect(isSignalEventKind('opex')).toBe(false)
    expect(isSignalEventKind('schedule')).toBe(false)
  })
})
