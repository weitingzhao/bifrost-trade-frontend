import { describe, expect, it } from 'vitest'
import {
  datetimeLocalToEpochSeconds,
  epochSecondsToDatetimeLocal,
} from './executionFormTime'

/** Fabricated: 15 Jun 2024 14:30 local, seconds zero so datetime-local can round-trip. */
function localMinuteEpoch(): number {
  return Math.floor(new Date(2024, 5, 15, 14, 30, 0).getTime() / 1000)
}

describe('execution form time', () => {
  it('open then save without edits keeps the same epoch', () => {
    const epoch = localMinuteEpoch()
    const box = epochSecondsToDatetimeLocal(epoch)
    expect(datetimeLocalToEpochSeconds(box)).toBe(epoch)
  })

  it('does not fill the box from UTC ISO, which used to shift the saved time', () => {
    const epoch = localMinuteEpoch()
    const utcIsoFill = new Date(epoch * 1000).toISOString().slice(0, 16)
    const localFill = epochSecondsToDatetimeLocal(epoch)
    if (new Date(epoch * 1000).getTimezoneOffset() !== 0) {
      expect(utcIsoFill).not.toBe(localFill)
      expect(datetimeLocalToEpochSeconds(utcIsoFill)).not.toBe(epoch)
    }
    expect(datetimeLocalToEpochSeconds(localFill)).toBe(epoch)
  })
})
