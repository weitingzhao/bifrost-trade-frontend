import { describe, expect, it } from 'vitest'
import {
  GATE_FAMILIES,
  GATE_FIELDS,
  emptyGateForm,
  gateFormProblem,
  gateFormToPayload,
  gateToForm,
  getGateValue,
  isGateFormReady,
  parseGateNumber,
  setGateValue,
  withNextVersion,
} from './gateForm'
import { GATES_FIXTURE, gatesFixture } from './gateDefaults.fixture'
import type { GateSafetyFull } from '@/types/positions'

/** Made-up values, distinct per field so a crossed wire shows. */
function full(): GateSafetyFull {
  return {
    gate_safety_strategy_id: 7,
    name: 'Test set',
    version: 4,
    is_active: true,
    dim_direction: 'neutral',
    dim_structure: null,
    dim_coverage: 'single',
    dim_risk: null,
    dim_volatility: 'long_vol',
    dim_time: 'swing',
    gates: {
      strategy: {
        structure: { min_dte: 11, max_dte: 12, atm_band_pct: 0.13 },
        earnings: { blackout_days_before: 14, blackout_days_after: 15 },
        trading_hours_only: false,
      },
      state: {
        delta: { epsilon_band: 21, threshold_hedge_shares: 22, max_delta_limit: 23 },
        market: { vol_window_min: 24, stale_ts_threshold_ms: 25 },
        liquidity: { wide_spread_pct: 0.26, extreme_spread_pct: 0.27 },
        system: { data_lag_threshold_ms: 28 },
      },
      intent: {
        hedge: { min_hedge_shares: 31, cooldown_seconds: 32, max_hedge_shares_per_order: 33, min_price_move_pct: 0.34 },
      },
      guard: {
        risk: {
          max_daily_hedge_count: 41,
          max_position_shares: 42,
          max_daily_loss_usd: 43.5,
          max_net_delta_shares: 44,
          max_spread_pct: 0.45,
          paper_trade: false,
        },
      },
    },
    earnings_dates: ['2030-01-02', '2030-04-03'],
  }
}

describe('gateForm — full → form → payload', () => {
  it('keeps every field the set carries', () => {
    const d = full()
    const p = gateFormToPayload(gateToForm(d))
    expect(p).toEqual({
      name: d.name,
      version: d.version,
      dim_direction: 'neutral',
      dim_structure: null,
      dim_coverage: 'single',
      dim_risk: null,
      dim_volatility: 'long_vol',
      dim_time: 'swing',
      is_active: true,
      gates: d.gates,
      earnings_dates: d.earnings_dates,
    })
  })

  it('binds every params key the four families hold, in the sheet’s order', () => {
    expect(GATE_FAMILIES.map((f) => f.id)).toEqual(['strategy', 'state', 'intent', 'guard'])
    // 23: guard.risk.paper_trade is not editable — the daemon never reads it and forces
    // paper mode in code (TD-66); the stored key still round-trips untouched.
    expect(GATE_FIELDS).toHaveLength(23)
    expect(GATE_FIELDS.map((f) => f.path)).not.toContain('guard.risk.paper_trade')
    const d = full()
    for (const field of GATE_FIELDS) {
      expect(getGateValue(d.gates, field.path), field.path).not.toBeUndefined()
    }
  })

  it('sends back keys no form binds (the server’s object, not a flat copy)', () => {
    const d = full()
    ;(d.gates as Record<string, unknown>).future = { x: 1 }
    const p = gateFormToPayload(gateToForm(d))
    expect((p.gates as Record<string, unknown>).future).toEqual({ x: 1 })
  })

  it('never sends earnings dates inside gates — only the top-level earnings_dates', () => {
    // The full read folds the dates into gates.strategy.earnings; the API rejects them there on a write.
    const d = full()
    ;(d.gates.strategy!.earnings as Record<string, unknown>).dates = ['2030-01-02', '2030-04-03']
    const f = gateToForm(d)
    const p = gateFormToPayload(f)
    expect(p.gates.strategy!.earnings).toEqual({ blackout_days_before: 14, blackout_days_after: 15 })
    expect(p.earnings_dates).toEqual(['2030-01-02', '2030-04-03'])
    // the form's own object is untouched
    expect((f.gates.strategy!.earnings as Record<string, unknown>).dates).toEqual(['2030-01-02', '2030-04-03'])
    // a copy goes out the same way
    expect(gateFormToPayload(gateToForm(d, { copy: true })).gates.strategy!.earnings).not.toHaveProperty('dates')
  })

  it('does not share objects with what it was read from', () => {
    const d = full()
    const f = gateToForm(d)
    const next = setGateValue(f, 'guard.risk.max_position_shares', 99)
    expect(d.gates.guard!.risk!.max_position_shares).toBe(42)
    expect(f.gates.guard!.risk!.max_position_shares).toBe(42)
    expect(getGateValue(next.gates, 'guard.risk.max_position_shares')).toBe(99)
    gateFormToPayload(f).earnings_dates!.push('x')
    expect(f.earnings_dates).toHaveLength(2)
  })

  it('copy: named (copy), inactive, same params', () => {
    const f = gateToForm(full(), { copy: true })
    expect(f.name).toBe('Test set (copy)')
    expect(f.is_active).toBe(false)
    expect(f.gates).toEqual(full().gates)
  })

  it('empty: the defaults it is given (the API’s), version 1, inactive', () => {
    const defaults = gatesFixture()
    const f = emptyGateForm(defaults)
    expect(f).toMatchObject({ name: '', version: 1, is_active: false, earnings_dates: [] })
    expect(f.gates).toEqual(GATES_FIXTURE)
    expect(f.gates).not.toBe(defaults)
    // a changed default reaches the next new set — no copy of its own wins
    defaults.strategy!.structure!.min_dte = 99
    expect(emptyGateForm(defaults).gates.strategy!.structure!.min_dte).toBe(99)
  })
})

describe('gateForm — a valid gate set', () => {
  it('needs a name', () => {
    expect(isGateFormReady(gateToForm(full()))).toBe(true)
    expect(gateFormProblem({ ...gateToForm(full()), name: '  ' })).toBe('Name is required')
  })

  it('holds back a cleared number instead of writing 0', () => {
    expect(parseGateNumber('')).toBeNull()
    expect(parseGateNumber('abc')).toBeNull()
    expect(parseGateNumber('0.5')).toBe(0.5)
    const f = setGateValue(gateToForm(full()), 'guard.risk.max_daily_loss_usd', parseGateNumber(''))
    expect(gateFormProblem(f)).toBe('max_daily_loss_usd needs a number')
  })

  it('wants whole numbers where the daemon’s schema says int', () => {
    const f = setGateValue(gateToForm(full()), 'strategy.structure.min_dte', 2.5)
    expect(gateFormProblem(f)).toBe('min_dte must be a whole number')
    expect(isGateFormReady(setGateValue(gateToForm(full()), 'guard.risk.max_daily_loss_usd', 2.5))).toBe(true)
  })

  it('a field the set does not carry is left to the server default', () => {
    const d = full()
    delete d.gates.state!.system
    expect(isGateFormReady(gateToForm(d))).toBe(true)
  })
})

describe('gateForm — edits go into v(N+1)', () => {
  it('the first edit moves the draft from N to N+1; later edits keep N+1', () => {
    const f = gateToForm(full())
    const first = withNextVersion({ ...f, name: 'a' }, f.version)
    expect(first.version).toBe(5)
    const second = withNextVersion({ ...first, name: 'ab' }, f.version)
    expect(second.version).toBe(5)
  })

  it('counts from the version the editor opened with, not the saved one', () => {
    // After the first save the server answers v5; a later edit still goes into v5, not v6.
    const reloaded = { ...gateToForm(full()), version: 5 }
    expect(withNextVersion(reloaded, 4).version).toBe(5)
  })

  it('returns the same object when nothing changes', () => {
    const f = { ...gateToForm(full()), version: 5 }
    expect(withNextVersion(f, 4)).toBe(f)
  })
})
