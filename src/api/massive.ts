import { postControlShutdown } from '@/api/apiControl'
import { withValidation } from '@/lib/apiValidation'
import { massiveUrl } from '@/lib/devApiUrl'
import { MassiveStatusResponseSchema } from '@/lib/schemas/optionDiscovery'
import type { MassiveJobApiRow } from '@/types/ops'
import type { MassiveStatusResponse } from '@/types/optionDiscovery'

const BASE = import.meta.env.VITE_API_MASSIVE as string

export async function fetchMassiveStatus(): Promise<MassiveStatusResponse> {
  const r = await fetch(massiveUrl('/research/massive/status'))
  const j = await r.json().catch(() => ({}))
  withValidation(MassiveStatusResponseSchema, 'fetchMassiveStatus')(j)
  const years = Number(j.daily_full_backfill_years)
  return {
    configured: Boolean(j.configured),
    tier: typeof j.tier === 'string' ? j.tier : 'starter',
    delay_notice: typeof j.delay_notice === 'string' ? j.delay_notice : '',
    trades_enabled: Boolean(j.trades_enabled),
    daily_full_backfill_years: Number.isFinite(years) && years > 0 ? years : 5,
  }
}

export async function postMassiveShutdown(): Promise<{ ok: boolean; error?: string }> {
  return postControlShutdown(`${BASE.replace(/\/$/, '')}/research/massive/shutdown`, {
    auth: false,
  })
}

export type TickerReferenceJobKind =
  | 'feed_stocks_tickers_reference_universe'
  | 'ticker_reference_universe'
  | 'feed_stocks_tickers_overview'
  | 'ticker_reference_overview'
  | 'feed_stocks_tickers_related'
  | 'ticker_reference_related'
  | 'feed_stocks_tickers_types'
  | 'ticker_reference_ticker_types'
  | 'ticker_reference_instrument_types'
  | 'stock_reference_universe'
  | 'stock_reference_overview'
  | 'stock_reference_related'
  | 'stock_reference_instrument_types'

export async function postTickerReferenceJob(body: {
  kind: TickerReferenceJobKind
  payload?: Record<string, unknown>
  priority?: string
}): Promise<{ ok: boolean; job_id?: string; deduplicated?: boolean; error?: string }> {
  const r = await fetch(`${BASE}/research/massive/jobs/ticker-reference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!j.ok) {
    return { ok: false, error: String(j.error ?? r.statusText) }
  }
  return {
    ok: true,
    job_id: j.job_id != null ? String(j.job_id) : undefined,
    deduplicated: Boolean(j.deduplicated),
  }
}

export function subscribeMassiveJobEvents(
  jobId: string,
  onEvent: (data: { ok: boolean; job?: MassiveJobApiRow; error?: string }) => void,
  options?: { timeoutSec?: number },
): { close: () => void } {
  const qs = new URLSearchParams()
  if (options?.timeoutSec != null) qs.set('timeout_sec', String(options.timeoutSec))
  const url = `${BASE}/research/massive/jobs/${encodeURIComponent(jobId)}/events?${qs.toString()}`
  const es = new EventSource(url)
  es.onmessage = (ev: MessageEvent<string>) => {
    try {
      const data = JSON.parse(ev.data) as { ok: boolean; job?: MassiveJobApiRow; error?: string }
      onEvent(data)
      const st = data.job?.status
      if (data.ok === false || st === 'done' || st === 'failed') {
        es.close()
      }
    } catch {
      onEvent({ ok: false, error: 'Invalid SSE payload' })
      es.close()
    }
  }
  es.onerror = () => {
    onEvent({ ok: false, error: 'SSE connection error' })
    es.close()
  }
  return { close: () => es.close() }
}
