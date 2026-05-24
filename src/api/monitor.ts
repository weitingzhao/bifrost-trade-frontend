import type { StatusResponse } from '@/types/monitor'

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
