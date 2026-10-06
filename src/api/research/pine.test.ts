import { describe, expect, it } from 'vitest'
import { PINE_BUILTINS, PINE_SCRIPT_ID, pineLibraryEntries, type PineScriptRow } from './pine'

const row = (id: string, over: Partial<PineScriptRow> = {}): PineScriptRow => ({
  id,
  name: `Bifrost · ${id}`,
  version: 1,
  origin: 'bifrost',
  license: null,
  source_url: null,
  notes: null,
  is_active: true,
  signals: ['buy', 'sell'],
  ...over,
})

describe('pineLibraryEntries', () => {
  it('stands in the built-ins until the library answers', () => {
    expect(pineLibraryEntries(undefined).map((e) => e.id)).toEqual(PINE_BUILTINS.map((b) => b.id))
  })

  it('keeps the built-ins in their order and short labels, then pasted scripts under their names', () => {
    const rows = [
      row('my_cross', { origin: 'user', name: 'EMA 20/50 cross' }),
      row('wavetrend'),
      row('supertrend'),
      row('lux_ob', { origin: 'community', name: '  ' }),
    ]
    expect(pineLibraryEntries(rows)).toEqual([
      { id: 'supertrend', label: 'Supertrend', origin: 'bifrost' },
      { id: 'wavetrend', label: 'WaveTrend', origin: 'bifrost' },
      { id: 'my_cross', label: 'EMA 20/50 cross', origin: 'user' },
      { id: 'lux_ob', label: 'lux_ob', origin: 'community' },
    ])
  })

  it('leaves out a script the Owner switched off', () => {
    const rows = [row('supertrend', { is_active: false }), row('my_cross', { origin: 'user', is_active: false }), row('adx_trend')]
    expect(pineLibraryEntries(rows).map((e) => e.id)).toEqual(['adx_trend'])
  })
})

describe('PINE_SCRIPT_ID', () => {
  it("follows Research's id rule", () => {
    expect(PINE_SCRIPT_ID.test('supertrend')).toBe(true)
    expect(PINE_SCRIPT_ID.test('ema_20_50')).toBe(true)
    expect(PINE_SCRIPT_ID.test('a')).toBe(false)
    expect(PINE_SCRIPT_ID.test('2fast')).toBe(false)
    expect(PINE_SCRIPT_ID.test('Bad-Id')).toBe(false)
    expect(PINE_SCRIPT_ID.test(`a${'b'.repeat(48)}`)).toBe(false)
  })
})
