/**
 * Shared Research Engine envelope unwrap — used by research/* API modules
 * that hold the `Response` themselves.
 *
 * Research responses are `{ ok, data, error? }`. Callers get `data` or throw.
 * The reading is `readJsonResponse` in `@/lib/http` (TD-50) — one rule for
 * every module: the server's reason (`detail ?? error`) is the message, the
 * status is on `HttpError.status` (alias `ResearchHttpError`) so 401
 * empty-states do not scrape the message string. New code calls
 * `requestJson(url, { envelope: 'research' })` instead.
 */
import { readJsonResponse } from '@/lib/http'

export interface ResearchEnvelope<T> {
  ok: boolean
  data: T
  error?: string
}

export type UnwrapResearchOpts = {
  /** Names the API in messages the server gave no reason for (status line, HTML proxy page). */
  apiLabel?: string
}

/** Parse a Research Engine Response and return `body.data`. */
export function unwrapResearchEnvelope<T>(res: Response, opts?: UnwrapResearchOpts): Promise<T> {
  return readJsonResponse<T>(res, { envelope: 'research', label: opts?.apiLabel })
}
