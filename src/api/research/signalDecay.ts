/**
 * Signal decay / lens hit-rate — Analyze Waves I / L.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'

interface Envelope<T> {
  ok: boolean
  data: T
  error?: string
}

async function unwrap<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as Envelope<T> & { detail?: string }
  if (!res.ok || body.ok === false) {
    const msg = body.error ?? body.detail ?? `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : `HTTP ${res.status}`)
  }
  return body.data
}

export type SignalDecayLens = 'iv_rank' | 'vrp' | 'opex_pin'

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
  return unwrap(await fetch(`${researchEngineUrl('/research/signal-decay')}?${q}`))
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
  return unwrap(
    await fetch(`${researchEngineUrl('/research/signal-decay/intersect')}?${q}`),
  )
}
