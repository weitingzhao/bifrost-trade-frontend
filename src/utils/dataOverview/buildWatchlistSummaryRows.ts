import type {
  WatchlistDbCoverageExpirationCache,
  WatchlistDbCoverageOiDaily,
  WatchlistDbCoverageOptionBars,
  WatchlistDbCoverageReportDaily,
  WatchlistDbCoverageSnapshotsWithUd,
  WatchlistDbCoverageStockDay,
  WatchlistDbCoverageStockMin,
  WatchlistDbCoverageSymbolRow,
  WatchlistDbCoverageTickerOverview,
  WatchlistDbCoverageTickerTypes,
  WatchlistDbCoverageTickers,
} from '@/types/watchlistDbCoverage'
import { fmtAgeSeconds, isoAgeSeconds } from '@/utils/dataOverview/coverageSummaryFormat'

export interface WatchlistSummaryRow {
  table: string
  pipeline: string
  coverage: string
  freshness: string
  health: string
}

const SNAPSHOT_STALE_MS = 24 * 60 * 60 * 1000

const EMPTY_BARS: WatchlistDbCoverageOptionBars = {
  has_data: false,
  row_count: null,
  last_bar_time: null,
  last_created_at: null,
  ohlc_complete_pct: null,
  volume_pct: null,
  vwap_pct: null,
  optional_avg_pct: null,
  distinct_expirations: null,
  distinct_contracts: null,
}

const EMPTY_SUV: WatchlistDbCoverageSnapshotsWithUd = {
  has_data: false,
  row_count: null,
  last_snapshot_ts: null,
  last_created_at: null,
}

const EMPTY_OEC: WatchlistDbCoverageExpirationCache = {
  has_data: false,
  row_count: null,
  last_updated_at: null,
}

const EMPTY_OI: WatchlistDbCoverageOiDaily = {
  has_data: false,
  row_count: null,
  last_trade_date: null,
  last_created_at: null,
}

const EMPTY_MP: WatchlistDbCoverageReportDaily = {
  has_data: false,
  row_count: null,
  last_trade_date: null,
  last_created_at: null,
}

const EMPTY_SD: WatchlistDbCoverageStockDay = {
  has_data: false,
  stock_day_last_bar: null,
  stock_day_last_created_at: null,
}

const EMPTY_SM: WatchlistDbCoverageStockMin = { has_data: false }
const EMPTY_TK: WatchlistDbCoverageTickers = { has_data: false }
const EMPTY_TO: WatchlistDbCoverageTickerOverview = { has_data: false }
const EMPTY_TT: WatchlistDbCoverageTickerTypes = { has_data: false }

function rowOptionDay(r: WatchlistDbCoverageSymbolRow): WatchlistDbCoverageOptionBars {
  return r.option_day ?? EMPTY_BARS
}
function rowOptionMin(r: WatchlistDbCoverageSymbolRow): WatchlistDbCoverageOptionBars {
  return r.option_min ?? EMPTY_BARS
}
function rowSuv(r: WatchlistDbCoverageSymbolRow): WatchlistDbCoverageSnapshotsWithUd {
  return r.option_snapshots_with_underlying_day ?? EMPTY_SUV
}
function rowOec(r: WatchlistDbCoverageSymbolRow): WatchlistDbCoverageExpirationCache {
  return r.option_expiration_cache ?? EMPTY_OEC
}
function rowOid(r: WatchlistDbCoverageSymbolRow): WatchlistDbCoverageOiDaily {
  return r.option_open_interest_daily ?? EMPTY_OI
}
function rowMp(r: WatchlistDbCoverageSymbolRow): WatchlistDbCoverageReportDaily {
  return r.report_option_max_pain_daily ?? EMPTY_MP
}
function rowSd(r: WatchlistDbCoverageSymbolRow): WatchlistDbCoverageStockDay {
  return r.stock_day ?? EMPTY_SD
}
function rowSm(r: WatchlistDbCoverageSymbolRow): WatchlistDbCoverageStockMin {
  return r.stock_min ?? EMPTY_SM
}
function rowTk(r: WatchlistDbCoverageSymbolRow): WatchlistDbCoverageTickers {
  return r.tickers ?? EMPTY_TK
}
function rowTo(r: WatchlistDbCoverageSymbolRow): WatchlistDbCoverageTickerOverview {
  return r.ticker_overview ?? EMPTY_TO
}
function rowTt(r: WatchlistDbCoverageSymbolRow): WatchlistDbCoverageTickerTypes {
  return r.ticker_types ?? EMPTY_TT
}

function maxWorst(current: number | null, candidate: number | null): number | null {
  if (candidate == null) return current
  if (current == null) return candidate
  return Math.max(current, candidate)
}

function snapshotStale(ts: string | null): boolean {
  if (!ts) return false
  const t = Date.parse(ts)
  if (!Number.isFinite(t)) return false
  return Date.now() - t > SNAPSHOT_STALE_MS
}

function worstAgeAcrossWatchlist(
  rows: WatchlistDbCoverageSymbolRow[],
  isoPick: (r: WatchlistDbCoverageSymbolRow) => string | null | undefined,
): string {
  let worst: number | null = null
  for (const r of rows) {
    const a = isoAgeSeconds(isoPick(r))
    if (a == null) continue
    if (worst == null || a > worst) worst = a
  }
  return worst != null ? fmtAgeSeconds(worst) : '—'
}

export function buildWatchlistOptionsSummaryRows(rows: WatchlistDbCoverageSymbolRow[]): WatchlistSummaryRow[] {
  const n = rows.length
  if (n === 0) return []

  let sumContractRows = 0
  let sumMismatch = 0
  let maxContractAge: number | null = null
  let symbolsWithContracts = 0

  let snapWithData = 0
  let maxSnapAge: number | null = null
  let staleSnap = 0

  let atmWithData = 0
  let maxAtmAge: number | null = null

  let odWith = 0
  let maxOdAge: number | null = null
  let omWith = 0
  let maxOmAge: number | null = null
  let suvWith = 0
  let maxSuvAge: number | null = null
  let oecWith = 0
  let maxOecAge: number | null = null
  let oidWith = 0
  let maxOidAge: number | null = null
  let mpWith = 0
  let maxMpAge: number | null = null

  for (const r of rows) {
    const oc = r.option_contracts
    if (oc.has_data && oc.row_count != null) {
      sumContractRows += oc.row_count
      symbolsWithContracts++
      if (oc.mapping_mismatch_count != null) sumMismatch += oc.mapping_mismatch_count
      if (oc.age_seconds != null) {
        maxContractAge = maxWorst(maxContractAge, oc.age_seconds)
      }
    }

    if (r.option_snapshots.has_data && r.option_snapshots.snapshots_last_ts) {
      snapWithData++
      const a = isoAgeSeconds(r.option_snapshots.snapshots_last_ts)
      maxSnapAge = maxWorst(maxSnapAge, a)
      if (snapshotStale(r.option_snapshots.snapshots_last_ts)) staleSnap++
    }

    if (r.report_option_atm_iv_daily.has_data && r.report_option_atm_iv_daily.atm_iv_last_created_at) {
      atmWithData++
      const a = isoAgeSeconds(r.report_option_atm_iv_daily.atm_iv_last_created_at)
      maxAtmAge = maxWorst(maxAtmAge, a)
    }

    const od = rowOptionDay(r)
    const om = rowOptionMin(r)
    const suv = rowSuv(r)
    const oec = rowOec(r)
    const oid = rowOid(r)
    const mp = rowMp(r)
    if (od.has_data) {
      odWith++
      const a = isoAgeSeconds(od.last_created_at ?? od.last_bar_time)
      maxOdAge = maxWorst(maxOdAge, a)
    }
    if (om.has_data) {
      omWith++
      const a = isoAgeSeconds(om.last_created_at ?? om.last_bar_time)
      maxOmAge = maxWorst(maxOmAge, a)
    }
    if (suv.has_data) {
      suvWith++
      const a = isoAgeSeconds(suv.last_created_at ?? suv.last_snapshot_ts)
      maxSuvAge = maxWorst(maxSuvAge, a)
    }
    if (oec.has_data && oec.last_updated_at) {
      oecWith++
      const a = isoAgeSeconds(oec.last_updated_at)
      maxOecAge = maxWorst(maxOecAge, a)
    }
    if (oid.has_data) {
      oidWith++
      const a = isoAgeSeconds(oid.last_created_at ?? oid.last_trade_date)
      maxOidAge = maxWorst(maxOidAge, a)
    }
    if (mp.has_data) {
      mpWith++
      const a = isoAgeSeconds(mp.last_created_at ?? mp.last_trade_date)
      maxMpAge = maxWorst(maxMpAge, a)
    }
  }

  const contractCoverage =
    symbolsWithContracts > 0
      ? `${sumContractRows.toLocaleString()} rows · ${symbolsWithContracts}/${n} symbols`
      : '—'
  const contractFresh = maxContractAge != null ? `Worst ${fmtAgeSeconds(maxContractAge)}` : '—'
  const contractHealth =
    symbolsWithContracts > 0
      ? sumMismatch > 0
        ? `${sumMismatch.toLocaleString()} mapping mismatch(es)`
        : 'None'
      : '—'

  const snapCoverage = `${snapWithData}/${n} symbols`
  const snapFresh = maxSnapAge != null ? `Worst ${fmtAgeSeconds(maxSnapAge)}` : '—'
  const snapHealth =
    snapWithData > 0 ? (staleSnap > 0 ? `${staleSnap} snapshot(s) older than 24h` : 'OK') : '—'

  const atmCoverage = `${atmWithData}/${n} symbols`
  const atmFresh = maxAtmAge != null ? `Worst ${fmtAgeSeconds(maxAtmAge)}` : '—'

  return [
    {
      table: 'option_contracts',
      pipeline: 'Fundamental · reference',
      coverage: contractCoverage,
      freshness: contractFresh,
      health: contractHealth,
    },
    {
      table: 'option_snapshots',
      pipeline: 'Fundamental · chain / intraday',
      coverage: snapCoverage,
      freshness: snapFresh,
      health: snapHealth,
    },
    {
      table: 'option_day',
      pipeline: 'Fundamental · bars',
      coverage: `${odWith}/${n} symbols`,
      freshness: maxOdAge != null ? `Worst ${fmtAgeSeconds(maxOdAge)}` : '—',
      health: '—',
    },
    {
      table: 'option_min',
      pipeline: 'Fundamental · bars',
      coverage: `${omWith}/${n} symbols`,
      freshness: maxOmAge != null ? `Worst ${fmtAgeSeconds(maxOmAge)}` : '—',
      health: '—',
    },
    {
      table: 'option_snapshots_with_underlying_day',
      pipeline: 'Staging · view',
      coverage: `${suvWith}/${n} symbols`,
      freshness: maxSuvAge != null ? `Worst ${fmtAgeSeconds(maxSuvAge)}` : '—',
      health: '—',
    },
    {
      table: 'option_expiration_cache',
      pipeline: 'Staging · cache',
      coverage: `${oecWith}/${n} symbols`,
      freshness: maxOecAge != null ? `Worst ${fmtAgeSeconds(maxOecAge)}` : '—',
      health: '—',
    },
    {
      table: 'option_open_interest_daily',
      pipeline: 'Staging · EOD OI',
      coverage: `${oidWith}/${n} symbols`,
      freshness: maxOidAge != null ? `Worst ${fmtAgeSeconds(maxOidAge)}` : '—',
      health: '—',
    },
    {
      table: 'report_option_atm_iv_daily',
      pipeline: 'Report · derived',
      coverage: atmCoverage,
      freshness: atmFresh,
      health: '—',
    },
    {
      table: 'report_option_max_pain_daily',
      pipeline: 'Report · derived',
      coverage: `${mpWith}/${n} symbols`,
      freshness: maxMpAge != null ? `Worst ${fmtAgeSeconds(maxMpAge)}` : '—',
      health: '—',
    },
  ]
}

export function buildWatchlistBarsSummaryRows(rows: WatchlistDbCoverageSymbolRow[]): WatchlistSummaryRow[] {
  const n = rows.length
  if (n === 0) return []

  const withSd = rows.filter(r => rowSd(r).has_data).length
  const withSm = rows.filter(r => rowSm(r).has_data).length

  return [
    {
      table: 'stock_day',
      pipeline: 'Fundamental · daily OHLC (Massive)',
      coverage: `${withSd}/${n} symbols`,
      freshness: worstAgeAcrossWatchlist(rows, r => {
        const sd = rowSd(r)
        return sd.has_data ? sd.stock_day_last_bar ?? sd.stock_day_last_created_at : null
      }),
      health: '—',
    },
    {
      table: 'stock_min',
      pipeline: 'Fundamental · intraday OHLC (Massive)',
      coverage: `${withSm}/${n} symbols`,
      freshness: worstAgeAcrossWatchlist(rows, r => {
        const sm = rowSm(r)
        return sm.has_data ? sm.last_bar_time ?? sm.last_created_at : null
      }),
      health: '—',
    },
  ]
}

export function buildStocksUtilitiesSummaryRows(rows: WatchlistDbCoverageSymbolRow[]): WatchlistSummaryRow[] {
  const n = rows.length
  if (n === 0) return []

  const withTk = rows.filter(r => rowTk(r).has_data).length
  const withTo = rows.filter(r => rowTo(r).has_data).length
  const tt0 = rowTt(rows[0]!)
  const ttRows = tt0.dictionary_row_count
  const ttOk = tt0.has_data && ttRows != null && ttRows > 0

  return [
    {
      table: 'tickers',
      pipeline: 'Reference · universe row (Massive)',
      coverage: `${withTk}/${n} symbols (watchlist slice)`,
      freshness: worstAgeAcrossWatchlist(rows, r => {
        const tk = rowTk(r)
        return tk.has_data ? tk.tickers_updated_at ?? tk.last_updated_utc : null
      }),
      health: '—',
    },
    {
      table: 'ticker_overview',
      pipeline: 'Reference · ticker details (Massive)',
      coverage: `${withTo}/${n} symbols (watchlist slice)`,
      freshness: worstAgeAcrossWatchlist(rows, r => {
        const o = rowTo(r)
        return o.has_data ? o.overview_updated_at : null
      }),
      health: '—',
    },
    {
      table: 'ticker_types',
      pipeline: 'Reference · instrument type dictionary (global)',
      coverage: ttOk ? `${ttRows} rows (full table)` : '—',
      freshness: ttOk ? fmtAgeSeconds(isoAgeSeconds(tt0.dictionary_last_created_at)) : '—',
      health: '—',
    },
  ]
}
