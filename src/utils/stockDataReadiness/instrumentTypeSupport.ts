import {
  INSTRUMENT_TYPE_DATA_SUPPORT_ROWS,
  type DataSupportLevel,
  type InstrumentTypeSupportRow,
} from '@/constants/stockDataReadiness'
import type {
  SepaFundamentalsSymbolCountByTypeRow,
  SepaReadinessSummaryResponse,
  SepaSnapshotByTypeRow,
} from '@/types/stockDataReadiness'

export function supportBadge(level: DataSupportLevel): { text: string; className: string } {
  if (level === 'supported') {
    return {
      text: 'Supported',
      className: 'rounded px-1.5 py-0.5 text-dense-caption font-semibold bg-success-soft/40 text-lamp-green border border-lamp-green/30',
    }
  }
  if (level === 'partial') {
    return {
      text: 'Partial',
      className: 'rounded px-1.5 py-0.5 text-dense-caption font-semibold bg-warning-soft/30 text-lamp-yellow border border-lamp-yellow/30',
    }
  }
  if (level === 'not_supported') {
    return {
      text: 'Not supported',
      className: 'rounded px-1.5 py-0.5 text-dense-caption font-semibold bg-muted/50 text-muted-foreground border border-border',
    }
  }
  return {
    text: 'Unknown',
    className: 'rounded px-1.5 py-0.5 text-dense-caption font-semibold bg-muted/50 text-muted-foreground',
  }
}

export interface InstrumentSupportRowEnriched {
  row: InstrumentTypeSupportRow
  snapshot?: SepaSnapshotByTypeRow
  fundamentals?: SepaFundamentalsSymbolCountByTypeRow
}

export function buildInstrumentSupportRows(
  summary: SepaReadinessSummaryResponse | null,
): InstrumentSupportRowEnriched[] {
  const snapshotByType = summary?.stock_unified_snapshot_by_type ?? []
  const fundamentalsByType = summary?.fundamentals_symbol_count_by_type ?? []
  const knownCodes = new Set(INSTRUMENT_TYPE_DATA_SUPPORT_ROWS.map(r => r.code))
  const snapshotByTypeMap = new Map(snapshotByType.map(r => [r.code, r]))
  const fundamentalsByTypeMap = new Map(fundamentalsByType.map(r => [r.code, r]))

  const extraSnapshotRows: InstrumentTypeSupportRow[] = snapshotByType
    .filter(r => !knownCodes.has(r.code))
    .map(r => ({
      code: r.code,
      description: r.description ?? r.code,
      incomeStatements: 'unknown' as DataSupportLevel,
      balanceSheets: 'unknown' as DataSupportLevel,
      cashFlows: 'unknown' as DataSupportLevel,
      ratios: 'unknown' as DataSupportLevel,
      note: 'Observed in unified snapshot; support matrix not yet classified.',
    }))

  return [...INSTRUMENT_TYPE_DATA_SUPPORT_ROWS, ...extraSnapshotRows].map(row => ({
    row,
    snapshot: snapshotByTypeMap.get(row.code),
    fundamentals: fundamentalsByTypeMap.get(row.code),
  }))
}
