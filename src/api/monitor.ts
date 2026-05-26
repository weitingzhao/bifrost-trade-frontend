import type { StatusResponse, Operation } from '@/types/monitor'
import type { ActiveStrategyPayload } from '@/types/positions'

const BASE = import.meta.env.VITE_API_MONITOR as string

export async function fetchMonitorStatus(): Promise<StatusResponse> {
  const res = await fetch(`${BASE}/status`)
  if (!res.ok) throw new Error(`Monitor /status: ${res.status}`)
  return res.json() as Promise<StatusResponse>
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
  return res.json()
}
