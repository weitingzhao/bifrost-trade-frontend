/** Stubs — Massive watchlist coverage API removed (Wave 7-D). */

import type {
  BarQualityDetailResponse,
  DbCoverageSummaryResponse,
  OptionBarsContractsGapResult,
  OptionDayFillEligibilityRow,
  OptionMinFillEligibilityRow,
} from '@/types/watchlistDbCoverage'

const DISABLED = 'Massive Trade API removed — use Market Data Plugin'

export async function fetchDbCoverageSummary(): Promise<DbCoverageSummaryResponse> {
  return { ok: false, error: DISABLED }
}

export async function fetchBarQualityDetail(
  symbol: string,
  table: 'option_day' | 'option_min',
  period?: string,
  days?: number,
): Promise<BarQualityDetailResponse> {
  void period
  void days
  return {
    ok: false,
    symbol: (symbol || '').trim().toUpperCase(),
    table,
    latest_date: null,
    daily: [],
    expiries: [],
    periods: [],
    error: DISABLED,
  }
}

export async function postOptionBarsContractsGapBatch(
  symbols: string[],
  table: 'option_day' | 'option_min',
  period?: string,
): Promise<{ ok: boolean; error?: string; results?: Record<string, OptionBarsContractsGapResult> }> {
  void symbols
  void table
  void period
  return { ok: false, error: DISABLED, results: {} }
}

export async function postOptionMinFillEligibility(
  symbols: string[],
  period: string,
  lookbackDays?: number,
): Promise<{
  ok: boolean
  error?: string
  results?: Record<string, OptionMinFillEligibilityRow>
}> {
  void symbols
  void period
  void lookbackDays
  return { ok: false, error: DISABLED, results: {} }
}

export async function postOptionDayFillEligibility(
  symbols: string[],
  columnLookbackDays?: number,
): Promise<{
  ok: boolean
  error?: string
  results?: Record<string, OptionDayFillEligibilityRow>
}> {
  void symbols
  void columnLookbackDays
  return { ok: false, error: DISABLED, results: {} }
}
