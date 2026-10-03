/**
 * Signal decay / lens hit-rate — Analyze Waves I / L.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { requestJson } from '@/lib/http'
import {
  SignalDecayBySymbolSchema,
} from '@/lib/schemas/research'

export type SignalDecayLens =
  | 'iv_rank'
  | 'vrp'
  | 'opex_pin'
  | 'skew'
  | 'gex_regime'
  | 'terrain_regime'
  | 'order_sentiment'

/**
 * The lenses the decay page can select, in the order it lists them.
 *
 * One list, in the module that owns the vocabulary, because two surfaces read
 * it for different reasons and a deep link may only name a lens the
 * destination can actually show: the page's own selector, the roster that asks
 * each of them twice, and `alertHref`, which attaches `?lens=` to an alert's
 * link. `order_sentiment` is a `SignalDecayLens` and is deliberately not here
 * — it reads nothing (0 of 647 on Lens Coverage), so the page never offered it.
 */
export const SIGNAL_DECAY_LENSES: readonly { value: SignalDecayLens; label: string }[] = [
  { value: 'iv_rank', label: 'IV Rank' },
  { value: 'vrp', label: 'VRP' },
  { value: 'opex_pin', label: 'OpEx Pin' },
  { value: 'skew', label: 'Skew' },
  { value: 'gex_regime', label: 'Gamma' },
  { value: 'terrain_regime', label: 'Terrain' },
]

export function isSignalDecayLens(v: string | null | undefined): v is SignalDecayLens {
  return SIGNAL_DECAY_LENSES.some((l) => l.value === v)
}

export type SignalDecayRegime = 'any' | 'bull' | 'rangy' | 'bear'

export interface SignalDecaySideStats {
  n: number
  hit_5d: number
  evaluated_5d: number
  pending_5d?: number
  hit_rate_5d: number | null
  hit_20d: number
  evaluated_20d: number
  pending_20d?: number
  hit_rate_20d: number | null
  /**
   * Gains over losses of this side's settled directional returns (research
   * 0.132.0+): null for a magnitude lens, with nothing settled, or with no loss.
   */
  profit_factor_5d?: number | null
  profit_factor_20d?: number | null
}

export interface SignalDecayTrendPoint {
  week: string
  n: number
  rolling_hit_rate_5d: number | null
}

export interface SignalDecayRecentTrigger {
  trade_date: string
  trigger_side: string
  trigger_value: number | null
  fwd_return_5d: number | null
  hit_5d: boolean | null
  fwd_return_20d: number | null
  hit_20d: boolean | null
  regime: string | null
}

export interface SignalDecayResponse {
  lens: SignalDecayLens | string
  symbol: string | null
  window_days: number
  regime: string
  trigger_count: number
  hit_rate_5d: number | null
  /** Hot and cold together, each row on its own side's direction. */
  profit_factor_5d?: number | null
  profit_factor_20d?: number | null
  by_side: {
    hot: SignalDecaySideStats
    cold: SignalDecaySideStats
  }
  trend: SignalDecayTrendPoint[]
  trend_hot: SignalDecayTrendPoint[]
  trend_cold: SignalDecayTrendPoint[]
  recent_triggers?: SignalDecayRecentTrigger[]
}

export interface SignalDecayIntersectBaseline {
  n: number
  hit_rate_5d: number | null
  hit_rate_20d: number | null
  evaluated_5d: number
  evaluated_20d: number
}

export interface SignalDecayIntersectSample {
  trade_date: string
  symbol: string | null
  hit_5d: boolean | null
  fwd_return_5d: number | null
}

export interface SignalDecayIntersectResponse {
  lens_pairs: string[]
  window_days: number
  symbol: string | null
  regime: string
  n: number
  hit_rate_5d: number | null
  hit_rate_20d: number | null
  evaluated_5d: number
  evaluated_20d: number
  single_lens_baseline: Record<string, SignalDecayIntersectBaseline>
  sample: SignalDecayIntersectSample[]
}

export async function fetchSignalDecay(params: {
  lens: SignalDecayLens
  windowDays?: number
  symbol?: string
  regime?: string
}): Promise<SignalDecayResponse> {
  const q = new URLSearchParams()
  q.set('lens', params.lens)
  q.set('window_days', String(params.windowDays ?? 30))
  if (params.symbol) q.set('symbol', params.symbol)
  if (params.regime && params.regime !== 'any') q.set('regime', params.regime)
  return requestJson<SignalDecayResponse>(`${researchEngineUrl('/research/signal-decay')}?${q}`, {
    envelope: 'research',
  })
}

export async function fetchSignalDecayIntersect(params: {
  lensPairs: string
  windowDays?: number
  symbol?: string
  regime?: string
}): Promise<SignalDecayIntersectResponse> {
  const q = new URLSearchParams()
  q.set('lens_pairs', params.lensPairs)
  q.set('window_days', String(params.windowDays ?? 30))
  if (params.symbol) q.set('symbol', params.symbol)
  if (params.regime && params.regime !== 'any') q.set('regime', params.regime)
  return requestJson<SignalDecayIntersectResponse>(
    `${researchEngineUrl('/research/signal-decay/intersect')}?${q}`,
    { envelope: 'research' },
  )
}

/* ------------------------------------------------------ per-symbol (C2) */

export interface SignalDecaySymbolSide {
  n: number
  evaluated_5d: number
  hit_rate_5d: number | null
  evaluated_20d: number
  hit_rate_20d: number | null
}

export interface SignalDecayBySymbolResponse {
  lens: SignalDecayLens | string
  window_days: number
  symbols: string[]
  /** SYMBOL → side ('hot' | 'cold') → its own record; symbols without triggers are absent. */
  rows: Record<string, Partial<Record<'hot' | 'cold', SignalDecaySymbolSide>>>
}

const validateBySymbol = withValidation<SignalDecayBySymbolResponse>(
  SignalDecayBySymbolSchema,
  'research/signal-decay/by-symbol',
)

/** One lens, many symbols: each name's own hit record instead of the universe pool. */
export async function fetchSignalDecayBySymbol(params: {
  lens: SignalDecayLens
  symbols: readonly string[]
  windowDays?: number
}): Promise<SignalDecayBySymbolResponse> {
  const q = new URLSearchParams()
  q.set('lens', params.lens)
  q.set('symbols', params.symbols.map((s) => s.trim().toUpperCase()).filter(Boolean).join(','))
  q.set('window_days', String(params.windowDays ?? 365))
  return validateBySymbol(
    await requestJson<SignalDecayBySymbolResponse>(`${researchEngineUrl('/research/signal-decay/by-symbol')}?${q}`, {
      envelope: 'research',
    }),
  )
}
