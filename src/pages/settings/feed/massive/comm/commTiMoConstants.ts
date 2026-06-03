export const TI_TAB_ORDER = ['sma', 'ema', 'macd', 'rsi'] as const
export type TiSubTabKey = (typeof TI_TAB_ORDER)[number]

export const TI_DOC_PAGE_LABEL: Record<TiSubTabKey, string> = {
  sma: 'Simple Moving Average (SMA)',
  ema: 'Exponential Moving Average (EMA)',
  macd: 'Moving Average Convergence/Divergence (MACD)',
  rsi: 'Relative Strength Index (RSI)',
}

export const TI_SEGMENT_OPTS = TI_TAB_ORDER.map(t => ({
  value: t,
  label: TI_DOC_PAGE_LABEL[t],
}))

export const MO_TAB_ORDER = ['exchanges', 'market_holidays', 'market_status', 'conditions'] as const
export type MoSubTabKey = (typeof MO_TAB_ORDER)[number]

export const MO_TAB_LABEL: Record<MoSubTabKey, string> = {
  exchanges: 'Exchanges',
  market_holidays: 'Market Holidays',
  market_status: 'Market Status',
  conditions: 'Condition Codes',
}

export const MO_SEGMENT_OPTS = MO_TAB_ORDER.map(t => ({
  value: t,
  label: MO_TAB_LABEL[t],
}))
