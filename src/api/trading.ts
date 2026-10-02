import type {
  ExecutionsFreshnessResponse,
  TwsFetchResponse,
  PerformanceResponse,
  PerformanceParams,
  ExecutionsRangeParams,
  ExecutionSourceScope,
  RawExecutionsResponse,
  OptionStockLinkBatch,
  OptionStockLinksResponse,
  AccountTransactionsResponse,
  OptionStockLink,
} from '@/types/trading'
import type {
  ExecutionsResponse,
  PositionAttributionResponse,
  CreateExecutionBody,
  UpdateExecutionBody,
  Execution,
} from '@/types/positions'
import { withValidation } from '@/lib/apiValidation'
import { ExecutionsWireSchema, type ExecutionsWire } from '@/lib/schemas/positions'
import { tradingUrl } from '@/lib/devApiUrl'
import { tradeFetch } from '@/lib/tradeFetch'
import { httpFailure, listItems, requestJson } from '@/lib/http'

/**
 * Checks the body the API sent, before it is unwrapped into `{ items }`, so a
 * missing `executions` key reads as drift rather than as an empty book.
 */
const validateExecutions = withValidation<Partial<ExecutionsWire>>(ExecutionsWireSchema, 'trading/executions')
const validateInstanceExecutions = withValidation<RawExecutionsResponse>(ExecutionsWireSchema, 'trading/executions')

export function fetchExecutionsFreshness(): Promise<ExecutionsFreshnessResponse> {
  return requestJson(tradingUrl('/executions/freshness'))
}

/**
 * Gateway trouble, a stopped monitor or a failed write throws with the
 * server's reason (503/500 from api 0.2.2; 200 `{ ok: false, error }` before).
 */
export function postTwsFetch(days: 1 | 3 | 7): Promise<TwsFetchResponse> {
  return requestJson(tradingUrl(`/executions/fetch?days=${days}`), { method: 'POST' })
}

export async function fetchExecutions(scope: ExecutionSourceScope = 'performance_book'): Promise<ExecutionsResponse> {
  const url =
    scope === 'all'
      ? tradingUrl('/executions?limit=0')
      : tradingUrl(`/executions?limit=0&source_scope=${scope}`)
  const raw = validateExecutions(await requestJson(url))
  return { items: listItems(raw, 'executions') }
}

/** GET /executions/position-attribution → `{ items, count, attributions }` (`attributions` until api 0.2.3). */
export async function fetchPositionAttribution(
  accountId?: string,
  secType?: string,
): Promise<PositionAttributionResponse> {
  const params = new URLSearchParams()
  if (accountId?.trim()) params.set('account_id', accountId.trim())
  if (secType?.trim()) params.set('sec_type', secType.trim())
  const qs = params.toString()
  const raw = await requestJson(tradingUrl(`/executions/position-attribution${qs ? `?${qs}` : ''}`))
  return { items: listItems(raw, 'attributions') }
}

/** A refusal throws with the server's reason (400/404/500/503 from api 0.2.2). */
export function createExecution(
  body: CreateExecutionBody,
): Promise<{ ok: boolean; account_executions_id?: number | null; error?: string }> {
  return requestJson(tradingUrl('/executions'), { method: 'POST', body })
}

/** Never throws for a refusal: callers read `{ ok, error }`; `error` is the server's reason. */
export async function updateExecution(
  id: number,
  body: UpdateExecutionBody,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requestJson(tradingUrl(`/executions/${id}`), { method: 'PUT', body })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: httpFailure(e) }
  }
}

export function deleteExecution(id: number): Promise<{ ok: boolean; error?: string }> {
  return requestJson(tradingUrl(`/executions/${id}`), { method: 'DELETE' })
}

export async function fetchInstancePerformance(instanceId: number): Promise<PerformanceResponse> {
  const res = await tradeFetch(tradingUrl(`/performance?strategy_instance_id=${instanceId}&summary_only=true`))
  if (!res.ok) throw new Error(`Trading /performance [${instanceId}]: ${res.status}`)
  return res.json() as Promise<PerformanceResponse>
}

export async function fetchInstanceExecutions(instanceId: number): Promise<RawExecutionsResponse> {
  const raw = validateInstanceExecutions(
    await requestJson(
      tradingUrl(`/executions?strategy_instance_id=${instanceId}&source_scope=performance_book&limit=500`),
    ),
  )
  return { ...raw, executions: listItems(raw, 'executions') }
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
  const res = await tradeFetch(tradingUrl(`/performance?${qs}`))
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
  const raw = validateExecutions(await requestJson(tradingUrl(`/executions?${qs}`)))
  return { items: listItems(raw, 'executions') }
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
  const raw = await requestJson<AccountTransactionsResponse>(tradingUrl(`/transactions?${qs}`))
  return { ...raw, transactions: listItems(raw, 'transactions') }
}

/** 400 (bad batches) / 503 (no database) throw with the server's reason. */
export function postOptionStockLinksQuery(batches: OptionStockLinkBatch[]): Promise<OptionStockLinksResponse> {
  return requestJson(tradingUrl('/executions/option-stock-links/query'), { method: 'POST', body: { batches } })
}

/**
 * Never throws for a refusal: the link panels print `error`. api 0.2.1 sent
 * a failure as 200 `{ links: [], error }`, so a 2xx `error` is still read.
 */
export async function fetchOptionStockLinks(
  accountId: string,
  optionAccountExecutionsId: number,
): Promise<{ links: OptionStockLink[]; slippage_total: number | null; error?: string }> {
  const q = new URLSearchParams()
  q.set('account_id', accountId.trim())
  q.set('option_account_executions_id', String(optionAccountExecutionsId))
  try {
    const j = await requestJson<{ slippage_total?: number | null; error?: string | null }>(
      tradingUrl(`/executions/option-stock-links?${q}`),
    )
    return {
      links: listItems<OptionStockLink>(j, 'links'),
      slippage_total: j.slippage_total ?? null,
      error: j.error ?? undefined,
    }
  } catch (e) {
    return { links: [], slippage_total: null, error: httpFailure(e) }
  }
}

/** Never throws for a refusal (see `fetchOptionStockLinks`). */
export async function fetchStockLinkCandidates(params: {
  account_id: string
  option_account_executions_id: number
  trade_date_from?: string
  trade_date_to?: string
  limit?: number
}): Promise<{
  executions: Execution[]
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
  try {
    const j = await requestJson<{
      underlying_symbol?: string
      trade_date_from?: string
      trade_date_to?: string
      error?: string | null
    }>(tradingUrl(`/executions/stock-link-candidates?${q}`))
    return {
      executions: listItems<Execution>(j, 'executions'),
      underlying_symbol: j.underlying_symbol,
      trade_date_from: j.trade_date_from,
      trade_date_to: j.trade_date_to,
      error: j.error ?? undefined,
    }
  } catch (e) {
    return { executions: [], error: httpFailure(e) }
  }
}

/** Never throws for a refusal: `{ ok: false, error }` with the server's reason (400/404/409/500/503). */
export async function createOptionStockLink(body: {
  account_id: string
  option_account_executions_id: number
  stock_account_executions_id: number
  role?: string | null
  note?: string | null
}): Promise<{ ok: boolean; link_id?: number | null; error?: string; warning?: string | null }> {
  try {
    const j = await requestJson<{ link_id?: number | null; warning?: string | null }>(
      tradingUrl('/executions/option-stock-links'),
      { method: 'POST', body },
    )
    return { ok: true, link_id: j.link_id, warning: j.warning ?? null }
  } catch (e) {
    return { ok: false, link_id: null, error: httpFailure(e), warning: null }
  }
}

/** Never throws for a refusal: `{ ok: false, error }` with the server's reason. */
export async function deleteOptionStockLink(
  linkId: number,
  accountId: string,
): Promise<{ ok: boolean; error?: string }> {
  const q = new URLSearchParams()
  q.set('account_id', accountId.trim())
  try {
    await requestJson(tradingUrl(`/executions/option-stock-links/${linkId}?${q}`), { method: 'DELETE' })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: httpFailure(e) }
  }
}

