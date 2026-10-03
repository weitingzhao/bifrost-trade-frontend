import type { OptionSnapshotRow, OptionSnapshotsPgResult, GreeksCoverageResponse, LiquiditySummaryResponse, RelativeValueResponse } from '@/types/optionDiscovery'
import { withValidation } from '@/lib/apiValidation'
import { OptionSnapshotsPgResponseSchema } from '@/lib/schemas/optionDiscovery'

import { marketDataPluginUrl, tradeResearchUrl } from '@/lib/devApiUrl'
import { httpFailure, reasonOf, requestJson } from '@/lib/http'

type Refusal = { ok: false; error: string }

/** The body of a Trade research read, or `{ ok: false, error }` with the server's reason. A network error still throws. */
async function readOrRefusal<T extends object>(url: string, label: string): Promise<T | Refusal> {
  try {
    return await requestJson<T>(url, { label })
  } catch (e) {
    return { ok: false, error: httpFailure(e) }
  }
}

function isRefusal(v: object): v is Refusal {
  return 'ok' in v && v.ok === false && 'error' in v
}

/** What GET /research/option-snapshots sends, before rows are mapped. */
interface SnapshotsWire {
  symbol?: string
  expiration?: string
  underlying_price?: unknown
  rows?: Record<string, unknown>[]
  warning?: unknown
}

function mapSnapshotRow(row: Record<string, unknown>): OptionSnapshotRow {
  return {
    strike: Number(row.strike),
    right: String(row.right ?? ''),
    snapshot_ts: typeof row.snapshot_ts === 'string' ? row.snapshot_ts : null,
    mark: row.mark != null && Number.isFinite(Number(row.mark)) ? Number(row.mark) : null,
    bid: row.bid != null && Number.isFinite(Number(row.bid)) ? Number(row.bid) : null,
    ask: row.ask != null && Number.isFinite(Number(row.ask)) ? Number(row.ask) : null,
    last: row.last != null && Number.isFinite(Number(row.last)) ? Number(row.last) : null,
    mid: row.mid != null && Number.isFinite(Number(row.mid)) ? Number(row.mid) : null,
    iv: row.iv != null && Number.isFinite(Number(row.iv)) ? Number(row.iv) : null,
    delta: row.delta != null && Number.isFinite(Number(row.delta)) ? Number(row.delta) : null,
    gamma: row.gamma != null && Number.isFinite(Number(row.gamma)) ? Number(row.gamma) : null,
    theta: row.theta != null && Number.isFinite(Number(row.theta)) ? Number(row.theta) : null,
    vega: row.vega != null && Number.isFinite(Number(row.vega)) ? Number(row.vega) : null,
    open_interest:
      row.open_interest != null && Number.isFinite(Number(row.open_interest))
        ? Number(row.open_interest)
        : null,
    underlying_ticker: typeof row.underlying_ticker === 'string' ? row.underlying_ticker : null,
    day_open: row.day_open != null && Number.isFinite(Number(row.day_open)) ? Number(row.day_open) : null,
    day_high: row.day_high != null && Number.isFinite(Number(row.day_high)) ? Number(row.day_high) : null,
    day_low: row.day_low != null && Number.isFinite(Number(row.day_low)) ? Number(row.day_low) : null,
    day_close: row.day_close != null && Number.isFinite(Number(row.day_close)) ? Number(row.day_close) : null,
    day_previous_close:
      row.day_previous_close != null && Number.isFinite(Number(row.day_previous_close))
        ? Number(row.day_previous_close)
        : null,
    day_change:
      row.day_change != null && Number.isFinite(Number(row.day_change)) ? Number(row.day_change) : null,
    day_change_percent:
      row.day_change_percent != null && Number.isFinite(Number(row.day_change_percent))
        ? Number(row.day_change_percent)
        : null,
    day_volume:
      row.day_volume != null && Number.isFinite(Number(row.day_volume)) ? Number(row.day_volume) : null,
    day_vwap: row.day_vwap != null && Number.isFinite(Number(row.day_vwap)) ? Number(row.day_vwap) : null,
    day_last_updated: typeof row.day_last_updated === 'string' ? row.day_last_updated : null,
    day_last_updated_day:
      typeof row.day_last_updated_day === 'string' ? row.day_last_updated_day : null,
  }
}

export async function fetchOptionSnapshotsPg(
  symbol: string,
  expiration: string,
  strikesCsv?: string,
  source: 'massive' | 'ib' = 'massive',
): Promise<OptionSnapshotsPgResult> {
  const s = (symbol || '').trim()
  const e = (expiration || '').trim()
  const q = new URLSearchParams({ symbol: s, expiration: e, source })
  if (strikesCsv?.trim()) q.set('strikes', strikesCsv.trim())
  // api 0.5.0: a refusal is its status with `{ detail }` (TD-16); only a success is checked for shape.
  const j = await readOrRefusal<SnapshotsWire>(`${tradeResearchUrl('/research/option-snapshots')}?${q.toString()}`, 'GET /research/option-snapshots')
  if (isRefusal(j)) return { symbol: s, expiration: e, rows: [], error: j.error }
  withValidation(OptionSnapshotsPgResponseSchema, 'fetchOptionSnapshotsPg')(j)
  const rows: OptionSnapshotRow[] = Array.isArray(j.rows)
    ? j.rows.map((row) => mapSnapshotRow(row))
    : []
  return {
    symbol: j.symbol ?? s,
    expiration: j.expiration ?? e,
    ...(j.underlying_price != null && Number.isFinite(Number(j.underlying_price))
      ? { underlying_price: Number(j.underlying_price) }
      : {}),
    rows,
    error: reasonOf(j) ?? undefined,
    warning: typeof j.warning === 'string' ? j.warning : undefined,
  }
}

export async function fetchGreeksCoverage(
  symbol: string,
  expiration?: string,
  source: 'massive' | 'ib' = 'massive',
): Promise<GreeksCoverageResponse> {
  void source
  const s = (symbol || '').trim()
  if (!s) return { ok: false, error: 'symbol is required' }
  const q = new URLSearchParams({ symbol: s })
  const j = await readOrRefusal<{ rows?: Record<string, unknown>[] }>(
    `${marketDataPluginUrl('/market/coverage/greeks')}?${q.toString()}`,
    'Market Data Plugin /market/coverage/greeks',
  )
  if (isRefusal(j)) return { ok: false, error: j.error }
  const rows = Array.isArray(j.rows) ? j.rows : []
  const row =
    (rows.find(
      (x: Record<string, unknown>) => String(x.symbol ?? '').toUpperCase() === s.toUpperCase(),
    ) as Record<string, unknown> | undefined) ??
    (rows[0] as Record<string, unknown> | undefined)
  if (!row) {
    return {
      ok: true,
      symbol: s,
      expiration: expiration?.trim() || undefined,
      source: 'plugin',
      total: 0,
      coverage: {},
      freshness: { oldest_ts: null, newest_ts: null, stale_rows: 0 },
    }
  }
  const total = Number(row.total_contracts ?? 0)
  const withIv = Number(row.with_iv ?? 0)
  const withDelta = Number(row.with_delta ?? 0)
  const withFull = Number(row.with_full_greeks ?? 0)
  const newest =
    row.newest_ts != null
      ? typeof row.newest_ts === 'string'
        ? row.newest_ts
        : String(row.newest_ts)
      : null
  return {
    ok: true,
    symbol: typeof row.symbol === 'string' ? row.symbol : s,
    expiration: expiration?.trim() || undefined,
    source: 'plugin',
    total,
    coverage: {
      iv: withIv,
      delta: withDelta,
      full_greeks: withFull,
    },
    freshness: {
      oldest_ts: null,
      newest_ts: newest,
      stale_rows: 0,
    },
  }
}

export async function fetchLiquiditySummary(
  symbol: string,
  expiration: string,
  strike: number,
  right: string,
  source: 'massive' | 'ib' = 'massive',
): Promise<LiquiditySummaryResponse> {
  const q = new URLSearchParams({
    symbol: (symbol || '').trim(),
    expiration: (expiration || '').trim(),
    strike: String(strike),
    right: (right || '').trim(),
    source,
  })
  const r = await readOrRefusal<LiquiditySummaryResponse>(
    `${tradeResearchUrl('/research/option-contract/liquidity-summary')}?${q.toString()}`,
    'GET /research/option-contract/liquidity-summary',
  )
  const j: Partial<LiquiditySummaryResponse> & { error?: string } = r
  return {
    ok: Boolean(j.ok),
    symbol: j.symbol,
    expiration: j.expiration,
    strike: j.strike,
    right: j.right,
    source: j.source,
    spread_pct: j.spread_pct ?? null,
    spread_percentile: j.spread_percentile ?? null,
    oi: j.oi ?? null,
    oi_percentile: j.oi_percentile ?? null,
    contracts_compared: j.contracts_compared,
    snapshot_ts: j.snapshot_ts ?? null,
    error: reasonOf(j) ?? undefined,
  }
}

export async function fetchRelativeValue(
  symbol: string,
  expiration: string,
  strike: number,
  right: string,
  source: 'massive' | 'ib' = 'massive',
): Promise<RelativeValueResponse> {
  const q = new URLSearchParams({
    symbol: (symbol || '').trim(),
    expiration: (expiration || '').trim(),
    strike: String(strike),
    right: (right || '').trim(),
    source,
  })
  const r = await readOrRefusal<RelativeValueResponse>(
    `${tradeResearchUrl('/research/option-contract/relative-value')}?${q.toString()}`,
    'GET /research/option-contract/relative-value',
  )
  const j: Partial<RelativeValueResponse> & { error?: string } = r
  return {
    ok: Boolean(j.ok),
    label: j.label ?? null,
    iv_zscore: j.iv_zscore ?? null,
    this_iv: j.this_iv ?? null,
    avg_iv: j.avg_iv ?? null,
    std_iv: j.std_iv ?? null,
    contracts_compared: j.contracts_compared,
    iv_curve: Array.isArray(j.iv_curve) ? j.iv_curve : undefined,
    error: reasonOf(j) ?? undefined,
  }
}

