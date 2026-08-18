import { flexQueryPluginUrl } from '@/lib/devApiUrl'
import type { FlexAccountItem } from '@/types/monitor'
import type { FlexFetchResponse, FlexUploadResponse, TransactionsFetchResponse } from '@/types/trading'

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

function pluginErrorMessage(json: unknown, fallback: string): string {
  if (json != null && typeof json === 'object') {
    const rec = json as { error?: unknown; detail?: unknown }
    if (typeof rec.error === 'string' && rec.error.trim()) return rec.error
    if (typeof rec.detail === 'string' && rec.detail.trim()) return rec.detail
  }
  return fallback
}

export async function pluginFlexConfigSummary(): Promise<FlexConfigSummary> {
  const res = await fetch(flexQueryPluginUrl('/flex/config/summary'))
  const json: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(pluginErrorMessage(json, `Flex Plugin /flex/config/summary: ${res.status}`))
  }
  return json as FlexConfigSummary
}

async function pluginPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(flexQueryPluginUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const json: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(pluginErrorMessage(json, `Flex Plugin ${path}: ${res.status}`))
  }
  return json as T
}

export async function pluginFlexTrigger(
  kind: 'trades' | 'transactions',
  extra?: { from_date?: string; to_date?: string },
): Promise<FlexFetchResponse & TransactionsFetchResponse> {
  return pluginPost('/flex/ingest/trigger', { kind, ...(extra ?? {}) })
}

export async function pluginFlexUploadXml(xml: string): Promise<FlexUploadResponse> {
  return pluginPost('/flex/ingest/upload-xml', { xml })
}

export async function pluginFlexWriteConfig(
  hostToken: string | null | undefined,
  secondaryToken: string | null | undefined,
  accounts: FlexAccountItem[],
  flexDefaultRangeDays?: number | null,
  flexInitRangeDays?: number | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(flexQueryPluginUrl('/flex/config/write'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      }),
    })
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; detail?: string }
    if (!res.ok) {
      return { ok: false, error: pluginErrorMessage(j, res.statusText) }
    }
    return { ...j, ok: j.ok !== false }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
