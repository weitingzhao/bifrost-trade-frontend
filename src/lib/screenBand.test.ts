import { describe, expect, it } from 'vitest'
import {
  SCREEN_DELTA_BAND,
  encodeScreenBand,
  legInScreenBand,
  parseScreenBand,
  screenBandLabel,
} from './screenBand'

const BAND = {
  dteMin: 14,
  dteMax: 45,
  deltaMin: SCREEN_DELTA_BAND[0],
  deltaMax: SCREEN_DELTA_BAND[1],
}

describe('screenBand', () => {
  it('round-trips the screen side encoding through the chain side parser', () => {
    expect(parseScreenBand(encodeScreenBand(BAND))).toEqual(BAND)
    // A moved slider travels too.
    expect(parseScreenBand(encodeScreenBand({ ...BAND, dteMin: 21, dteMax: 60 }))).toEqual({
      ...BAND,
      dteMin: 21,
      dteMax: 60,
    })
  })

  it('refuses garbage rather than inventing a band', () => {
    expect(parseScreenBand(null)).toBeNull()
    expect(parseScreenBand('')).toBeNull()
    expect(parseScreenBand('14-45')).toBeNull()
    expect(parseScreenBand('45-14:0.15-0.35')).toBeNull()
    expect(parseScreenBand('14-45:0.35-0.15')).toBeNull()
    expect(parseScreenBand('a-b:c-d')).toBeNull()
  })

  it("prints the design's own chip text", () => {
    expect(screenBandLabel(BAND)).toBe('14–45d · Δ .15–.35')
  })

  it('keeps a leg only when DTE and |Δ| are inside and it is not ITM', () => {
    expect(legInScreenBand(BAND, 30, -0.25, false)).toBe(true)
    expect(legInScreenBand(BAND, 30, 0.25, false)).toBe(true)
    // The design's three refusals.
    expect(legInScreenBand(BAND, 9, -0.25, false)).toBe(false)
    expect(legInScreenBand(BAND, 30, -0.4, false)).toBe(false)
    expect(legInScreenBand(BAND, 30, -0.25, true)).toBe(false)
    // A missing reading fails the band, not the other way round.
    expect(legInScreenBand(BAND, null, -0.25, false)).toBe(false)
    expect(legInScreenBand(BAND, 30, null, false)).toBe(false)
  })
})
