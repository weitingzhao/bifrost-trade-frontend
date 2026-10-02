import type { OpenOrder } from '@/types/market'
import type { StatusResponse } from '@/types/monitor'
import { withValidation } from '@/lib/apiValidation'
import { StatusResponseSchema } from '@/lib/schemas/monitor'
import { monitorUrl } from '@/lib/devApiUrl'

const validateStatus = withValidation<StatusResponse>(StatusResponseSchema, 'monitor/status')

export async function fetchMonitorStatus(): Promise<StatusResponse> {
  const res = await fetch(monitorUrl('/status'))
  if (!res.ok) throw new Error(`Monitor /status: ${res.status}`)
  return validateStatus(await res.json())
}

export async function postRefreshAccounts(signal?: AbortSignal): Promise<{ ok: boolean; message?: string; error?: string }> {
  const res = await fetch(monitorUrl('/control/refresh_accounts'), { method: 'POST', signal })
  if (!res.ok) throw new Error(`Refresh accounts: ${res.status}`)
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

/** Working orders IB reports, as the monitor reads them. */
export async function fetchOpenOrders(): Promise<OpenOrder[]> {
  const res = await fetch(monitorUrl('/open-orders'))
  if (!res.ok) throw new Error(`Monitor /open-orders: ${res.status}`)
  const data = await res.json()
  const result = data.open_orders ?? data.orders ?? data.items ?? data
  return Array.isArray(result) ? result : []
}
