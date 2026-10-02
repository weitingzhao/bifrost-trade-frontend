/**
 * A gate set as its form holds it, and the payload it writes — shared by the
 * gate sheet (create / copy / edit) and the Desk's inspector (design Rev .140),
 * so there is one definition of what a valid gate set is.
 *
 * The form keeps the server's own `gates` object (deep-cloned) rather than a
 * flat copy of the fields we render: whatever the set carries that no form
 * binds still goes back on the PUT unchanged.
 */
import { DEFAULT_GATES, DIM_LABELS, DIM_TYPES, type DimFieldName } from '@/utils/gateDefaults'
import type { GateSafetyFull, GateSafetyGates, GateSafetyPayload } from '@/types/positions'

export interface GateFormState extends GateSafetyPayload {
  version: number
  is_active: boolean
  dim_direction: string | null
  dim_structure: string | null
  dim_coverage: string | null
  dim_risk: string | null
  dim_volatility: string | null
  dim_time: string | null
  earnings_dates: string[]
}

/** `int` and `float` follow the daemon's schema (core `GateParams`); a whole
 *  number is required where it says int, or the PUT answers 400. */
export type GateFieldKind = 'int' | 'float' | 'bool'

export interface GateField {
  /** Path inside `gates`, e.g. `strategy.structure.min_dte`. */
  path: string
  /** The params key — what the sheet labels the row with. */
  key: string
  /** The inspector's label (design Rev .140). */
  label: string
  kind: GateFieldKind
  /** Input step, as the sheet has always used it. */
  step?: number
}

export interface GateFamily {
  id: 'strategy' | 'state' | 'intent' | 'guard'
  /** The sheet's group heading. */
  title: string
  /** The inspector's one-line note beside the family name. */
  note: string
  fields: readonly GateField[]
}

function f(path: string, label: string, kind: GateFieldKind, step?: number): GateField {
  return { path, key: path.slice(path.lastIndexOf('.') + 1), label, kind, step }
}

/** The four families of the daemon's params_json, in the sheet's order. */
export const GATE_FAMILIES: readonly GateFamily[] = [
  {
    id: 'strategy',
    title: 'Strategy (structure & earnings)',
    note: 'what may be opened',
    fields: [
      f('strategy.structure.min_dte', 'Min DTE', 'int'),
      f('strategy.structure.max_dte', 'Max DTE', 'int'),
      f('strategy.structure.atm_band_pct', 'ATM band · pct', 'float', 0.01),
      f('strategy.earnings.blackout_days_before', 'Blackout · d before earnings', 'int'),
      f('strategy.earnings.blackout_days_after', 'Blackout · d after', 'int'),
      f('strategy.trading_hours_only', 'Trading hours only', 'bool'),
    ],
  },
  {
    id: 'state',
    title: 'State (delta, market, liquidity, system)',
    note: 'when the market is readable',
    fields: [
      f('state.delta.epsilon_band', 'Δ epsilon band', 'int'),
      f('state.delta.threshold_hedge_shares', 'Hedge threshold · sh', 'int'),
      f('state.delta.max_delta_limit', 'Max Δ limit', 'int'),
      f('state.market.vol_window_min', 'Vol window · min', 'int'),
      f('state.market.stale_ts_threshold_ms', 'Stale-data halt · ms', 'int'),
      f('state.liquidity.wide_spread_pct', 'Wide spread · pct', 'float', 0.01),
      f('state.liquidity.extreme_spread_pct', 'Extreme spread · pct', 'float', 0.01),
      f('state.system.data_lag_threshold_ms', 'Data-lag halt · ms', 'int'),
    ],
  },
  {
    id: 'intent',
    title: 'Intent (hedge)',
    note: 'how hedges are sized',
    fields: [
      f('intent.hedge.min_hedge_shares', 'Min hedge · sh', 'int'),
      f('intent.hedge.cooldown_seconds', 'Cooldown · s', 'int'),
      f('intent.hedge.max_hedge_shares_per_order', 'Max sh / order', 'int'),
      f('intent.hedge.min_price_move_pct', 'Min price move · pct', 'float', 0.01),
    ],
  },
  {
    id: 'guard',
    title: 'Guard (risk)',
    note: 'the hard stops',
    fields: [
      f('guard.risk.max_daily_hedge_count', 'Max hedges / day', 'int'),
      f('guard.risk.max_position_shares', 'Max position · sh', 'int'),
      f('guard.risk.max_daily_loss_usd', 'Max daily loss · $', 'float'),
      f('guard.risk.max_net_delta_shares', 'Max net Δ · sh', 'int'),
      f('guard.risk.max_spread_pct', 'Max spread · pct', 'float', 0.01),
      f('guard.risk.paper_trade', 'Paper trade', 'bool'),
    ],
  },
]

export const GATE_FIELDS: readonly GateField[] = GATE_FAMILIES.flatMap((fam) => fam.fields)

export const GATE_DIM_FIELDS: readonly DimFieldName[] = DIM_TYPES

export function gateDimLabel(dim: DimFieldName): string {
  return dim === 'dim_time' ? 'Time horizon' : DIM_LABELS[dim]
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}

export function emptyGateForm(): GateFormState {
  return {
    name: '',
    version: 1,
    dim_direction: null,
    dim_structure: null,
    dim_coverage: null,
    dim_risk: null,
    dim_volatility: null,
    dim_time: null,
    is_active: false,
    gates: deepClone(DEFAULT_GATES),
    earnings_dates: [],
  }
}

/** The set as loaded, or — `copy` — the start of its duplicate (named `(copy)`, inactive). */
export function gateToForm(d: GateSafetyFull, opts: { copy?: boolean } = {}): GateFormState {
  return {
    name: opts.copy ? `${d.name} (copy)` : d.name,
    version: d.version,
    dim_direction: d.dim_direction ?? null,
    dim_structure: d.dim_structure ?? null,
    dim_coverage: d.dim_coverage ?? null,
    dim_risk: d.dim_risk ?? null,
    dim_volatility: d.dim_volatility ?? null,
    dim_time: d.dim_time ?? null,
    is_active: opts.copy ? false : d.is_active,
    gates: deepClone(d.gates ?? {}),
    earnings_dates: [...(d.earnings_dates ?? [])],
  }
}

/** What the sheet's Create / Update and the inspector's PUT send. */
export function gateFormToPayload(f: GateFormState): GateSafetyPayload {
  return {
    name: f.name,
    version: f.version,
    dim_direction: f.dim_direction,
    dim_structure: f.dim_structure,
    dim_coverage: f.dim_coverage,
    dim_risk: f.dim_risk,
    dim_volatility: f.dim_volatility,
    dim_time: f.dim_time,
    is_active: f.is_active,
    gates: deepClone(f.gates),
    earnings_dates: [...f.earnings_dates],
  }
}

export function getGateValue(gates: GateSafetyGates, path: string): unknown {
  return path.split('.').reduce<unknown>((cur, key) => {
    if (cur != null && typeof cur === 'object') return (cur as Record<string, unknown>)[key]
    return undefined
  }, gates)
}

/** A new form with one value set inside `gates` (the old object is untouched). */
export function setGateValue(form: GateFormState, path: string, value: unknown): GateFormState {
  const gates = deepClone(form.gates) as Record<string, unknown>
  const keys = path.split('.')
  let cur = gates
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}
    cur = cur[k] as Record<string, unknown>
  }
  cur[keys[keys.length - 1]] = value
  return { ...form, gates: gates as GateSafetyGates }
}

/**
 * Raw text from a number field → the value stored. Blank or unreadable is
 * `null`: held back by `isGateFormReady` rather than written as 0 (the
 * inspector saves while you type, so a cleared field must not go out).
 */
export function parseGateNumber(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/** Why the set cannot be written as it stands, or null when it can. */
export function gateFormProblem(f: GateFormState): string | null {
  if (!f.name.trim()) return 'Name is required'
  for (const field of GATE_FIELDS) {
    const v = getGateValue(f.gates, field.path)
    if (v === undefined) continue // not on this set — the server fills its default
    if (field.kind === 'bool') {
      if (typeof v !== 'boolean') return `${field.key} must be on or off`
      continue
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) return `${field.key} needs a number`
    if (field.kind === 'int' && !Number.isInteger(v)) return `${field.key} must be a whole number`
  }
  return null
}

/** The one definition of a gate set the server would accept from this form. */
export function isGateFormReady(f: GateFormState): boolean {
  return gateFormProblem(f) === null
}

/**
 * Design Rev .140: edits go into v(N+1) while the daemon keeps vN. `opened` is
 * N, the version the set had when the editor opened; every edit carries the
 * draft to N+1 (so the first one bumps it and later ones keep it, and undoing
 * the first one brings N back).
 */
export function withNextVersion(f: GateFormState, opened: number): GateFormState {
  return f.version === opened + 1 ? f : { ...f, version: opened + 1 }
}

/** The inspector's header meta (design Rev .140): where edits go, and what the daemon keeps. */
export function gateVersionMeta(opened: number): string {
  return `edits go into v${opened + 1} · the daemon keeps v${opened}`
}
