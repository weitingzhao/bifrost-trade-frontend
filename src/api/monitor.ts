import type { StatusResponse, Operation, FlexAccountItem } from '@/types/monitor'
import type { ActiveStrategyPayload } from '@/types/positions'
import { withValidation } from '@/lib/apiValidation'
import { StatusResponseSchema, OperationsResponseSchema } from '@/lib/schemas/monitor'

const BASE = import.meta.env.VITE_API_MONITOR as string
const MARKET_BASE = import.meta.env.VITE_API_MARKET as string

const validateStatus = withValidation<StatusResponse>(StatusResponseSchema, 'monitor/status')
const validateOperations = withValidation<{ operations: Operation[] }>(
  OperationsResponseSchema, 'monitor/operations'
)

export async function fetchMonitorStatus(): Promise<StatusResponse> {
  const res = await fetch(`${BASE}/status`)
  if (!res.ok) throw new Error(`Monitor /status: ${res.status}`)
  return validateStatus(await res.json())
}

export async function postRefreshAccounts(signal?: AbortSignal): Promise<{ ok: boolean; message?: string; error?: string }> {
  const res = await fetch(`${BASE}/control/refresh_accounts`, { method: 'POST', signal })
  if (!res.ok) throw new Error(`Refresh accounts: ${res.status}`)
  return res.json()
}

export async function postActiveStrategy(
  payload: ActiveStrategyPayload,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/config/active-strategy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`POST /config/active-strategy: ${res.status}`)
  return res.json()
}

export async function postSuspend(): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`${BASE}/control/suspend`, { method: 'POST' })
  if (!res.ok) throw new Error(`POST /control/suspend: ${res.status}`)
  return res.json()
}

export async function postResume(): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`${BASE}/control/resume`, { method: 'POST' })
  if (!res.ok) throw new Error(`POST /control/resume: ${res.status}`)
  return res.json()
}

export async function postFlatten(): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`${BASE}/control/flatten`, { method: 'POST' })
  if (!res.ok) throw new Error(`POST /control/flatten: ${res.status}`)
  return res.json()
}

export async function fetchOperations(limit = 50): Promise<{ operations: Operation[] }> {
  const res = await fetch(`${BASE}/operations?limit=${limit}`)
  if (!res.ok) throw new Error(`Monitor /operations: ${res.status}`)
  return validateOperations(await res.json())
}

// ─── Configuration API ────────────────────────────────────────────────────────

export async function postSetHeartbeatInterval(
  heartbeat_interval_sec: number,
): Promise<{ ok: boolean; error?: string; heartbeat_interval_sec?: number }> {
  const res = await fetch(`${BASE}/control/set_heartbeat_interval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ heartbeat_interval_sec }),
  })
  const j = await res.json().catch(() => ({}))
  return { ...j, ok: res.ok, error: j.error ?? (res.ok ? undefined : res.statusText) }
}

export async function postSetAccountSyncInterval(
  heartbeat_interval_sec: number,
): Promise<{ ok: boolean; error?: string; heartbeat_interval_sec?: number }> {
  const res = await fetch(`${BASE}/account-sync/control/set_heartbeat_interval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ heartbeat_interval_sec }),
  })
  const j = await res.json().catch(() => ({}))
  return { ...j, ok: res.ok, error: j.error ?? (res.ok ? undefined : res.statusText) }
}

export async function postIbConfig(accounts: {
  ib_host_account_id?: string | null
  stream_host_account_id?: string | null
  stream_secondary_account_id?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/config/ib`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accounts),
  })
  const j = await res.json().catch(() => ({}))
  return { ...j, ok: res.ok, error: j.error ?? (res.ok ? undefined : res.statusText) }
}

export async function postFlexConfig(
  hostToken: string | null | undefined,
  secondaryToken: string | null | undefined,
  accounts: FlexAccountItem[],
  flexDefaultRangeDays?: number | null,
  flexInitRangeDays?: number | null,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/config/flex`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host_token: hostToken ?? undefined,
      secondary_token: secondaryToken ?? undefined,
      accounts,
      flex_default_range_days:
        flexDefaultRangeDays != null && Number.isFinite(flexDefaultRangeDays)
          ? Math.max(1, Math.round(flexDefaultRangeDays))
          : undefined,
      flex_init_range_days:
        flexInitRangeDays != null && Number.isFinite(flexInitRangeDays)
          ? Math.max(1, Math.round(flexInitRangeDays))
          : undefined,
    }),
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
  const res = await fetch(`${MARKET_BASE}/market/holidays?${params}`)
  if (!res.ok) throw new Error(`Market /holidays: ${res.status}`)
  return res.json()
}

export async function postMarketHoliday(payload: {
  date: string
  label?: string
  exchange?: string
}): Promise<{ date: string; exchange: string; label: string | null }> {
  const res = await fetch(`${MARKET_BASE}/market/holidays`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: (payload.date ?? '').trim().slice(0, 10),
      label: payload.label?.trim() || undefined,
      exchange: (payload.exchange ?? 'NYSE').trim() || undefined,
    }),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.detail ?? res.statusText)
  }
  return res.json()
}

export async function deleteMarketHoliday(dateStr: string, exchange?: string): Promise<void> {
  const params = new URLSearchParams({ date: (dateStr ?? '').trim().slice(0, 10) })
  if (exchange?.trim()) params.set('exchange', exchange.trim())
  const res = await fetch(`${MARKET_BASE}/market/holidays?${params}`, { method: 'DELETE' })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.detail ?? res.statusText)
  }
}
