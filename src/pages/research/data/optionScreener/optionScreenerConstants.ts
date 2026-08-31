import type { ScreenerFilters } from '@/types/research'

export const STRUCTURE_TYPES = [
  { value: 'cash_secured_put', label: 'Cash Secured Put', enabled: true },
  { value: 'covered_call', label: 'Covered Call', enabled: false },
  { value: 'bull_put_spread', label: 'Bull Put Spread', enabled: false },
  { value: 'bear_call_spread', label: 'Bear Call Spread', enabled: false },
] as const

export const STRUCTURE_LABEL: Record<string, string> = Object.fromEntries(
  STRUCTURE_TYPES.map(({ value, label }) => [value, label]),
)

export const DEFAULT_FILTERS: ScreenerFilters = {
  structure_type: 'cash_secured_put',
  symbols: [],
  dte_min: 14,
  dte_max: 45,
  max_prob_itm: 0.3,
  min_annualized_return: null,
  max_spread_pct: null,
  min_premium: null,
  include_earnings_span: false,
  source: 'massive',
}

export function loadSavedFilters(): ScreenerFilters {
  try {
    const raw = localStorage.getItem('optionScreenerFilters')
    return raw ? ({ ...DEFAULT_FILTERS, ...JSON.parse(raw) } as ScreenerFilters) : DEFAULT_FILTERS
  } catch {
    return DEFAULT_FILTERS
  }
}
