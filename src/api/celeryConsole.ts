import { getOpsToken } from '@/api/ops'

const BASE = import.meta.env.VITE_API_OPS as string

function opsAuthHeaders(): Record<string, string> {
  const token = getOpsToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

function consoleStreamQuery(lines: number): URLSearchParams {
  const q = new URLSearchParams()
  q.set('lines', String(lines))
  const token = getOpsToken()
  if (token) q.set('token', token)
  return q
}

export function brokerConsoleUrl(lines = 200): string {
  return `${BASE}/ops/console/broker?${consoleStreamQuery(lines)}`
}

export function workerConsoleUrl(workerId: string, lines = 200): string {
  return `${BASE}/ops/console/worker/${encodeURIComponent(workerId)}?${consoleStreamQuery(lines)}`
}

export async function fetchCeleryLogs(
  workerId: string,
  tail = 50,
): Promise<{ lines: string[]; error?: string }> {
  const params = new URLSearchParams({ tail: String(tail), worker: workerId })
  const res = await fetch(`${BASE}/ops/celery/logs?${params}`, { headers: opsAuthHeaders() })
  const j = await res.json().catch(() => ({ lines: [] }))
  return { lines: Array.isArray(j.lines) ? j.lines : [], error: j.error }
}

export async function clearCeleryLogs(workerId: string): Promise<{ ok: boolean; error?: string }> {
  const q = new URLSearchParams({ worker: workerId })
  const res = await fetch(`${BASE}/ops/celery/logs?${q}`, {
    method: 'DELETE',
    headers: opsAuthHeaders(),
  })
  const j = await res.json().catch(() => ({}))
  return { ok: res.ok && j.ok !== false, error: j.error }
}

/** Worker console: EventSource with JSON `{ line }` payloads. */
export function subscribeWorkerConsole(
  workerId: string,
  onLine: (line: string) => void,
  onError?: () => void,
  lines = 200,
): () => void {
  const es = new EventSource(workerConsoleUrl(workerId, lines))
  es.onmessage = (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data) as { line?: string }
      if (data && typeof data.line === 'string') onLine(data.line)
    } catch {
      // ignore malformed frames
    }
  }
  es.onerror = () => {
    onError?.()
    es.close()
  }
  return () => es.close()
}
