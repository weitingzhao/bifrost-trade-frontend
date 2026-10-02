/**
 * HTTP status from a Research Engine fetch — the 401 empty-state split hangs on this.
 *
 * Research calls throw the shared `HttpError` (TD-50); `ResearchHttpError` is
 * the same class under the name its importers already use, so `instanceof`
 * agrees whichever name a module throws or checks.
 */
import { HttpError } from '@/lib/http'

export { HttpError as ResearchHttpError }

export function researchHttpStatus(error: unknown): number | null {
  return error instanceof HttpError ? error.status : null
}

export function researchThrowHttp(res: Response, label: string): never {
  throw new HttpError(res.status, `${label} HTTP ${res.status}`)
}
