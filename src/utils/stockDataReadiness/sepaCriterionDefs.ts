import type { SepaReadinessSummaryResponse } from '@/types/stockDataReadiness'

export type CriterionStatus = 'supported' | 'partial' | 'missing' | 'unknown'

export interface SepaCriterionDef {
  id: string
  criteria: string
  condition: string
  explain: string
  dataSource: string
  dataFields: string[]
  minBars?: number
}

export const SEPA_TECHNICAL_CRITERIA: SepaCriterionDef[] = [
  { id: 'avg_volume', criteria: 'Average Volume', condition: '50 SMA > 100K', explain: 'Decent liquidity', dataSource: 'stock_day', dataFields: ['volume'], minBars: 50 },
  { id: 'crs', criteria: 'CRS', condition: '≥ 70', explain: 'Solid Relative Strength', dataSource: 'stock_day', dataFields: ['close'], minBars: 252 },
  { id: 'close_vs_low52w', criteria: 'Close vs 52W Low', condition: 'close ≥ low52Weeks × 1.3', explain: 'Current close at least 30% higher than 52-week low', dataSource: 'stock_day', dataFields: ['close', 'low'], minBars: 252 },
  { id: 'high_vs_high52w', criteria: 'High vs 52W High', condition: 'high ≥ high52Weeks × 0.75', explain: 'Current high within 25% of 52-week high', dataSource: 'stock_day', dataFields: ['high'], minBars: 252 },
  { id: 'sma50_above_sma150', criteria: 'SMA(50) vs SMA(150)', condition: 'SMA(50) above SMA(150)', explain: 'Short-term trend positive', dataSource: 'stock_day', dataFields: ['close'], minBars: 150 },
  { id: 'sma50_above_sma200', criteria: 'SMA(50) vs SMA(200)', condition: 'SMA(50) above SMA(200)', explain: 'Short-term trend positive', dataSource: 'stock_day', dataFields: ['close'], minBars: 200 },
  { id: 'sma150_above_sma200', criteria: 'SMA(150) vs SMA(200)', condition: 'SMA(150) above SMA(200)', explain: 'Medium-term trend positive', dataSource: 'stock_day', dataFields: ['close'], minBars: 200 },
  { id: 'sma200_rising', criteria: 'SMA(200) Rising', condition: 'SMA(200) trending up', explain: 'Long-term trend bullish', dataSource: 'stock_day', dataFields: ['close'], minBars: 220 },
  { id: 'price_above_sma50', criteria: 'Price vs SMA(50)', condition: 'Price above SMA(50)', explain: 'Short-term price trend up', dataSource: 'stock_day', dataFields: ['close'], minBars: 50 },
  { id: 'price_above_sma150', criteria: 'Price vs SMA(150)', condition: 'Price above SMA(150)', explain: 'Medium-term price trend up', dataSource: 'stock_day', dataFields: ['close'], minBars: 150 },
  { id: 'price_above_sma200', criteria: 'Price vs SMA(200)', condition: 'Price above SMA(200)', explain: 'Long-term price trend up', dataSource: 'stock_day', dataFields: ['close'], minBars: 200 },
]

export const SEPA_FUNDAMENTAL_CRITERIA: SepaCriterionDef[] = [
  { id: 'eps_q2q', criteria: 'EPS Growth Q2Q', condition: '≥ 25%', explain: 'Decent earnings growth Q2Q', dataSource: 'research_sepa_fundamentals_cache', dataFields: ['EPS (quarterly)'] },
  { id: 'revenue_q2q', criteria: 'Revenue Growth Q2Q', condition: '≥ 25%', explain: 'Decent revenue growth Q2Q', dataSource: 'research_sepa_fundamentals_cache', dataFields: ['Revenue (quarterly)'] },
  { id: 'eps_acc_2q', criteria: 'EPS Acceleration', condition: 'EPS acc. 2 Qs', explain: 'Decent earnings growth acceleration last 2Q', dataSource: 'research_sepa_fundamentals_cache', dataFields: ['EPS (≥3 quarters)'] },
  { id: 'revenue_acc_2q', criteria: 'Revenue Acceleration', condition: 'Revenue acc. 2 Qs', explain: 'Decent revenue growth acceleration last 2Q', dataSource: 'research_sepa_fundamentals_cache', dataFields: ['Revenue (≥3 quarters)'] },
  { id: 'eps_3y', criteria: 'EPS Growth 3Y', condition: '≥ 15%', explain: 'Decent earnings growth long-term', dataSource: 'research_sepa_fundamentals_cache', dataFields: ['EPS (annual, ≥3 years)'] },
  { id: 'revenue_3y', criteria: 'Revenue Growth 3Y', condition: '≥ 15%', explain: 'Decent revenue growth long-term', dataSource: 'research_sepa_fundamentals_cache', dataFields: ['Revenue (annual, ≥3 years)'] },
  { id: 'eps_acc_fy', criteria: 'EPS Acceleration FY', condition: 'EPS acc. last FY', explain: 'Decent earnings growth acceleration last year', dataSource: 'research_sepa_fundamentals_cache', dataFields: ['EPS (annual, ≥2 years)'] },
  { id: 'revenue_acc_fy', criteria: 'Revenue Acceleration FY', condition: 'Revenue acc. last FY', explain: 'Decent revenue growth acceleration last year', dataSource: 'research_sepa_fundamentals_cache', dataFields: ['Revenue (annual, ≥2 years)'] },
]

export const TECH_COND_LABELS: Record<string, string> = {
  avg_volume_50_gt_threshold: 'Avg Volume 50D > 100K',
  crs_ge_70: 'CRS ≥ 70',
  close_ge_low52_x_1_3: 'Close ≥ Low52W × 1.3',
  close_ge_high52_x_0_75: 'Close ≥ High52W × 0.75',
  sma50_gt_sma150: 'SMA50 > SMA150',
  sma50_gt_sma200: 'SMA50 > SMA200',
  sma150_gt_sma200: 'SMA150 > SMA200',
  sma200_rising_1m: 'SMA200 Rising (1M)',
  price_gt_sma50: 'Price > SMA50',
  price_gt_sma150: 'Price > SMA150',
  price_gt_sma200: 'Price > SMA200',
  rsi_14_in_band: 'RSI(14) in [40, 80]',
  macd_hist_positive: 'MACD Histogram > 0 & Rising',
  roc_3m_positive: 'ROC 3M > 0',
  roc_6m_positive: 'ROC 6M > 0',
  roc_12m_positive: 'ROC 12M > 0',
  multi_period_rs_4w_positive: 'RS vs SPY (4W) > 0',
  multi_period_rs_13w_positive: 'RS vs SPY (13W) > 0',
  multi_period_rs_26w_positive: 'RS vs SPY (26W) > 0',
  slope_sma200_positive: 'SMA200 Slope > 0',
  up_down_volume_50d_gt_1: 'Up/Down Vol (50D) > 1',
  realized_vol_contraction: 'Realized Vol Contraction',
  bb_squeeze: 'BB Squeeze Active',
  obv_slope_30d_positive: 'OBV Slope (30D) Positive',
  adx_14_ge_25: 'ADX(14) ≥ 25 (Trending)',
  aroon_oscillator_ge_50: 'Aroon Osc ≥ 50',
  days_to_cover_ge_5: 'Days to Cover ≥ 5',
  short_volume_ratio_le_30pct_recent: 'Short Vol Ratio < 30%',
  short_volume_ratio_trend_4w_falling: 'Short Vol Trend Falling',
}

export function deriveCriterionStatus(
  criterion: SepaCriterionDef,
  summary: SepaReadinessSummaryResponse | null,
): { status: CriterionStatus; note: string } {
  if (!summary?.ok) return { status: 'unknown', note: 'Summary not loaded' }

  if (criterion.dataSource === 'stock_day') {
    const live = summary.price_readiness_live
    const total = live?.total_symbols ?? 0
    const ready = live?.price_ready ?? 0
    if (total === 0) return { status: 'missing', note: 'No stock_day data' }
    if (ready === 0) return { status: 'missing', note: 'No symbols price_ready' }
    const pct = (ready / total) * 100
    if (pct >= 90) {
      return { status: 'supported', note: `${ready.toLocaleString()} / ${total.toLocaleString()} price_ready` }
    }
    return {
      status: 'partial',
      note: `${pct.toFixed(1)}% price_ready (${ready.toLocaleString()} / ${total.toLocaleString()})`,
    }
  }

  if (criterion.dataSource === 'research_sepa_fundamentals_cache') {
    if (summary.fund_cache_view_exists === false) return { status: 'missing', note: 'Fund cache view not created' }
    const valid = summary.fund_cache_valid_count
    if (valid == null) return { status: 'unknown', note: 'Fund cache count unavailable' }
    if (valid === 0) return { status: 'missing', note: 'No valid fund cache rows' }
    const universe = summary.universe_count ?? 0
    if (universe > 0) {
      const pct = (valid / universe) * 100
      if (pct >= 50) return { status: 'supported', note: `${valid.toLocaleString()} symbols cached` }
      return {
        status: 'partial',
        note: `${valid.toLocaleString()} / ${universe.toLocaleString()} cached (${pct.toFixed(1)}%)`,
      }
    }
    return { status: 'supported', note: `${valid.toLocaleString()} symbols cached` }
  }

  return { status: 'unknown', note: '' }
}

export function criterionStatusLabel(status: CriterionStatus): string {
  switch (status) {
    case 'supported':
      return 'Supported'
    case 'partial':
      return 'Partial'
    case 'missing':
      return 'Missing'
    default:
      return 'Unknown'
  }
}

export function criterionStatusDotClass(status: CriterionStatus): string {
  switch (status) {
    case 'supported':
      return 'bg-lamp-green'
    case 'partial':
      return 'bg-lamp-yellow'
    case 'missing':
      return 'bg-lamp-red'
    default:
      return 'bg-muted-foreground'
  }
}
