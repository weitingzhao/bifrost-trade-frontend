import { getOpsToken } from '@/api/ops'

/** Bearer token for control-plane POST (shutdown, etc.). */
export function opsBearerHeaders(): Record<string, string> {
  const token = getOpsToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function opsControlFailureMessage(data: unknown, r: Response): string {
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    if (typeof o.error === 'string' && o.error.trim()) return o.error.trim()
    if (typeof o.detail === 'string' && o.detail.trim()) return o.detail.trim()
  }
  return r.statusText || `Request failed (HTTP ${r.status})`
}

