import { z } from 'zod'

/**
 * Wraps a Zod schema to validate API responses at runtime.
 *
 * TExpected: the TypeScript interface the caller expects (e.g. ExecutionsResponse).
 * The schema validates structure; TExpected describes the semantic type with narrower
 * string unions etc. The two are intentionally decoupled — the schema catches structural
 * drift (missing required fields, wrong types) without needing to match every literal union.
 *
 * On mismatch: logs a warning in dev mode, then passes the raw data through so the app
 * keeps working even when backend schema drifts. Failures surface immediately in dev
 * without crashing production.
 */
export function withValidation<TExpected>(schema: z.ZodSchema, endpointName: string) {
  return (data: unknown): TExpected => {
    const result = schema.safeParse(data)
    if (!result.success) {
      if (import.meta.env.DEV) {
        // Show first 3 issues to avoid flooding the console
        const sample = result.error.issues.slice(0, 3)
        console.warn(`[api-schema] ${endpointName} — ${result.error.issues.length} issue(s):`, sample)
      }
      return data as TExpected
    }
    return result.data as TExpected
  }
}
