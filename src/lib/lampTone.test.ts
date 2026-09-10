import { describe, it, expect } from 'vitest'
import {
  lampDotClass,
  lampFillClass,
  lampGlowClass,
  lampTextClass,
  lampTone,
} from './lampTone'

describe('lampTone — no reading is grey, never red', () => {
  it('collapses every "no reading" spelling to grey', () => {
    // `none` is what computeIbBrokerGroupLamp returns while the daemon is down,
    // which under D10 is the correct posture. It was painted red.
    for (const v of ['none', 'unknown', 'gray', 'grey', '', null, undefined, 'wat']) {
      expect(lampTone(v)).toBe('gray')
    }
  })

  it('never lets an unrecognised value read as a fault', () => {
    expect(lampTextClass('none')).not.toBe(lampTextClass('red'))
    expect(lampTextClass('nonsense')).toBe(lampTextClass('gray'))
  })

  it('passes the three live states through', () => {
    expect(lampTone('green')).toBe('green')
    expect(lampTone('yellow')).toBe('yellow')
    expect(lampTone('red')).toBe('red')
  })

  it('is case-insensitive', () => {
    expect(lampTone('GREEN')).toBe('green')
    expect(lampTone('Red')).toBe('red')
  })
})

describe('one class family per property', () => {
  it('uses the lamp family, not the semantic or raw palette families', () => {
    for (const v of ['green', 'yellow', 'red', 'gray']) {
      expect(lampTextClass(v)).toBe(`text-lamp-${v}`)
      expect(lampFillClass(v)).toBe(`bg-lamp-${v}`)
    }
  })

  it('never emits a raw Tailwind palette class', () => {
    const all = ['green', 'yellow', 'red', 'none']
      .flatMap((v) => [lampTextClass(v), lampFillClass(v), lampDotClass(v)])
      .join(' ')
    expect(all).not.toMatch(/(text|bg)-(green|red|yellow|amber|orange)-\d{3}/)
  })

  it('never emits the semantic family, which is a different value in dark mode', () => {
    const all = ['green', 'yellow', 'red', 'none']
      .flatMap((v) => [lampTextClass(v), lampFillClass(v)])
      .join(' ')
    expect(all).not.toMatch(/(text|bg)-(success|danger|warning|destructive)\b/)
  })
})

describe('glow', () => {
  it('lights the three live states from the lamp tokens', () => {
    expect(lampGlowClass('green')).toContain('--color-lamp-green')
    expect(lampGlowClass('yellow')).toContain('--color-lamp-yellow')
    expect(lampGlowClass('red')).toContain('--color-lamp-red')
  })

  it('gives a grey lamp none — it has nothing to broadcast', () => {
    expect(lampGlowClass('none')).toBe('')
    expect(lampDotClass('none')).toBe('bg-lamp-gray')
  })

  it('combines fill and glow for a live dot', () => {
    expect(lampDotClass('green')).toBe(
      'bg-lamp-green shadow-[0_0_5px_1px_var(--color-lamp-green)]',
    )
  })
})
