/**
 * Shared Research Engine envelope unwrap — used by research/* API modules.
 *
 * Research responses are `{ ok, data, error? }`. Callers get `data` or throw.
 */

export interface ResearchEnvelope<T> {
  ok: boolean
  data: T
  error?: string
}

export type UnwrapResearchOpts = {
  /** When set, use HTML-aware error path with this label in messages. */
  apiLabel?: string
}

/**
 * Parse a Research Engine Response and return `body.data`.
 *
 * Default path: JSON parse + throw when `!res.ok` or `body.ok === false`.
 * With `apiLabel`: detect HTML proxy errors and include the label in throws
 * (Drafts / Hypothesis / Backtest event).
 */
export async function unwrapResearchEnvelope<T>(
  res: Response,
  opts?: UnwrapResearchOpts,
): Promise<T> {
  const label = opts?.apiLabel

  if (label) {
    const ct = res.headers.get('content-type') ?? ''
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      if (text.trimStart().startsWith('<!') || ct.includes('text/html')) {
        throw new Error(
          `${label} unreachable (got HTML instead of JSON). ` +
            'Ensure research-api :8795 is running and VITE_API_RESEARCH_ENGINE is set.',
        )
      }
      let detail = text
      try {
        const parsed = JSON.parse(text) as { detail?: string; error?: string }
        detail = parsed.detail ?? parsed.error ?? text
      } catch {
        /* keep raw text */
      }
      throw new Error(`${label} ${res.status}: ${detail}`)
    }
    const body = (await res.json()) as ResearchEnvelope<T>
    if (!body.ok) {
      throw new Error(body.error ?? `${label} returned ok=false`)
    }
    return body.data
  }

  const body = (await res.json().catch(() => ({}))) as ResearchEnvelope<T> & {
    detail?: string
  }
  if (!res.ok || body.ok === false) {
    const msg = body.error ?? body.detail ?? `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : `HTTP ${res.status}`)
  }
  return body.data
}
