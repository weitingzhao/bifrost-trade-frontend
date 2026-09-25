import type { StatusResponse } from '@/types/monitor'
import type { ActiveStrategyPayload } from '@/types/positions'
import { withValidation } from '@/lib/apiValidation'
import { StatusResponseSchema } from '@/lib/schemas/monitor'
import { monitorUrl, marketUrl } from '@/lib/devApiUrl'

const validateStatus = withValidation<StatusResponse>(StatusResponseSchema, 'monitor/status')

export async function fetchMonitorStatus(): Promise<StatusResponse> {
  const res = await fetch(monitorUrl('/status'))
  if (!res.ok) throw new Error(`Monitor /status: ${res.status}`)
  return validateStatus(await res.json())
}

/** GET /health on Monitor API (routing fields for API Health overview). */
export async function fetchMonitorHealth(): Promise<Record<string, unknown>> {
  const res = await fetch(monitorUrl('/health'), { signal: AbortSignal.timeout(8_000) })
  if (!res.ok) throw new Error(`Monitor /health: ${res.status}`)
  const j = await res.json()
  return j != null && typeof j === 'object' && !Array.isArray(j) ? (j as Record<string, unknown>) : {}
}

export async function postRefreshAccounts(signal?: AbortSignal): Promise<{ ok: boolean; message?: string; error?: string }> {
  const res = await fetch(monitorUrl('/control/refresh_accounts'), { method: 'POST', signal })
  if (!res.ok) throw new Error(`Refresh accounts: ${res.status}`)
  return res.json()
}

export async function postActiveStrategy(
  payload: ActiveStrategyPayload,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(monitorUrl('/config/active-strategy'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`POST /config/active-strategy: ${res.status}`)
  return res.json()
}

export async function postSuspend(): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(monitorUrl('/control/suspend'), { method: 'POST' })
  if (!res.ok) throw new Error(`POST /control/suspend: ${res.status}`)
  return res.json()
}

export async function postResume(): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(monitorUrl('/control/resume'), { method: 'POST' })
  if (!res.ok) throw new Error(`POST /control/resume: ${res.status}`)
  return res.json()
}

export async function postFlatten(): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(monitorUrl('/control/flatten'), { method: 'POST' })
  if (!res.ok) throw new Error(`POST /control/flatten: ${res.status}`)
  return res.json()
}

// ─── Configuration API ────────────────────────────────────────────────────────

export async function postIbConfig(accounts: {
  ib_host_account_id?: string | null
  stream_host_account_id?: string | null
  stream_secondary_account_id?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(monitorUrl('/config/ib'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accounts),
  })
  const j = await res.json().catch(() => ({}))
  return { ...j, ok: res.ok, error: j.error ?? (res.ok ? undefined : res.statusText) }
}

// ─── Market Holidays API (via Market service) ────────────────────────────────

export interface MarketHolidayRow {
  exchange: string
  holiday_date: string
  label: string | null
  name?: string | null
  status?: string | null
  source?: string | null
}

export async function fetchMarketHolidays(
  year?: number,
  exchange?: string,
): Promise<MarketHolidayRow[]> {
  const params = new URLSearchParams()
  if (year != null) params.set('year', String(year))
  if (exchange?.trim()) params.set('exchange', exchange.trim())
  const res = await fetch(marketUrl(`/market/holidays?${params}`))
  if (!res.ok) throw new Error(`Market /holidays: ${res.status}`)
  return res.json()
}
