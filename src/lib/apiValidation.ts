import { z } from 'zod'
import { reportSchemaDrift } from '@/lib/schemaDriftReport'

/**
 * Wraps a Zod schema to validate API responses at runtime.
 *
 * TExpected: the TypeScript type the caller expects — `z.infer` of the schema
 * where the schema mirrors an API response model (TD-24), a narrower hand type
 * elsewhere. The schema catches structural drift (missing required fields,
 * wrong types).
 *
 * Advisory on mismatch: the raw data passes through so the page keeps working
 * when the backend drifts. DEV logs the first issues on every mismatch; PROD
 * records it through `reportSchemaDrift` — once per (schema, field path) per
 * session, names only, never values. Pass the request `url` so the record says
 * which call answered it (only its path is kept).
 */
export function withValidation<TExpected>(schema: z.ZodSchema, endpointName: string) {
  return (data: unknown, url?: string): TExpected => {
    const result = schema.safeParse(data)
    if (!result.success) {
      if (import.meta.env.DEV) {
        const sample = result.error.issues.slice(0, 3)
        // eslint-disable-next-line no-console -- dev-only schema drift warning
        console.warn(`[api-schema] ${endpointName} — ${result.error.issues.length} issue(s):`, sample)
      } else {
        reportSchemaDrift(endpointName, result.error.issues, url)
      }
      return data as TExpected
    }
    return result.data as TExpected
  }
}
