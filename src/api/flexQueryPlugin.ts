import { flexQueryPluginUrl } from '@/lib/devApiUrl'
import type { FlexAccountItem } from '@/types/monitor'
import type {
  FlexCoverageFreshnessResponse,
  FlexFetchResponse,
  FlexUploadResponse,
  TransactionsFetchResponse,
} from '@/types/trading'
import { withValidation } from '@/lib/apiValidation'
import { requestJson } from '@/lib/http'
import {
  FlexConfigSummarySchema,
  FlexCoverageFreshnessResponseSchema,
} from '@/lib/schemas/platform'

const validateFlexConfig = withValidation<FlexConfigSummary>(
  FlexConfigSummarySchema,
  'plugin/flex/config',
)
const validateFlexCoverage = withValidation<FlexCoverageFreshnessResponse>(
  FlexCoverageFreshnessResponseSchema,
  'plugin/flex/coverage-freshness',
)

export type FlexConfigSummary = {
  tokens: {
    host_token_set: boolean
    host_token_last4: string | null
    secondary_token_set: boolean
    secondary_token_last4: string | null
  }
  range_days: { default: number; init: number }
  query_rows: FlexAccountItem[]
}

export async function pluginFlexConfigSummary(): Promise<FlexConfigSummary> {
  return validateFlexConfig(await requestJson(flexQueryPluginUrl('/flex/config/summary'), { label: 'Flex Plugin' }))
}

/**
 * A Flex run reports a refusal as a 2xx `{ ok: false, error, raw_count,
 * per_query }` and the import panel prints those fields, so the body comes
 * back rather than throwing; a non-2xx still throws with the plugin's reason.
 */
function pluginPost<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(flexQueryPluginUrl(path), {
    method: 'POST',
    body: body ?? {},
    okFalse: 'return',
    label: 'Flex Plugin',
  })
}

/**
 * Synchronous Flex fetch through the plugin. One request per account by
 * default; `fallback: true` re-enables the query-default / last-365-days
 * widening when the window comes back empty — three requests per account,
 * which is what trips IB's [1018] right after another run.
 */
export async function pluginFlexTrigger(
  kind: 'trades' | 'transactions',
  extra?: { from_date?: string; to_date?: string; fallback?: boolean },
): Promise<FlexFetchResponse & TransactionsFetchResponse> {
  return pluginPost('/flex/ingest/trigger', { kind, ...(extra ?? {}) })
}

export async function pluginFlexUploadXml(xml: string): Promise<FlexUploadResponse> {
  return pluginPost('/flex/ingest/upload-xml', { xml })
}

export async function pluginFlexWriteConfig(
  hostToken: string | null | undefined,
  secondaryToken: string | null | undefined,
  /** Omitted (undefined) leaves the stored query rows as they are. */
  accounts: FlexAccountItem[] | undefined,
  flexDefaultRangeDays?: number | null,
  flexInitRangeDays?: number | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const j = await pluginPost<{ ok?: boolean; error?: string; detail?: string }>('/flex/config/write', {
      host_token: hostToken ?? undefined,
      secondary_token: secondaryToken ?? undefined,
      accounts,
      flex_default_range_days:
        flexDefaultRangeDays != null && Number.isFinite(flexDefaultRangeDays)
          ? Math.max(1, Math.round(flexDefaultRangeDays))
          : undefined,
      flex_init_range_days:
        flexInitRangeDays != null && Number.isFinite(flexInitRangeDays)
          ? Math.max(1, Math.round(flexInitRangeDays))
          : undefined,
    })
    return { ...j, ok: j.ok !== false }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function pluginFlexCoverageFreshness(): Promise<FlexCoverageFreshnessResponse> {
  const json = await requestJson(flexQueryPluginUrl('/flex/coverage/freshness'), { label: 'Flex Plugin' })
  const rec = json as Partial<FlexCoverageFreshnessResponse>
  return validateFlexCoverage({
    dimensions: Array.isArray(rec.dimensions) ? rec.dimensions : [],
  })
}
