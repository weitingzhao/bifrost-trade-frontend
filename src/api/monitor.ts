import type { OpenOrder } from '@/types/market'
import type { StatusResponse } from '@/types/monitor'
import { withValidation } from '@/lib/apiValidation'
import { StatusResponseSchema } from '@/lib/schemas/monitor'
import { monitorUrl } from '@/lib/devApiUrl'
import { tradeFetch } from '@/lib/tradeFetch'
import { httpFailure, listItems, requestJson } from '@/lib/http'

const validateStatus = withValidation<StatusResponse>(StatusResponseSchema, 'monitor/status')

export async function fetchMonitorStatus(): Promise<StatusResponse> {
  const res = await tradeFetch(monitorUrl('/status'))
  if (!res.ok) throw new Error(`Monitor /status: ${res.status}`)
  return validateStatus(await res.json())
}

export async function postRefreshAccounts(signal?: AbortSignal): Promise<{ ok: boolean; message?: string; error?: string }> {
  const res = await tradeFetch(monitorUrl('/control/refresh_accounts'), { method: 'POST', signal })
  if (!res.ok) throw new Error(`Refresh accounts: ${res.status}`)
  return res.json()
}

export async function postSuspend(): Promise<{ ok?: boolean; error?: string }> {
  const res = await tradeFetch(monitorUrl('/control/suspend'), { method: 'POST' })
  if (!res.ok) throw new Error(`POST /control/suspend: ${res.status}`)
  return res.json()
}

export async function postResume(): Promise<{ ok?: boolean; error?: string }> {
  const res = await tradeFetch(monitorUrl('/control/resume'), { method: 'POST' })
  if (!res.ok) throw new Error(`POST /control/resume: ${res.status}`)
  return res.json()
}

export async function postFlatten(): Promise<{ ok?: boolean; error?: string }> {
  const res = await tradeFetch(monitorUrl('/control/flatten'), { method: 'POST' })
  if (!res.ok) throw new Error(`POST /control/flatten: ${res.status}`)
  return res.json()
}

// ─── Configuration API ────────────────────────────────────────────────────────

export async function postIbConfig(accounts: {
  ib_host_account_id?: string | null
  stream_host_account_id?: string | null
  stream_secondary_account_id?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const j = await requestJson<Record<string, unknown>>(monitorUrl('/config/ib'), { method: 'POST', body: accounts })
    return { ...j, ok: true }
  } catch (e) {
    // The settings form prints `error`; the server's `detail` is it.
    return { ok: false, error: httpFailure(e) }
  }
}

/** Working orders IB reports, as the monitor reads them. */
export async function fetchOpenOrders(): Promise<OpenOrder[]> {
  // GET /open-orders answers `{ open_orders }` (monitor/routers/status.py).
  return listItems<OpenOrder>(await requestJson(monitorUrl('/open-orders')), 'open_orders')
}
