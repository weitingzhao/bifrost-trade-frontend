/**
 * One JSON client for every API module (debt TD-50).
 *
 * Before this, each module called `fetch` itself and about fifteen local
 * wrappers (`planRequest`, `call`, `unwrap`, `jsonOrThrow`, `personaFetch`, …)
 * re-implemented the same four steps with four different error texts. They all
 * go through here now:
 *
 * 1. **Transport is `tradeFetch`** (TD-23). A write to a Trade prefix carries
 *    the operator Bearer and a 403 with `required_role` opens the operator
 *    sign-in; every other request — Research engine, plugins, reads — passes
 *    through it untouched, so routing everything through it is safe.
 * 2. **A body is JSON**: `body` is serialised and `Content-Type` set.
 * 3. **A failure throws `HttpError` in the server's own words**:
 *    `detail ?? error ?? message`, the status line only when the server gave
 *    no reason. The API is moving every failure to a real status with a
 *    `detail`; for one release it also keeps the legacy 2xx `{ ok: false,
 *    error }`, which throws the same way.
 * 4. **The Research `{ ok, data }` envelope is unwrapped in one place**
 *    (`envelope: 'research'`).
 *
 * Validation: `schema` here is strict — a mismatch throws. Modules that already
 * validate with `withValidation` (advisory: warn in DEV, pass the raw payload
 * through) keep doing that on the result; they do not pass `schema`.
 */
import type { z } from 'zod'
import { tradeFetch } from '@/lib/tradeFetch'

/** A request that did not produce the JSON its caller asked for. */
export class HttpError extends Error {
  /** HTTP status of the response (a 2xx for a legacy `ok: false` body). */
  readonly status: number
  /** The server's reason, when it gave one. */
  readonly detail: string | null
  /** The parsed body (or the raw text when it was not JSON). */
  readonly body: unknown

  constructor(status: number, message: string, init: { detail?: string | null; body?: unknown } = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.detail = init.detail ?? null
    this.body = init.body ?? null
  }
}

export interface ReadJsonOptions<T> {
  /** Strict: a payload that does not parse throws `HttpError`. */
  schema?: z.ZodType<T>
  /** `'research'` returns the `data` of Research's `{ ok, data }` envelope. */
  envelope?: 'research'
  /**
   * A 2xx `{ ok: false }` body throws by default. `'return'` hands it back
   * instead — only for callers that read the refusal's other fields (the Flex
   * trigger's `raw_count` / `per_query`).
   */
  okFalse?: 'throw' | 'return'
  /** Names the API in messages that have no server reason (status line, HTML). */
  label?: string
}

export interface RequestJsonOptions<T> extends ReadJsonOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Serialised as JSON; `Content-Type: application/json` is set with it. */
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v)
}

function nonBlank(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

/** FastAPI's 422 `detail` is a list of `{ loc, msg }`; a reason is its messages. */
function detailText(v: unknown): string | null {
  if (Array.isArray(v)) {
    const msgs = v.map((d) => (isRecord(d) ? nonBlank(d.msg) : nonBlank(d))).filter((m): m is string => m != null)
    return msgs.length ? msgs.join('; ') : null
  }
  return nonBlank(v)
}

/** The server's own reason: `detail ?? error ?? message`, or null. */
export function reasonOf(body: unknown): string | null {
  if (!isRecord(body)) return null
  return detailText(body.detail) ?? nonBlank(body.error) ?? nonBlank(body.message)
}

function prefixed(label: string | undefined, text: string): string {
  return label ? `${label}: ${text}` : text
}

function statusLine(res: Response, label: string | undefined): string {
  return prefixed(label, `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}`)
}

function looksHtml(text: string, res: Response): boolean {
  return text.trimStart().startsWith('<') || (res.headers.get('content-type') ?? '').includes('text/html')
}

function htmlMessage(res: Response, label: string | undefined): string {
  return prefixed(
    label,
    `got HTML instead of JSON (HTTP ${res.status}) — the dev proxy or gateway is not reaching the API`,
  )
}

/**
 * Read a `Response` the way `requestJson` does. For the few modules that must
 * hold the `Response` themselves (streams, `unwrapResearchEnvelope`).
 */
export async function readJsonResponse<T>(res: Response, opts: ReadJsonOptions<T> = {}): Promise<T> {
  const text = await res.text().catch(() => '')
  let body: unknown = null
  let parsed = false
  if (text.trim() !== '') {
    try {
      body = JSON.parse(text) as unknown
      parsed = true
    } catch {
      /* not JSON — handled below */
    }
  }

  if (!res.ok) {
    const reason = reasonOf(body)
    const message = reason ?? (!parsed && text && looksHtml(text, res) ? htmlMessage(res, opts.label) : statusLine(res, opts.label))
    throw new HttpError(res.status, message, { detail: reason, body: parsed ? body : text })
  }
  if (!parsed && text.trim() !== '') {
    const message = looksHtml(text, res)
      ? htmlMessage(res, opts.label)
      : prefixed(opts.label, `answered HTTP ${res.status} with a body that is not JSON`)
    throw new HttpError(res.status, message, { body: text })
  }
  if (isRecord(body) && body.ok === false && opts.okFalse !== 'return') {
    const reason = reasonOf(body)
    throw new HttpError(res.status, reason ?? prefixed(opts.label, 'the server answered ok: false with no reason'), {
      detail: reason,
      body,
    })
  }

  let out: unknown = body
  if (opts.envelope === 'research' && isRecord(body) && 'data' in body) out = body.data

  if (opts.schema) {
    const result = opts.schema.safeParse(out)
    if (!result.success) {
      const first = result.error.issues[0]
      const where = first?.path.length ? first.path.join('.') : 'payload'
      throw new HttpError(
        res.status,
        prefixed(opts.label, `unexpected response shape at ${where}: ${first?.message ?? 'invalid'}`),
        { body: out },
      )
    }
    out = result.data
  }
  return out as T
}

/** Request JSON from any API this app talks to. See the module note. */
export async function requestJson<T>(url: string, opts: RequestJsonOptions<T> = {}): Promise<T> {
  const headers = new Headers(opts.headers)
  let body: string | undefined
  if (opts.body !== undefined) {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    body = JSON.stringify(opts.body)
  }
  const res = await tradeFetch(url, { method: opts.method, headers, body, signal: opts.signal })
  return readJsonResponse<T>(res, opts)
}

/**
 * The rows of a list answer: `items`, else the ONE named legacy key, else none.
 * No chain of guessed keys — a list under any other name is a contract change
 * to make on purpose, not to absorb here.
 */
export function listItems<T = unknown>(body: unknown, legacyKey?: string): T[] {
  if (!isRecord(body)) return []
  if (Array.isArray(body.items)) return body.items as T[]
  if (legacyKey && Array.isArray(body[legacyKey])) return body[legacyKey] as T[]
  return []
}
