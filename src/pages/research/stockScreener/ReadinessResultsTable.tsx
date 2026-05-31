import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SEPA_COND_CATALOG, TECH_COND_CATALOG } from '@/constants/stockScreenerCatalog'
import type { ReadinessSnapshotRow, SortColumn, SortDirection } from '@/types/stockScreener'
import { fundCellClass, techCellClass } from '@/utils/stockScreener'

interface Props {
  rows: ReadinessSnapshotRow[]
  sortedRows: ReadinessSnapshotRow[]
  sortCol: SortColumn
  sortDir: SortDirection
  loading: boolean
  error: unknown
  symbolCount: number
  activeSymbol: string | null
  onSort: (col: 'tech' | 'fund') => void
  onOpenInspector: (symbol: string) => void
}

function BoolMark({ value }: { value: boolean | undefined | null }) {
  if (value === undefined || value === null) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <span className={cn('font-mono text-[10px]', value ? 'text-emerald-400' : 'text-red-400')}>
      {value ? '✓' : '✗'}
    </span>
  )
}

function StmtChip({ label, ok, title }: { label: string; ok?: boolean; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-block text-[9px] font-mono px-1 py-0 rounded border',
        ok ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-border text-muted-foreground',
      )}
    >
      {label}
    </span>
  )
}

function CondDots({
  catalog,
  passed,
  insufficient,
  groupPrefix,
}: {
  catalog: readonly { id: string; short: string; group: string }[]
  passed: Set<string>
  insufficient: boolean
  groupPrefix: 'tech' | 'fund'
}) {
  const groupBorder: Record<string, string> = groupPrefix === 'tech'
    ? { vol: 'border-violet-500/40', price52: 'border-blue-500/40', sma: 'border-cyan-500/40', price: 'border-indigo-500/40' }
    : { eps: 'border-emerald-500/40', rev: 'border-teal-500/40' }

  return (
    <div className="flex flex-wrap gap-0.5 mt-0.5">
      {catalog.map(({ id, short, group }) => {
        const pass = passed.has(id)
        return (
          <span
            key={id}
            title={`${short}: ${insufficient ? 'insufficient' : pass ? 'pass' : 'fail'}`}
            className={cn(
              'inline-flex items-center justify-center w-4 h-4 text-[8px] rounded border',
              groupBorder[group] ?? 'border-border',
              pass ? 'text-emerald-400' : 'text-muted-foreground/50',
              insufficient && 'opacity-40',
            )}
          >
            {pass ? '✓' : ''}
          </span>
        )
      })}
    </div>
  )
}

function SortHeader({
  label,
  col,
  sortCol,
  sortDir,
  onSort,
}: {
  label: string
  col: 'tech' | 'fund'
  sortCol: SortColumn
  sortDir: SortDirection
  onSort: (col: 'tech' | 'fund') => void
}) {
  const active = sortCol === col
  const arrow = active ? (sortDir === 'desc' ? '↓' : '↑') : '⇅'
  return (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground text-xs"
      onClick={() => onSort(col)}
      title={`Sort by ${label} pass count`}
    >
      {label} {arrow}
    </TableHead>
  )
}

export function ReadinessResultsTable({
  rows,
  sortedRows,
  sortCol,
  sortDir,
  loading,
  error,
  symbolCount,
  activeSymbol,
  onSort,
  onOpenInspector,
}: Props) {
  const emptyMessage = loading
    ? 'Loading readiness…'
    : symbolCount === 0
      ? 'Select a distribution bucket, apply a condition filter, or type symbols below.'
      : error
        ? 'Failed to load readiness — see error above.'
        : 'No readiness rows found.'

  return (
    <Card className="py-3 gap-2">
      <CardHeader className="px-3 py-0">
        <CardTitle className="text-xs font-semibold">
          Results
          {rows.length > 0 && (
            <span className="ml-2 font-normal text-muted-foreground">
              {rows.length} shown · readiness snapshot
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[110px] text-xs">Symbol</TableHead>
                <SortHeader label="Technical" col="tech" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                <SortHeader label="Fundamental" col="fund" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                <TableHead className="w-[70px] text-xs text-center">Univ</TableHead>
                <TableHead className="w-[100px] text-xs">Price</TableHead>
                <TableHead className="w-[150px] text-xs">Statements</TableHead>
                <TableHead className="w-[90px] text-xs">Short</TableHead>
                <TableHead className="w-[90px] text-xs">As-of</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-xs text-muted-foreground text-center py-8">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
              {sortedRows.map((r) => {
                if (!r.found) {
                  return (
                    <TableRow key={r.symbol} className="text-xs">
                      <TableCell>
                        <button
                          type="button"
                          className="font-mono font-semibold text-primary hover:underline"
                          onClick={() => onOpenInspector(r.symbol)}
                        >
                          {r.symbol}
                        </button>
                      </TableCell>
                      <TableCell colSpan={7} className="text-muted-foreground text-[11px]">
                        No row in stock_readiness_daily — run the universe snapshot from Stock Data Readiness.
                      </TableCell>
                    </TableRow>
                  )
                }

                const passed = new Set(r.passed_conditions ?? [])
                const passedTech = new Set(r.passed_tech_conditions ?? [])
                const insuf = r.fundamental_insufficient ?? false
                const passCount = r.fundamental_pass_count ?? 0
                const techInsuf = r.technical_insufficient ?? false
                const techPassCount = r.technical_pass_count ?? 0
                const techEvalPresent = r.technical_pass !== undefined
                const isActive = activeSymbol === r.symbol

                return (
                  <TableRow
                    key={r.symbol}
                    className={cn('text-xs', isActive && 'bg-accent/30')}
                  >
                    <TableCell>
                      <button
                        type="button"
                        className={cn(
                          'font-mono font-semibold hover:underline inline-flex items-center gap-0.5',
                          isActive ? 'text-primary' : 'text-foreground',
                        )}
                        onClick={() => onOpenInspector(r.symbol)}
                        title={isActive ? 'Close inspector' : `Open ${r.symbol} inspector`}
                      >
                        {r.symbol}
                        <span className="text-[10px] opacity-50" aria-hidden>↗</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span
                          className={cn('font-mono text-[11px]', techCellClass(techPassCount, techInsuf, techEvalPresent))}
                          title={!techEvalPresent ? 'Not evaluated' : techInsuf ? 'Insufficient data' : `${techPassCount}/11 passed`}
                        >
                          {!techEvalPresent ? '—' : techInsuf ? 'INS' : `${techPassCount}/11`}
                        </span>
                        {techEvalPresent && (
                          <CondDots
                            catalog={TECH_COND_CATALOG}
                            passed={passedTech}
                            insufficient={techInsuf}
                            groupPrefix="tech"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span
                          className={cn('font-mono text-[11px]', fundCellClass(passCount, insuf))}
                          title={insuf ? 'Insufficient data' : `${passCount}/8 passed`}
                        >
                          {insuf ? 'INS' : `${passCount}/8`}
                        </span>
                        <CondDots
                          catalog={SEPA_COND_CATALOG}
                          passed={passed}
                          insufficient={insuf}
                          groupPrefix="fund"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <BoolMark value={r.included_in_universe} />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                        <BoolMark value={r.price_ready} />
                        <span className="text-muted-foreground">{(r.bar_count_lookback ?? 0).toLocaleString()}b</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-0.5">
                        <StmtChip label="IS" ok={r.income_stmt_ready} title={`Income: ${r.income_stmt_q_count ?? 0}Q · ${r.income_stmt_a_count ?? 0}A`} />
                        <StmtChip label="BS" ok={r.balance_sheet_present} title="Balance Sheet" />
                        <StmtChip label="CF" ok={r.cash_flow_present} title="Cash Flow" />
                        <StmtChip label="RT" ok={r.ratios_present} title="Ratios" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-0.5">
                        <StmtChip label="SI" ok={r.short_interest_present} title="Short Interest" />
                        <StmtChip label="SV" ok={r.short_volume_present} title="Short Volume" />
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {r.as_of_date ?? '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
