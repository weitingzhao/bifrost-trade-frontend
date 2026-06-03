import { massiveUrl, researchUrl } from '@/lib/devApiUrl'

export { postMassiveSync } from '@/api/research/optionDiscovery'
export {
  fetchMassiveLastTrade,
  fetchMassiveHistQuotes,
  fetchOptionSnapshotsPg,
  fetchOptionExpirations,
} from '@/api/research/optionDiscovery'

export const MASSIVE_OPTIONS_COVERAGE_PLAN_URL = `${import.meta.env.BASE_URL}plans/massive_api_coverage.html`

export interface CorporateActionRow {
  symbol: string
  action_type: string
  ex_date: string | null
  record_date: string | null
  payment_date: string | null
  ratio_from: number | null
  ratio_to: number | null
  amount: number | null
  description: string | null
  source: string | null
}

export interface ContractsCoverageResponse {
  ok: boolean
  symbol?: string
  expiration?: string
  total?: number
  coverage?: {
    with_massive_ticker?: number
    ticker_pct?: number
    with_complete_identity?: number
    identity_pct?: number
    mapping_mismatch?: number
    with_exercise_style?: number
    exercise_style_pct?: number
    with_shares_per_contract?: number
    shares_per_contract_pct?: number
    optional_data_fill_avg_pct?: number
    distinct_expirations?: number
    distinct_strikes?: number
  }
  freshness?: {
    oldest_ts?: string | null
    newest_ts?: string | null
    stale_rows?: number
  }
  error?: string
}

export async function postMassiveOptionsApiCoverageSync(): Promise<{
  ok: boolean
  error?: string
  source?: string
  target?: string
  size_bytes?: number
}> {
  const r = await fetch(massiveUrl('/research/massive/api-coverage/sync'), { method: 'POST' })
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  return {
    ok: Boolean(j.ok) && r.ok,
    error: typeof j.error === 'string' ? j.error : undefined,
    source: typeof j.source === 'string' ? j.source : undefined,
    target: typeof j.target === 'string' ? j.target : undefined,
    size_bytes: Number.isFinite(Number(j.size_bytes)) ? Number(j.size_bytes) : undefined,
  }
}

export async function fetchContractsCoverage(
  symbol: string,
  expiration?: string,
): Promise<ContractsCoverageResponse> {
  const s = (symbol || '').trim()
  if (!s) return { ok: false, error: 'symbol is required' }
  const q = new URLSearchParams({ symbol: s })
  if (expiration?.trim()) q.set('expiration', expiration.trim())
  const r = await fetch(massiveUrl(`/research/massive/contracts-coverage?${q.toString()}`))
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  return {
    ok: Boolean(j.ok),
    symbol: typeof j.symbol === 'string' ? j.symbol : undefined,
    expiration: typeof j.expiration === 'string' ? j.expiration : undefined,
    total: typeof j.total === 'number' ? j.total : undefined,
    coverage:
      typeof j.coverage === 'object' && j.coverage != null
        ? (j.coverage as ContractsCoverageResponse['coverage'])
        : undefined,
    freshness:
      typeof j.freshness === 'object' && j.freshness != null
        ? (j.freshness as ContractsCoverageResponse['freshness'])
        : undefined,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}

export async function fetchCorporateActions(
  symbol: string,
  options?: { action_type?: string; limit?: number },
): Promise<{ ok: boolean; rows: CorporateActionRow[]; error?: string }> {
  const q = new URLSearchParams({ symbol: (symbol || '').trim() })
  if (options?.action_type) q.set('action_type', options.action_type)
  if (options?.limit != null) q.set('limit', String(options.limit))
  const r = await fetch(massiveUrl(`/research/massive/corporate-actions?${q.toString()}`))
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!j.ok) {
    return {
      ok: false,
      rows: [],
      error: typeof j.error === 'string' ? j.error : 'Request failed',
    }
  }
  const rows: CorporateActionRow[] = Array.isArray(j.rows)
    ? j.rows.map((row: Record<string, unknown>) => ({
        symbol: String(row.symbol ?? ''),
        action_type: String(row.action_type ?? ''),
        ex_date: typeof row.ex_date === 'string' ? row.ex_date : null,
        record_date: typeof row.record_date === 'string' ? row.record_date : null,
        payment_date: typeof row.payment_date === 'string' ? row.payment_date : null,
        ratio_from: row.ratio_from != null ? Number(row.ratio_from) : null,
        ratio_to: row.ratio_to != null ? Number(row.ratio_to) : null,
        amount: row.amount != null ? Number(row.amount) : null,
        description: typeof row.description === 'string' ? row.description : null,
        source: typeof row.source === 'string' ? row.source : null,
      }))
    : []
  return { ok: true, rows }
}

export async function fetchResearchOptionOi(
  symbol: string,
  options?: { limit?: number },
): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  const s = (symbol || '').trim()
  if (!s) return { rows: [], error: 'symbol is required' }
  const q = new URLSearchParams({ symbol: s })
  if (options?.limit != null) q.set('limit', String(options.limit))
  const r = await fetch(`${researchUrl('/research/option-oi')}?${q.toString()}`)
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  const rows = Array.isArray(j.rows) ? (j.rows as Record<string, unknown>[]) : []
  return { rows, error: typeof j.error === 'string' ? j.error : undefined }
}

export async function fetchMassiveHistTrades(
  optionsTicker: string,
  options?: {
    timestamp_gte?: string
    timestamp_lte?: string
    limit?: number
    sort?: string
  },
): Promise<{ ok: boolean; results?: Record<string, unknown>[]; count?: number; error?: string }> {
  const ot = (optionsTicker || '').trim()
  if (!ot) return { ok: false, error: 'options_ticker is required' }
  const q = new URLSearchParams()
  if (options?.timestamp_gte) q.set('timestamp_gte', options.timestamp_gte)
  if (options?.timestamp_lte) q.set('timestamp_lte', options.timestamp_lte)
  if (options?.limit) q.set('limit', String(options.limit))
  if (options?.sort) q.set('order', options.sort)
  const r = await fetch(
    massiveUrl(`/research/massive/trades-quotes/trades/${encodeURIComponent(ot)}?${q.toString()}`),
  )
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (r.status === 403) {
    return { ok: false, error: typeof j.error === 'string' ? j.error : 'Developer tier required' }
  }
  return {
    ok: Boolean(j.ok),
    results: Array.isArray(j.results) ? (j.results as Record<string, unknown>[]) : undefined,
    count: typeof j.count === 'number' ? j.count : undefined,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}
