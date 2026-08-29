/**
 * Analyze alerts API — Wave M.
 * GET /research/alerts
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

export type AlertKind = 'composite_high' | 'weight_shift' | 'hit_rate_drop'
export type AlertSeverity = 'high' | 'warn' | 'info' | string

export type AlertReason = Record<string, unknown> | string | null

export interface AnalyzeAlert {
  trade_date: string
  kind: AlertKind | string
  symbol: string | null
  lens: string | null
  severity: AlertSeverity
  reason: AlertReason
  computed_at: string | null
}

export interface AlertsResponse {
  count: number
  items: AnalyzeAlert[]
}

export interface FetchAlertsParams {
  limit?: number
  days?: number
  kind?: AlertKind
}

export async function fetchAlerts(params: FetchAlertsParams = {}): Promise<AlertsResponse> {
  const q = new URLSearchParams()
  if (params.limit != null) q.set('limit', String(params.limit))
  if (params.days != null) q.set('days', String(params.days))
  if (params.kind) q.set('kind', params.kind)
  const qs = q.toString()
  return unwrap(await fetch(`${researchEngineUrl('/research/alerts')}${qs ? `?${qs}` : ''}`))
}
