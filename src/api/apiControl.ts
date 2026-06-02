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

export async function postControlShutdown(
  url: string,
  options?: { auth?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  let r: Response
  try {
    r = await fetch(url, {
      method: 'POST',
      headers: options?.auth !== false ? opsBearerHeaders() : {},
      credentials: 'omit',
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
  let data: { ok?: boolean; error?: string }
  try {
    const text = await r.text()
    data = text ? (JSON.parse(text) as { ok?: boolean; error?: string }) : {}
  } catch (e) {
    if (!r.ok) return { ok: false, error: `Request failed (HTTP ${r.status})` }
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
  if (!r.ok) return { ok: false, error: opsControlFailureMessage(data, r) }
  return { ok: data.ok === true, error: typeof data.error === 'string' ? data.error : undefined }
}
