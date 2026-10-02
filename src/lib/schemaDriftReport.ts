import type { z } from 'zod'

/**
 * Production record of API answers that do not match their schema (TD-24).
 *
 * `withValidation` stays advisory — the raw answer still reaches the page — but
 * a mismatch in PROD used to vanish: the DEV warning was the only signal. Here
 * each one is written to the console once per session, as
 * `[api-schema-drift] <schema> <url path>: <field paths>`:
 *
 * - **Names only, never values**: the schema name, the field paths that failed
 *   (array positions folded: `items[].symbols`), the issue code and, for a
 *   wrong type, the expected type. No message text — a zod message can quote
 *   the value it refused — and no query string.
 * - **Once per (schema, field path)**: a list of 300 rows with the same drift
 *   is one report, and a refetch every 30 s does not repeat it.
 * - **Rate-limited**: at most `MAX_REPORTS` reports per session, then one line
 *   saying the rest are not reported.
 *
 * There is no client telemetry endpoint to send these to (searched 2026-10-02:
 * no Sentry-like reporter, no client-error route; the Feedback store is
 * reports people write, and filling it from code would bury theirs), so the
 * console is the sink. `setSchemaDriftSink` swaps it, for tests and for a
 * reporter added later.
 */

type Issue = z.ZodError['issues'][number]

export interface SchemaDriftReport {
  schema: string
  /** The request's path, no origin and no query; null when the caller gave none. */
  url: string | null
  /** `items[].symbols (invalid_type, expected array)` — new to this session only. */
  fields: string[]
}

export type SchemaDriftSink = (report: SchemaDriftReport) => void

/** Reports per session before the rest are dropped. */
export const MAX_REPORTS = 20

function consoleSink(report: SchemaDriftReport): void {
  // eslint-disable-next-line no-console -- the PROD drift record (names only, rate-limited)
  console.warn(
    `[api-schema-drift] ${report.schema}${report.url ? ` ${report.url}` : ''}: ${report.fields.join('; ')}`,
  )
}

let sink: SchemaDriftSink = consoleSink
const seen = new Set<string>()
let reports = 0
let capped = false

/** Replace where reports go; returns the previous sink. */
export function setSchemaDriftSink(next: SchemaDriftSink): SchemaDriftSink {
  const prev = sink
  sink = next
  return prev
}

/** Forget what this session reported (tests). */
export function resetSchemaDriftReports(): void {
  seen.clear()
  reports = 0
  capped = false
}

/** `['items', 3, 'symbols']` → `items[].symbols`; the root is `(root)`. */
export function driftFieldPath(path: readonly PropertyKey[]): string {
  let out = ''
  for (const seg of path) {
    if (typeof seg === 'number') out += '[]'
    else out += out ? `.${String(seg)}` : String(seg)
  }
  return out || '(root)'
}

function issueText(issue: Issue): string {
  const where = driftFieldPath(issue.path)
  const expected = issue.code === 'invalid_type' ? `, expected ${issue.expected}` : ''
  return `${where} (${issue.code}${expected})`
}

/** The path of a request URL: no origin, no query, no fragment. */
export function driftUrlPath(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url, 'http://local.invalid').pathname
  } catch {
    return null
  }
}

/** Record a failed parse: once per (schema, field path), at most `MAX_REPORTS` per session. */
export function reportSchemaDrift(schema: string, issues: readonly Issue[], url?: string): void {
  const fields: string[] = []
  for (const issue of issues) {
    const key = `${schema}\u0000${driftFieldPath(issue.path)}`
    if (seen.has(key)) continue
    seen.add(key)
    fields.push(issueText(issue))
  }
  if (fields.length === 0) return
  if (reports >= MAX_REPORTS) {
    if (!capped) {
      capped = true
      sink({ schema: '(more)', url: null, fields: [`further schema drift is not reported this session`] })
    }
    return
  }
  reports += 1
  sink({ schema, url: driftUrlPath(url), fields })
}
