/** Core SEPA fundamental conditions (8) */
export const SEPA_COND_CATALOG = [
  { id: 'eps_q2q_ge_25pct', label: 'EPS QoQ ≥ 25%', short: 'EPS Q2Q', group: 'eps' as const },
  { id: 'rev_q2q_ge_25pct', label: 'Revenue QoQ ≥ 25%', short: 'Rev Q2Q', group: 'rev' as const },
  { id: 'eps_acc_2q', label: 'EPS Accelerating (2Q)', short: 'EPS Acc 2Q', group: 'eps' as const },
  { id: 'rev_acc_2q', label: 'Revenue Accel (2Q)', short: 'Rev Acc 2Q', group: 'rev' as const },
  { id: 'eps_3y_ge_15pct', label: 'EPS 3Y CAGR ≥ 15%', short: 'EPS 3Y', group: 'eps' as const },
  { id: 'rev_3y_ge_15pct', label: 'Revenue 3Y CAGR ≥ 15%', short: 'Rev 3Y', group: 'rev' as const },
  { id: 'eps_acc_fy', label: 'EPS Accelerating (FY)', short: 'EPS Acc FY', group: 'eps' as const },
  { id: 'rev_acc_fy', label: 'Revenue Accel (FY)', short: 'Rev Acc FY', group: 'rev' as const },
]

export const EXT_COND_CATALOG = [
  { id: 'gross_margin_ge_30pct', label: 'Gross Margin ≥ 30%', short: 'GM≥30', group: 'quality' },
  { id: 'operating_margin_ge_10pct', label: 'Oper. Margin ≥ 10%', short: 'OM≥10', group: 'quality' },
  { id: 'net_margin_ge_5pct', label: 'Net Margin ≥ 5%', short: 'NM≥5', group: 'quality' },
  { id: 'ocf_to_ni_ge_0_7', label: 'OCF/NI ≥ 0.7', short: 'OCF/NI', group: 'quality' },
  { id: 'interest_coverage_ge_5x', label: 'Interest Coverage ≥ 5×', short: 'IC≥5', group: 'quality' },
  { id: 'current_ratio_ge_1_5', label: 'Current Ratio ≥ 1.5', short: 'CR≥1.5', group: 'balance' },
  { id: 'quick_ratio_ge_1_0', label: 'Quick Ratio ≥ 1.0', short: 'QR≥1', group: 'balance' },
  { id: 'debt_to_equity_le_1', label: 'D/E ≤ 1.0', short: 'D/E≤1', group: 'balance' },
  { id: 'net_debt_to_ebitda_le_3', label: 'NetDebt/EBITDA ≤ 3', short: 'ND/EB≤3', group: 'balance' },
  { id: 'fcf_positive', label: 'FCF Positive', short: 'FCF>0', group: 'cashflow' },
  { id: 'fcf_margin_ge_5pct', label: 'FCF Margin ≥ 5%', short: 'FCFm≥5', group: 'cashflow' },
  { id: 'fcf_yield_ge_3pct', label: 'FCF Yield ≥ 3%', short: 'FCFy≥3', group: 'cashflow' },
  { id: 'capex_intensity_le_15pct', label: 'CapEx ≤ 15%', short: 'CpX≤15', group: 'cashflow' },
  { id: 'pe_le_60', label: 'P/E ≤ 60', short: 'PE≤60', group: 'valuation' },
  { id: 'ps_le_15', label: 'P/S ≤ 15', short: 'PS≤15', group: 'valuation' },
  { id: 'pb_le_8', label: 'P/B ≤ 8', short: 'PB≤8', group: 'valuation' },
  { id: 'ev_to_ebitda_le_30', label: 'EV/EBITDA ≤ 30', short: 'EVEB≤30', group: 'valuation' },
  { id: 'roe_ge_15pct', label: 'ROE ≥ 15%', short: 'ROE≥15', group: 'profitability' },
  { id: 'roa_ge_5pct', label: 'ROA ≥ 5%', short: 'ROA≥5', group: 'profitability' },
  { id: 'asset_turnover_ge_0_5', label: 'Asset Turnover ≥ 0.5', short: 'AT≥0.5', group: 'efficiency' },
  { id: 'dso_le_75_days', label: 'DSO ≤ 75 days', short: 'DSO≤75', group: 'efficiency' },
  { id: 'dio_le_120_days', label: 'DIO ≤ 120 days', short: 'DIO≤120', group: 'efficiency' },
  { id: 'days_to_cover_le_5', label: 'Days to Cover ≤ 5', short: 'DtC≤5', group: 'sentiment' },
  { id: 'short_volume_ratio_recent_le_30pct', label: 'Short Vol Ratio ≤ 30%', short: 'SVR≤30', group: 'sentiment' },
  { id: 'short_interest_pct_of_float_le_15pct', label: 'SI % Float ≤ 15%', short: 'SI%≤15', group: 'sentiment' },
] as const

export const TECH_COND_CATALOG = [
  { id: 'avg_volume_50_gt_threshold', label: 'Avg Volume 50D > 100K', short: 'Vol', group: 'vol' as const },
  { id: 'crs_ge_70', label: 'CRS ≥ 70', short: 'CRS', group: 'vol' as const },
  { id: 'close_ge_low52_x_1_3', label: 'Close ≥ Low52W × 1.3', short: '≥L52×1.3', group: 'price52' as const },
  { id: 'close_ge_high52_x_0_75', label: 'Close ≥ High52W × 0.75', short: '≥H52×0.75', group: 'price52' as const },
  { id: 'sma50_gt_sma150', label: 'SMA50 > SMA150', short: '50>150', group: 'sma' as const },
  { id: 'sma50_gt_sma200', label: 'SMA50 > SMA200', short: '50>200', group: 'sma' as const },
  { id: 'sma150_gt_sma200', label: 'SMA150 > SMA200', short: '150>200', group: 'sma' as const },
  { id: 'sma200_rising_1m', label: 'SMA200 Rising (1M)', short: '200↑', group: 'sma' as const },
  { id: 'price_gt_sma50', label: 'Price > SMA50', short: 'P>50', group: 'price' as const },
  { id: 'price_gt_sma150', label: 'Price > SMA150', short: 'P>150', group: 'price' as const },
  { id: 'price_gt_sma200', label: 'Price > SMA200', short: 'P>200', group: 'price' as const },
] as const

export const MOMENTUM_GROUP_LABELS = {
  oscillator: 'Oscillator',
  roc: 'Rate of Change',
  rs: 'Relative Strength',
  trend: 'Trend / Volume',
} as const

/**
 * The three tier marts' own signal columns (dw_stock.mart_sepa_tier_*, one row
 * per symbol for the latest eval_date). The ids are the column names the
 * filters take (api 0.1.8); until 2026-09-30 this list named an older
 * vocabulary no mart carries, so every pick filtered to nothing.
 */
export const MOMENTUM_INDICATORS = [
  { id: 'rsi_above_50', label: 'RSI 14 > 50', group: 'oscillator' as const },
  { id: 'rsi_healthy_range', label: 'RSI 14 in 40–70', group: 'oscillator' as const },
  { id: 'macd_bullish', label: 'EMA12 > EMA26', group: 'oscillator' as const },
  { id: 'macd_strong', label: 'MACD > 1% of price', group: 'oscillator' as const },
  { id: 'roc_10_positive', label: 'ROC 10D > 0', group: 'roc' as const },
  { id: 'roc_21_positive', label: 'ROC 21D > 0', group: 'roc' as const },
  { id: 'rs_gt_spy', label: '252D return > SPY', group: 'rs' as const },
  { id: 'volume_expanding', label: 'Vol 10D > 50D avg', group: 'trend' as const },
  { id: 'volume_surge', label: 'Vol 10D > 1.5× 50D', group: 'trend' as const },
  { id: 'price_gt_sma10', label: 'Price > SMA10', group: 'trend' as const },
] as const

export const STRUCTURE_INDICATORS = [
  { id: 'bb_squeeze', label: 'BB squeeze (width < 50D avg)' },
  { id: 'bb_tight_squeeze', label: 'BB tight squeeze (< 75%)' },
  { id: 'adx_trending', label: 'ADX trending' },
  { id: 'adx_strong_trend', label: 'ADX strong trend' },
  { id: 'aroon_bullish', label: 'Aroon up > down' },
  { id: 'aroon_up_strong', label: 'Aroon up > 70' },
  { id: 'vol_contracting', label: 'ATR < 80% of 50D ago' },
  { id: 'vol_tight_contraction', label: 'ATR < 60% of 50D ago' },
] as const

export const SENTIMENT_INDICATORS = [
  { id: 'si_declining', label: 'Short interest falling' },
  { id: 'low_short_float', label: 'Short float < 10%' },
  { id: 'high_days_to_cover', label: 'Days to cover > 5' },
  { id: 'short_float_declining', label: 'Short float falling' },
  { id: 'low_short_volume', label: 'Short volume < 30%' },
  { id: 'sv_ratio_declining', label: 'Short volume 5D < 20D' },
] as const

export const FUND_GROUP_LABELS: Record<string, string> = {
  eps: 'EPS',
  rev: 'Revenue',
}

export const EXT_GROUP_LABELS: Record<string, string> = {
  quality: 'Quality',
  balance: 'Balance Sheet',
  cashflow: 'Cash Flow',
  valuation: 'Valuation',
  profitability: 'Profitability',
  efficiency: 'Efficiency',
  sentiment: 'Sentiment',
}

export const TECH_GROUP_LABELS: Record<string, string> = {
  vol: 'Volume / Momentum',
  price52: '52-Week Range',
  sma: 'SMA Slope',
  price: 'Price Position',
}

export type TierKey = 'momentum' | 'structure' | 'sentiment'

/** Signals per tier — a tier's score is how many of them pass. */
export const TIER_MAX_SCORE: Record<TierKey, number> = {
  momentum: MOMENTUM_INDICATORS.length,
  structure: STRUCTURE_INDICATORS.length,
  sentiment: SENTIMENT_INDICATORS.length,
}

export const TIER_CATALOG: Record<TierKey, readonly { id: string; label: string; group?: string }[]> = {
  momentum: MOMENTUM_INDICATORS,
  structure: STRUCTURE_INDICATORS,
  sentiment: SENTIMENT_INDICATORS,
}
