/**
 * The market-data plugin's own verdict over the watchlist.
 *
 * The plugin answers "did last night's raw data land for the watchlist" as a
 * set of checks and one PASS / FAIL. System Status reads it as a line under
 * Nightly data (Owner 2026-09-25); the rest of the coverage surface — the
 * inventory, the per-symbol option rows, the table census — lives in the Ops
 * Console (Massive › Coverage) since the System › Data coverage page retired.
 *
 * Reached through the Trade gateway (`/api/plugin/market-data`), which is how
 * this frontend is configured to see the plugin in DEV and PROD alike.
 */
import { z } from 'zod'
import { withValidation } from '@/lib/apiValidation'
import { marketDataPluginUrl } from '@/lib/devApiUrl'

/**
 * The plugin ships on its own chain, so this guards the envelope rather than
 * the contents: `.passthrough()`, every field it might not send optional. A
 * drift warns in dev and passes through in production.
 */
const QualitySchema = z
  .object({
    ok: z.boolean(),
    summary: z.string().nullable().optional(),
    watchlist_source_count: z.number().nullable().optional(),
    checks: z.array(z.object({ check: z.string(), ok: z.boolean() }).passthrough()).optional(),
  })
  .passthrough()

export interface CoverageQualityCheck {
  check: string
  ok: boolean
  [k: string]: unknown
}

export interface CoverageQuality {
  ok: boolean
  /** "PASS" / "FAIL" — the plugin's own verdict over the checks below. */
  summary?: string | null
  watchlist_source_count?: number | null
  checks?: CoverageQualityCheck[]
}

const vQuality = withValidation<CoverageQuality>(QualitySchema, 'market-data/coverage/quality-score')

export async function fetchCoverageQuality(signal?: AbortSignal): Promise<CoverageQuality> {
  const res = await fetch(marketDataPluginUrl('/market/coverage/quality-score'), { signal })
  if (!res.ok) throw new Error(`Market Data Plugin /market/coverage/quality-score: HTTP ${res.status}`)
  return vQuality(await res.json())
}
