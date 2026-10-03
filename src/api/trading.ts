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
import { httpFailure, listItems, requestDelete, requestJson, type DeleteOutcome } from '@/lib/http'
import type { OptionStockLinkBody, OptionStockLinksQueryBody } from '@/types/requestBodies'

/** `OptionStockLinkBody` as the link panels send it: the account and both fills. */
export interface OptionStockLinkCreate extends OptionStockLinkBody {
  account_id: string
  option_account_executions_id: number
  stock_account_executions_id: number
}

/**
 * Checks the body the API sent, before it is unwrapped into `{ items }`, so a
 * body without `items` reads as drift rather than as an empty book.
 */
const validateExecutions = withValidation<ExecutionsWire>(ExecutionsWireSchema, 'trading/executions')

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
  return { items: listItems(raw) }
}

/** GET /executions/position-attribution → `{ items, count }`. */
export async function fetchPositionAttribution(
  accountId?: string,
  secType?: string,
): Promise<PositionAttributionResponse> {
  const params = new URLSearchParams()
  if (accountId?.trim()) params.set('account_id', accountId.trim())
  if (secType?.trim()) params.set('sec_type', secType.trim())
  const qs = params.toString()
  const raw = await requestJson(tradingUrl(`/executions/position-attribution${qs ? `?${qs}` : ''}`))
  return { items: listItems(raw) }
}

/** A refusal throws with the server's reason (400/404/500/503 from api 0.2.2). */
export function createExecution(
  body: CreateExecutionBody,
): Promise<{ ok: boolean; account_executions_id?: number | null; error?: string }> {
  return requestJson(tradingUrl('/executions'), { method: 'POST', body })
}

/**
 * The fill's own columns (time, price, quantity …) — the manual edit in
 * `ExecutionFormModal`. Stays on PUT: api 0.3.0 has no PATCH for them, only for
 * the attribution (`patchExecutionAttribution`), which every other caller uses.
 * Never throws for a refusal: callers read `{ ok, error }`; `error` is the server's reason.
 */
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

/** What PATCH /executions/{id}/attribution changes; `null` clears an id, `[]` removes the split. */
export interface ExecutionAttributionPatch {
  strategy_opportunity_id?: number | null
  strategy_instance_id?: number | null
  instance_allocations?: { strategy_instance_id: number; allocated_quantity: number }[]
}

/** The execution's attribution as the PATCH answers it. */
export interface ExecutionAttribution {
  account_executions_id: number
  account_id: string | null
  strategy_opportunity_id: number | null
  strategy_instance_id: number | null
  instance_allocations: {
    strategy_instance_id: number
    allocated_quantity: number
    strategy_opportunity_id: number | null
    strategy_instance_label?: string
  }[]
}

/**
 * Attribute a fill to a trade (api 0.3.0, the successor of the attribution-only
 * PUT). A fill is attributed one way or the other: setting an id on a fill that
 * is split across trades is refused (409) unless the same patch sends
 * `instance_allocations: []`, which removes the split. An instance on another
 * account is 400. Never throws for a refusal: `{ ok: false, error }` carries
 * the server's reason.
 */
export async function patchExecutionAttribution(
  id: number,
  patch: ExecutionAttributionPatch,
): Promise<{ ok: true; attribution: ExecutionAttribution } | { ok: false; error: string }> {
  try {
    const attribution = await requestJson<ExecutionAttribution>(tradingUrl(`/executions/${id}/attribution`), {
      method: 'PATCH',
      body: patch,
    })
    return { ok: true, attribution }
  } catch (e) {
    return { ok: false, error: httpFailure(e) }
  }
}

/**
 * A fill already gone resolves as `deleted: 'gone'`. Refused with the server's
 * reason: 409 while an option/stock link names it (unlink first).
 */
export function deleteExecution(id: number): Promise<DeleteOutcome> {
  return requestDelete(tradingUrl(`/executions/${id}`))
}

export async function fetchInstancePerformance(instanceId: number): Promise<PerformanceResponse> {
  return requestJson<PerformanceResponse>(tradingUrl(`/performance?strategy_instance_id=${instanceId}&summary_only=true`), { label: `Trading /performance [${instanceId}]` })
}

export async function fetchInstanceExecutions(instanceId: number): Promise<RawExecutionsResponse> {
  const raw = validateExecutions(
    await requestJson(
      tradingUrl(`/executions?strategy_instance_id=${instanceId}&source_scope=performance_book&limit=500`),
    ),
  )
  return { ...raw, executions: listItems(raw) }
}

export async function fetchPerformance(params: PerformanceParams = {}): Promise<PerformanceResponse> {
  const qs = new URLSearchParams()
  if (params.from_ts != null) qs.set('from_ts', String(params.from_ts))
  if (params.to_ts != null) qs.set('to_ts', String(params.to_ts))
  if (params.account_id) qs.set('account_id', params.account_id)
  if (params.granularity) qs.set('granularity', params.granularity)
  if (params.strategy_opportunity_id != null)
    qs.set('strategy_opportunity_id', String(params.strategy_opportunity_id))
  if (params.strategy_instance_id != null)
    qs.set('strategy_instance_id', String(params.strategy_instance_id))
  if (params.source_scope) qs.set('source_scope', params.source_scope)
  if (params.summary_only) qs.set('summary_only', 'true')
  return requestJson<PerformanceResponse>(tradingUrl(`/performance?${qs}`), { label: `Trading /performance` })
}

export async function fetchExecutionsRange(params: ExecutionsRangeParams = {}): Promise<ExecutionsResponse> {
  const qs = new URLSearchParams()
  if (params.from_ts != null) qs.set('from_ts', String(params.from_ts))
  if (params.to_ts != null) qs.set('to_ts', String(params.to_ts))
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.include_opt_pairs) qs.set('include_opt_pairs', 'true')
  if (params.strategy_opportunity_id != null)
    qs.set('strategy_opportunity_id', String(params.strategy_opportunity_id))
  if (params.strategy_instance_id != null)
    qs.set('strategy_instance_id', String(params.strategy_instance_id))
  if (params.source_scope) qs.set('source_scope', params.source_scope)
  if (params.account_id) qs.set('account_id', params.account_id)
  const raw = validateExecutions(await requestJson(tradingUrl(`/executions?${qs}`)))
  return { items: listItems(raw) }
}

export async function getTransactions(params?: {
  from_ts?: number
  to_ts?: number
  account_id?: string
  limit?: number
}): Promise<AccountTransactionsResponse> {
  const qs = new URLSearchParams()
  if (params?.from_ts != null) qs.set('from_ts', String(params.from_ts))
  if (params?.to_ts != null) qs.set('to_ts', String(params.to_ts))
  if (params?.account_id) qs.set('account_id', params.account_id)
  if (params?.limit != null) qs.set('limit', String(params.limit))
  const raw = await requestJson<AccountTransactionsResponse>(tradingUrl(`/transactions?${qs}`))
  return { ...raw, transactions: listItems(raw) }
}

/** 400 (bad batches) / 503 (no database) throw with the server's reason. */
export function postOptionStockLinksQuery(batches: OptionStockLinkBatch[]): Promise<OptionStockLinksResponse> {
  const body: OptionStockLinksQueryBody = { batches }
  return requestJson(tradingUrl('/executions/option-stock-links/query'), { method: 'POST', body })
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
      links: listItems<OptionStockLink>(j),
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
  /** YYYY-MM-DD bounds on the stock fill's trade_date (api 0.6.6, TD-51). */
  from_date?: string
  to_date?: string
  limit?: number
}): Promise<{
  executions: Execution[]
  underlying_symbol?: string
  /** The window read, YYYY-MM-DD (api 0.6.7 also sends it as `from_date` / `to_date`). */
  from_date?: string
  to_date?: string
  error?: string
}> {
  const q = new URLSearchParams()
  q.set('account_id', params.account_id.trim())
  q.set('option_account_executions_id', String(params.option_account_executions_id))
  if (params.from_date?.trim()) q.set('from_date', params.from_date.trim())
  if (params.to_date?.trim()) q.set('to_date', params.to_date.trim())
  if (params.limit != null) q.set('limit', String(params.limit))
  try {
    const j = await requestJson<{
      underlying_symbol?: string
      from_date?: string
      to_date?: string
      error?: string | null
    }>(tradingUrl(`/executions/stock-link-candidates?${q}`))
    return {
      executions: listItems<Execution>(j),
      underlying_symbol: j.underlying_symbol,
      from_date: j.from_date,
      to_date: j.to_date,
      error: j.error ?? undefined,
    }
  } catch (e) {
    return { executions: [], error: httpFailure(e) }
  }
}

/** Never throws for a refusal: `{ ok: false, error }` with the server's reason (400/404/409/500/503). */
/** The new link's id is read under the table's name (api 0.6.7, TD-57). */
export async function createOptionStockLink(body: OptionStockLinkCreate): Promise<{
  ok: boolean
  account_execution_option_stock_link_id?: number | null
  error?: string
  warning?: string | null
}> {
  try {
    const j = await requestJson<{ account_execution_option_stock_link_id?: number | null; warning?: string | null }>(
      tradingUrl('/executions/option-stock-links'),
      { method: 'POST', body },
    )
    return { ok: true, account_execution_option_stock_link_id: j.account_execution_option_stock_link_id, warning: j.warning ?? null }
  } catch (e) {
    return { ok: false, account_execution_option_stock_link_id: null, error: httpFailure(e), warning: null }
  }
}

/**
 * Never throws for a refusal: `{ ok: false, error }` with the server's reason.
 * A link already gone (404 naming it) is `ok` — what the caller wanted is true.
 */
export async function deleteOptionStockLink(
  linkId: number,
  accountId: string,
): Promise<{ ok: boolean; error?: string }> {
  const q = new URLSearchParams()
  q.set('account_id', accountId.trim())
  try {
    await requestDelete(tradingUrl(`/executions/option-stock-links/${linkId}?${q}`))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: httpFailure(e) }
  }
}

