import { cn } from '@/lib/utils'
import {
  DenseDataTable,
  DenseLinkButton,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTable,
  denseTableEntityCell,
  denseTableEntityLink,
  denseTableNumCell,
} from '@/components/data-display'
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
  onOpenInspector: (symbol: string, row?: ReadinessSnapshotRow) => void
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
        'inline-block rounded border px-1 py-0 font-mono text-[9px]',
        ok
          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
          : 'border-border text-muted-foreground',
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
  const groupBorder: Record<string, string> =
    groupPrefix === 'tech'
      ? {
          vol: 'border-violet-500/40',
          price52: 'border-blue-500/40',
          sma: 'border-cyan-500/40',
          price: 'border-indigo-500/40',
        }
      : { eps: 'border-emerald-500/40', rev: 'border-teal-500/40' }

  return (
    <div className="mt-0.5 flex flex-wrap gap-0.5">
      {catalog.map(({ id, short, group }) => {
        const pass = passed.has(id)
        return (
          <span
            key={id}
            title={`${short}: ${insufficient ? 'insufficient' : pass ? 'pass' : 'fail'}`}
            className={cn(
              'inline-flex h-4 w-4 items-center justify-center rounded border text-[8px]',
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

/** Overrides DenseTable `max-w-0` — fixed layout needs explicit min widths per column. */
const readinessCol = {
  symbol: 'w-[5.5rem] min-w-[5.5rem] max-w-none overflow-visible',
  tech: 'min-w-[11.5rem] max-w-none',
  fund: 'min-w-[10.5rem] max-w-none',
  univ: 'w-[3.25rem] min-w-[3.25rem] max-w-none',
  price: 'w-[6.25rem] min-w-[6.25rem] max-w-none whitespace-nowrap',
  stmt: 'w-[9.5rem] min-w-[9.5rem] max-w-none',
  short: 'w-[5.5rem] min-w-[5.5rem] max-w-none',
  asof: 'w-[6rem] min-w-[6rem] max-w-none whitespace-nowrap',
} as const

function ReadinessTableColgroup() {
  return (
    <colgroup>
      <col style={{ width: '5.5rem' }} />
      <col style={{ width: '26%' }} />
      <col style={{ width: '24%' }} />
      <col style={{ width: '3.25rem' }} />
      <col style={{ width: '6.25rem' }} />
      <col style={{ width: '9.5rem' }} />
      <col style={{ width: '5.5rem' }} />
      <col style={{ width: '6rem' }} />
    </colgroup>
  )
}

function SortableDenseHead({
  label,
  col,
  sortCol,
  sortDir,
  onSort,
  className,
}: {
  label: string
  col: 'tech' | 'fund'
  sortCol: SortColumn
  sortDir: SortDirection
  onSort: (col: 'tech' | 'fund') => void
  className?: string
}) {
  const active = sortCol === col
  const arrow = active ? (sortDir === 'desc' ? '↓' : '↑') : '⇅'
  return (
    <DenseTableHead
      className={cn(denseTable.sortableHead, active && 'text-foreground', className)}
      onClick={() => onSort(col)}
      title={`Sort by ${label} pass count`}
      aria-sort={active ? (sortDir === 'desc' ? 'descending' : 'ascending') : undefined}
    >
      {label} {arrow}
    </DenseTableHead>
  )
}

function SymbolCell({
  symbol,
  isActive,
  onOpen,
}: {
  symbol: string
  isActive: boolean
  onOpen: () => void
}) {
  return (
    <span className="inline-flex items-center gap-0.5 min-w-0">
      <DenseLinkButton
        variant="stock"
        label={symbol}
        onClick={onOpen}
        ariaLabel={isActive ? 'Close inspector' : `Open ${symbol} inspector`}
        className={cn(
          denseTableEntityLink,
          'shrink-0 font-mono text-[length:var(--text-dense-meta)]',
          isActive && 'underline decoration-2 underline-offset-2',
        )}
      />
      <span className="text-[10px] text-muted-foreground shrink-0" aria-hidden>
        ↗
      </span>
    </span>
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
    <div className={denseTable.sectionBlock}>
      <h2 className={denseTable.sectionTitle}>
        Results
        {rows.length > 0 && (
          <span className="ml-2 font-normal text-muted-foreground">
            {rows.length} shown · readiness snapshot
          </span>
        )}
      </h2>
      <DenseDataTable tableClassName="min-w-[58rem]">
        <ReadinessTableColgroup />
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead className={readinessCol.symbol}>Symbol</DenseTableHead>
            <SortableDenseHead
              label="Technical"
              col="tech"
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={onSort}
              className={readinessCol.tech}
            />
            <SortableDenseHead
              label="Fundamental"
              col="fund"
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={onSort}
              className={readinessCol.fund}
            />
            <DenseTableHead align="center" className={readinessCol.univ}>
              Univ
            </DenseTableHead>
            <DenseTableHead className={readinessCol.price}>Price</DenseTableHead>
            <DenseTableHead className={readinessCol.stmt}>Statements</DenseTableHead>
            <DenseTableHead className={readinessCol.short}>Short</DenseTableHead>
            <DenseTableHead className={readinessCol.asof}>As-of</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {sortedRows.length === 0 ? (
            <DenseTableRow>
              <DenseTableCell colSpan={8} className="py-10 text-center">
                <span className={denseTable.emptyHint}>{emptyMessage}</span>
              </DenseTableCell>
            </DenseTableRow>
          ) : (
            sortedRows.map(r => {
              if (!r.found) {
                return (
                  <DenseTableRow key={r.symbol}>
                    <DenseTableCell className={cn(readinessCol.symbol, denseTableEntityCell)}>
                      <DenseLinkButton
                        variant="stock"
                        label={r.symbol}
                        onClick={() => onOpenInspector(r.symbol, r)}
                        ariaLabel={`Open ${r.symbol} inspector`}
                        className={cn(denseTableEntityLink, 'font-mono text-[length:var(--text-dense-meta)]')}
                      />
                    </DenseTableCell>
                    <DenseTableCell colSpan={7} className={denseTable.mutedMeta}>
                      No row in stock_readiness_daily — run the universe snapshot from Stock Data
                      Readiness.
                    </DenseTableCell>
                  </DenseTableRow>
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
                <DenseTableRow key={r.symbol} className={cn(isActive && 'bg-accent/30')}>
                  <DenseTableCell className={cn(readinessCol.symbol, denseTableEntityCell)}>
                    <SymbolCell
                      symbol={r.symbol}
                      isActive={isActive}
                      onOpen={() => onOpenInspector(r.symbol, r)}
                    />
                  </DenseTableCell>
                  <DenseTableCell className={readinessCol.tech}>
                    <div>
                      <span
                        className={cn(
                          'font-mono text-[11px]',
                          techCellClass(techPassCount, techInsuf, techEvalPresent),
                        )}
                        title={
                          !techEvalPresent
                            ? 'Not evaluated'
                            : techInsuf
                              ? 'Insufficient data'
                              : `${techPassCount}/11 passed`
                        }
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
                  </DenseTableCell>
                  <DenseTableCell className={readinessCol.fund}>
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
                  </DenseTableCell>
                  <DenseTableCell className={cn(readinessCol.univ, 'text-center')}>
                    <BoolMark value={r.included_in_universe} />
                  </DenseTableCell>
                  <DenseTableCell className={readinessCol.price}>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] whitespace-nowrap">
                      <BoolMark value={r.price_ready} />
                      <span className={denseTable.mutedMeta}>
                        {(r.bar_count_lookback ?? 0).toLocaleString()}b
                      </span>
                    </span>
                  </DenseTableCell>
                  <DenseTableCell className={readinessCol.stmt}>
                    <div className="flex flex-wrap gap-0.5">
                      <StmtChip
                        label="IS"
                        ok={r.income_stmt_ready}
                        title={`Income: ${r.income_stmt_q_count ?? 0}Q · ${r.income_stmt_a_count ?? 0}A`}
                      />
                      <StmtChip label="BS" ok={r.balance_sheet_present} title="Balance Sheet" />
                      <StmtChip label="CF" ok={r.cash_flow_present} title="Cash Flow" />
                      <StmtChip label="RT" ok={r.ratios_present} title="Ratios" />
                    </div>
                  </DenseTableCell>
                  <DenseTableCell className={readinessCol.short}>
                    <div className="flex flex-wrap gap-0.5">
                      <StmtChip label="SI" ok={r.short_interest_present} title="Short Interest" />
                      <StmtChip label="SV" ok={r.short_volume_present} title="Short Volume" />
                    </div>
                  </DenseTableCell>
                  <DenseTableCell
                    className={cn(readinessCol.asof, denseTableNumCell, denseTable.mutedMeta)}
                  >
                    {r.as_of_date ?? '—'}
                  </DenseTableCell>
                </DenseTableRow>
              )
            })
          )}
        </DenseTableBody>
      </DenseDataTable>
    </div>
  )
}
