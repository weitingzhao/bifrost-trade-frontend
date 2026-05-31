import type { RunbookStageId, SepaRunStep } from '@/types/stockDataReadiness'

export const ALL_SEPA_RUNBOOK_STEP_IDS: readonly SepaRunStep[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export const RUNBOOK_STAGE_LAYOUT: ReadonlyArray<{
  id: RunbookStageId
  title: string
  blurb: string
  stepIds: readonly SepaRunStep[]
}> = [
  {
    id: 'baseline',
    title: 'Universe & price baseline',
    blurb: 'Universe, unified snapshot, stock_day bars',
    stepIds: [1, 2, 3],
  },
  {
    id: 'financials',
    title: 'Financial statements',
    blurb: 'Income, balance sheet, cash flow, ratios → PostgreSQL',
    stepIds: [4, 5, 6, 7],
  },
  {
    id: 'market',
    title: 'Short market data',
    blurb: 'Short interest & short volume',
    stepIds: [8, 9],
  },
  {
    id: 'publish',
    title: 'Evaluate & publish',
    blurb: 'Evaluate fundamentals + materialize readiness snapshot',
    stepIds: [10],
  },
]

export type DataSupportLevel = 'supported' | 'partial' | 'not_supported' | 'unknown'

export interface InstrumentTypeSupportRow {
  code: string
  description: string
  incomeStatements: DataSupportLevel
  balanceSheets: DataSupportLevel
  cashFlows: DataSupportLevel
  ratios: DataSupportLevel
  note?: string
}

export const INSTRUMENT_TYPE_DATA_SUPPORT_ROWS: InstrumentTypeSupportRow[] = [
  { code: 'CS', description: 'Common Stock', incomeStatements: 'supported', balanceSheets: 'supported', cashFlows: 'supported', ratios: 'supported' },
  { code: 'ADRC', description: 'American Depository Receipt Common', incomeStatements: 'supported', balanceSheets: 'supported', cashFlows: 'supported', ratios: 'supported' },
  { code: 'PFD', description: 'Preferred Stock', incomeStatements: 'partial', balanceSheets: 'partial', cashFlows: 'partial', ratios: 'partial', note: 'Coverage may vary by issuer and filing frequency.' },
  { code: 'ETF', description: 'Exchange Traded Fund', incomeStatements: 'not_supported', balanceSheets: 'not_supported', cashFlows: 'not_supported', ratios: 'not_supported', note: 'Commonly sparse/absent in Massive financial statements coverage.' },
  { code: 'ETS', description: 'Single-security ETF', incomeStatements: 'not_supported', balanceSheets: 'not_supported', cashFlows: 'not_supported', ratios: 'not_supported', note: 'Commonly sparse/absent in Massive financial statements coverage.' },
  { code: 'ETV', description: 'Exchange Traded Vehicle', incomeStatements: 'not_supported', balanceSheets: 'not_supported', cashFlows: 'not_supported', ratios: 'not_supported', note: 'Commonly sparse/absent in Massive financial statements coverage.' },
  { code: 'ETN', description: 'Exchange Traded Note', incomeStatements: 'not_supported', balanceSheets: 'not_supported', cashFlows: 'not_supported', ratios: 'not_supported', note: 'Debt note product; issuer-level statements usually not exposed per ticker.' },
  { code: 'FUND', description: 'Fund', incomeStatements: 'not_supported', balanceSheets: 'not_supported', cashFlows: 'not_supported', ratios: 'not_supported', note: 'Commonly sparse/absent in Massive financial statements coverage.' },
  { code: 'UNIT', description: 'Unit', incomeStatements: 'not_supported', balanceSheets: 'not_supported', cashFlows: 'not_supported', ratios: 'not_supported', note: 'Commonly sparse/absent in Massive financial statements coverage.' },
  { code: 'RIGHT', description: 'Rights', incomeStatements: 'not_supported', balanceSheets: 'not_supported', cashFlows: 'not_supported', ratios: 'not_supported', note: 'Derivative security; company statements usually not represented.' },
  { code: 'WARRANT', description: 'Warrant', incomeStatements: 'not_supported', balanceSheets: 'not_supported', cashFlows: 'not_supported', ratios: 'not_supported', note: 'Derivative security; company statements usually not represented.' },
  { code: 'SP', description: 'Structured Product', incomeStatements: 'not_supported', balanceSheets: 'not_supported', cashFlows: 'not_supported', ratios: 'not_supported', note: 'Commonly sparse/absent in Massive financial statements coverage.' },
]

export const FIN_STMT_GAP_INSTRUMENT_CODES = INSTRUMENT_TYPE_DATA_SUPPORT_ROWS.filter(
  r => r.incomeStatements === 'supported' || r.incomeStatements === 'partial',
).map(r => r.code)
