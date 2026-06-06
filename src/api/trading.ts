import { postControlShutdown } from '@/api/apiControl'
import type {
  ExecutionsFreshnessResponse,
  TwsFetchResponse,
  FlexFetchResponse,
  FlexUploadResponse,
  PerformanceResponse,
  PerformanceParams,
  ExecutionsRangeParams,
  RawExecutionsResponse,
  OptionStockLinkBatch,
  OptionStockLinksResponse,
  AccountTransactionsResponse,
  TransactionsFetchResponse,
} from '@/types/trading'
import type {
  ExecutionsResponse,
  PositionAttributionResponse,
  CreateExecutionBody,
  UpdateExecutionBody,
} from '@/types/positions'
import { withValidation } from '@/lib/apiValidation'
import { ExecutionsResponseSchema } from '@/lib/schemas/positions'

const BASE = import.meta.env.VITE_API_TRADING as string

const validateExecutions = withValidation<ExecutionsResponse>(ExecutionsResponseSchema, 'trading/executions')

export async function fetchExecutionsFreshness(): Promise<ExecutionsFreshnessResponse> {
  const res = await fetch(`${BASE}/executions/freshness`)
  if (!res.ok) throw new Error(`Trading /executions/freshness: ${res.status}`)
  return res.json() as Promise<ExecutionsFreshnessResponse>
}

export async function postTwsFetch(days: 1 | 3 | 7): Promise<TwsFetchResponse> {
  const res = await fetch(`${BASE}/executions/fetch?days=${days}`, { method: 'POST' })
  if (!res.ok) throw new Error(`Trading /executions/fetch: ${res.status}`)
  return res.json() as Promise<TwsFetchResponse>
}

export async function postFlexFetch(): Promise<FlexFetchResponse> {
  const res = await fetch(`${BASE}/executions/fetch-flex`, { method: 'POST' })
  if (!res.ok) throw new Error(`Trading /executions/fetch-flex: ${res.status}`)
  return res.json() as Promise<FlexFetchResponse>
}

export async function postFlexUpload(xml: string): Promise<FlexUploadResponse> {
  const res = await fetch(`${BASE}/executions/fetch-flex-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xml }),
  })
  if (!res.ok) throw new Error(`Trading /executions/fetch-flex-upload: ${res.status}`)
  return res.json() as Promise<FlexUploadResponse>
}

export async function fetchExecutions(source: 'final' | 'tws' | 'canonical' = 'final'): Promise<ExecutionsResponse> {
  // Backend uses source_scope; map our internal alias to the correct backend value
  const scopeMap: Record<string, string> = { final: 'performance_book', tws: 'tws_raw', canonical: '' }
  const scope = scopeMap[source] ?? ''
  const url = scope ? `${BASE}/executions?limit=0&source_scope=${scope}` : `${BASE}/executions?limit=0`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Trading /executions (${source}): ${res.status}`)
  const raw = await res.json() as { executions?: import('@/types/positions').Execution[] }
  return validateExecutions({ items: raw.executions ?? [] })
}

/** Legacy: GET /executions/position-attribution → { attributions: PositionInstanceAttribution[] } */
export async function fetchPositionAttribution(
  accountId?: string,
  secType?: string,
): Promise<PositionAttributionResponse> {
  const params = new URLSearchParams()
  if (accountId?.trim()) params.set('account_id', accountId.trim())
  if (secType?.trim()) params.set('sec_type', secType.trim())
  const qs = params.toString()
  const res = await fetch(`${BASE}/executions/position-attribution${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error(`Trading /executions/position-attribution: ${res.status}`)
  const raw = (await res.json()) as {
    items?: PositionAttributionResponse['items']
    attributions?: PositionAttributionResponse['items']
  }
  return { items: raw.attributions ?? raw.items ?? [] }
}

export async function createExecution(body: CreateExecutionBody): Promise<{ ok: boolean; id?: number; error?: string }> {
  const res = await fetch(`${BASE}/executions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST /executions: ${res.status}`)
  return res.json()
}

export async function updateExecution(
  id: number,
  body: UpdateExecutionBody,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/executions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = (await res.json().catch(() => ({}))) as {
    ok?: boolean
    error?: string
    detail?: string | { msg?: string }[]
  }
  const detail = j.detail
  const detailMsg =
    typeof detail === 'string'
      ? detail
      : Array.isArray(detail) && detail[0] && typeof detail[0] === 'object' && 'msg' in detail[0]
        ? String(detail[0].msg)
        : undefined
  const ok = Boolean(j.ok) && res.ok
  const error = j.error ?? detailMsg ?? (!res.ok ? `${res.status} ${res.statusText}`.trim() : undefined)
  return { ok, error }
}

export async function deleteExecution(id: number): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/executions/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE /executions/${id}: ${res.status}`)
  return res.json()
}

export async function fetchInstancePerformance(instanceId: number): Promise<PerformanceResponse> {
  const res = await fetch(`${BASE}/performance?strategy_instance_id=${instanceId}&summary_only=true`)
  if (!res.ok) throw new Error(`Trading /performance [${instanceId}]: ${res.status}`)
  return res.json() as Promise<PerformanceResponse>
}

export async function fetchInstanceExecutions(instanceId: number): Promise<RawExecutionsResponse> {
  const res = await fetch(
    `${BASE}/executions?strategy_instance_id=${instanceId}&source_scope=performance_book&limit=500`,
  )
  if (!res.ok) throw new Error(`Trading /executions [${instanceId}]: ${res.status}`)
  return res.json() as Promise<RawExecutionsResponse>
}

export async function fetchPerformance(params: PerformanceParams = {}): Promise<PerformanceResponse> {
  const qs = new URLSearchParams()
  if (params.since_ts != null) qs.set('since_ts', String(params.since_ts))
  if (params.until_ts != null) qs.set('until_ts', String(params.until_ts))
  if (params.account_id) qs.set('account_id', params.account_id)
  if (params.granularity) qs.set('granularity', params.granularity)
  if (params.strategy_opportunity_id != null)
    qs.set('strategy_opportunity_id', String(params.strategy_opportunity_id))
  if (params.strategy_instance_id != null)
    qs.set('strategy_instance_id', String(params.strategy_instance_id))
  if (params.source_scope) qs.set('source_scope', params.source_scope)
  if (params.summary_only) qs.set('summary_only', 'true')
  const res = await fetch(`${BASE}/performance?${qs}`)
  if (!res.ok) throw new Error(`Trading /performance: ${res.status}`)
  return res.json() as Promise<PerformanceResponse>
}

export async function fetchExecutionsRange(params: ExecutionsRangeParams = {}): Promise<ExecutionsResponse> {
  const qs = new URLSearchParams()
  if (params.since_ts != null) qs.set('since_ts', String(params.since_ts))
  if (params.until_ts != null) qs.set('until_ts', String(params.until_ts))
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.include_opt_pairs) qs.set('include_opt_pairs', 'true')
  if (params.strategy_opportunity_id != null)
    qs.set('strategy_opportunity_id', String(params.strategy_opportunity_id))
  if (params.strategy_instance_id != null)
    qs.set('strategy_instance_id', String(params.strategy_instance_id))
  if (params.source_scope) qs.set('source_scope', params.source_scope)
  if (params.account_id) qs.set('account_id', params.account_id)
  const res = await fetch(`${BASE}/executions?${qs}`)
  if (!res.ok) throw new Error(`Trading /executions range: ${res.status}`)
  const json = await res.json() as { executions?: import('@/types/positions').Execution[] }
  return { items: json.executions ?? [] }
}

export async function getTransactions(params?: {
  since_ts?: number
  until_ts?: number
  account_id?: string
  limit?: number
}): Promise<AccountTransactionsResponse> {
  const qs = new URLSearchParams()
  if (params?.since_ts != null) qs.set('since_ts', String(params.since_ts))
  if (params?.until_ts != null) qs.set('until_ts', String(params.until_ts))
  if (params?.account_id) qs.set('account_id', params.account_id)
  if (params?.limit != null) qs.set('limit', String(params.limit))
  const res = await fetch(`${BASE}/transactions?${qs}`)
  if (!res.ok) throw new Error(`Trading /transactions: ${res.status}`)
  return res.json() as Promise<AccountTransactionsResponse>
}

export async function postTransactionsFetch(body?: {
  from_date?: string
  to_date?: string
}): Promise<TransactionsFetchResponse> {
  const res = await fetch(`${BASE}/transactions/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`POST /transactions/fetch: ${res.status}`)
  return res.json() as Promise<TransactionsFetchResponse>
}

export async function postOptionStockLinksQuery(
  batches: OptionStockLinkBatch[],
): Promise<OptionStockLinksResponse> {
  const res = await fetch(`${BASE}/executions/option-stock-links/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batches }),
  })
  if (!res.ok) throw new Error(`POST /option-stock-links/query: ${res.status}`)
  return res.json() as Promise<OptionStockLinksResponse>
}

export async function fetchOptionStockLinks(
  accountId: string,
  optionAccountExecutionsId: number,
): Promise<{ links: import('@/types/trading').OptionStockLink[]; slippage_total: number | null; error?: string }> {
  const q = new URLSearchParams()
  q.set('account_id', accountId.trim())
  q.set('option_account_executions_id', String(optionAccountExecutionsId))
  const res = await fetch(`${BASE}/executions/option-stock-links?${q}`)
  const j = (await res.json().catch(() => ({}))) as {
    links?: import('@/types/trading').OptionStockLink[]
    slippage_total?: number | null
    error?: string
  }
  if (!res.ok) {
    return { links: [], slippage_total: null, error: j.error ?? res.statusText }
  }
  return {
    links: j.links ?? [],
    slippage_total: j.slippage_total ?? null,
    error: j.error,
  }
}

export async function fetchStockLinkCandidates(params: {
  account_id: string
  option_account_executions_id: number
  trade_date_from?: string
  trade_date_to?: string
  limit?: number
}): Promise<{
  executions: import('@/types/positions').Execution[]
  underlying_symbol?: string
  trade_date_from?: string
  trade_date_to?: string
  error?: string
}> {
  const q = new URLSearchParams()
  q.set('account_id', params.account_id.trim())
  q.set('option_account_executions_id', String(params.option_account_executions_id))
  if (params.trade_date_from?.trim()) q.set('trade_date_from', params.trade_date_from.trim())
  if (params.trade_date_to?.trim()) q.set('trade_date_to', params.trade_date_to.trim())
  if (params.limit != null) q.set('limit', String(params.limit))
  const res = await fetch(`${BASE}/executions/stock-link-candidates?${q}`)
  const j = (await res.json().catch(() => ({}))) as {
    executions?: import('@/types/positions').Execution[]
    underlying_symbol?: string
    trade_date_from?: string
    trade_date_to?: string
    error?: string
  }
  if (!res.ok) {
    return { executions: [], error: j.error ?? res.statusText }
  }
  return {
    executions: j.executions ?? [],
    underlying_symbol: j.underlying_symbol,
    trade_date_from: j.trade_date_from,
    trade_date_to: j.trade_date_to,
    error: j.error,
  }
}

export async function createOptionStockLink(body: {
  account_id: string
  option_account_executions_id: number
  stock_account_executions_id: number
  role?: string | null
  note?: string | null
}): Promise<{ ok: boolean; link_id?: number | null; error?: string; warning?: string | null }> {
  const res = await fetch(`${BASE}/executions/option-stock-links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = (await res.json().catch(() => ({}))) as {
    ok?: boolean
    link_id?: number | null
    error?: string
    warning?: string | null
  }
  return {
    ok: Boolean(j.ok) && res.ok,
    link_id: j.link_id,
    error: j.error,
    warning: j.warning ?? null,
  }
}

export async function deleteOptionStockLink(
  linkId: number,
  accountId: string,
): Promise<{ ok: boolean; error?: string }> {
  const q = new URLSearchParams()
  q.set('account_id', accountId.trim())
  const res = await fetch(`${BASE}/executions/option-stock-links/${linkId}?${q}`, { method: 'DELETE' })
  const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  return { ok: Boolean(j.ok) && res.ok, error: j.error }
}

export async function postTradingShutdown(
  serviceOrigin?: string,
): Promise<{ ok: boolean; error?: string }> {
  const base = (serviceOrigin ?? BASE).replace(/\/$/, '')
  return postControlShutdown(`${base}/trading/shutdown`)
}
