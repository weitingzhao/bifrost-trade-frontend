import { Button } from '@/components/ui/button'
import { FIN_STMT_GAP_INSTRUMENT_CODES } from '@/constants/stockDataReadiness'
import type { SepaReadinessSummaryResponse } from '@/types/stockDataReadiness'
import { fmt } from '@/utils/stockDataReadiness/format'
import {
  buildInstrumentSupportRows,
  supportBadge,
} from '@/utils/stockDataReadiness/instrumentTypeSupport'
import { readinessStepUi } from './stockDataReadinessStepUi'
import { cn } from '@/lib/utils'

function coverageBarClass(pct: number | null): string {
  if (pct == null) return 'bg-muted'
  if (pct >= 90) return 'bg-lamp-green'
  if (pct >= 60) return 'bg-lamp-yellow'
  return 'bg-lamp-red'
}

export function InstrumentTypeDataSupportSection({
  summary,
  checked,
  onCheckCoverage,
}: {
  summary: SepaReadinessSummaryResponse | null
  checked: boolean
  onCheckCoverage: () => void
}) {
  const rows = buildInstrumentSupportRows(summary)

  return (
    <div className="rounded-xl border border-border bg-secondary/30 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold tracking-tight">Instrument Type Data Support</h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-sky-400" onClick={onCheckCoverage}>
          {checked ? 'Checked' : 'Check Coverage'}
        </Button>
      </div>
      <div className="px-4 py-3">
        <p className={readinessStepUi.stepDesc}>
          Coverage matrix for statements + snapshot footprint by instrument type. Steps 4–7 count gaps
          only for Supported or Partial types here (
          <code>{FIN_STMT_GAP_INSTRUMENT_CODES.join(', ')}</code>); fully Not supported instrument types do
          not inflate gap counts. Under each statement column, <strong>distinct symbols</strong> counts join{' '}
          <code>tickers</code> on <code>symbol</code> (active US <code>stocks</code>,{' '}
          <code>source=massive</code> rows in <code>stock_*</code> tables).
        </p>
        {!checked ? (
          <div className={readinessStepUi.asideEmpty}>
            Click <strong>Check Coverage</strong> to load the instrument-type support matrix.
          </div>
        ) : (
          <div className={readinessStepUi.snapTableWrap}>
            <table className={readinessStepUi.snapTable}>
              <thead>
                <tr>
                  <th className={readinessStepUi.snapTh}>Code</th>
                  <th className={readinessStepUi.snapTh}>Description</th>
                  <th className={readinessStepUi.snapTh}>
                    Income
                    <span className="block text-dense-micro font-normal normal-case tracking-normal text-muted-foreground">
                      distinct symbols
                    </span>
                  </th>
                  <th className={readinessStepUi.snapTh}>
                    Balance
                    <span className="block text-dense-micro font-normal normal-case tracking-normal text-muted-foreground">
                      distinct symbols
                    </span>
                  </th>
                  <th className={readinessStepUi.snapTh}>
                    Cash flow
                    <span className="block text-dense-micro font-normal normal-case tracking-normal text-muted-foreground">
                      distinct symbols
                    </span>
                  </th>
                  <th className={readinessStepUi.snapTh}>
                    Ratios
                    <span className="block text-dense-micro font-normal normal-case tracking-normal text-muted-foreground">
                      distinct symbols
                    </span>
                  </th>
                  <th className={cn(readinessStepUi.snapTh, readinessStepUi.snapNum)}>Snapshot rows</th>
                  <th className={cn(readinessStepUi.snapTh, readinessStepUi.snapNum)}>Universe tickers</th>
                  <th className={readinessStepUi.snapTh}>Coverage</th>
                  <th className={readinessStepUi.snapTh}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ row, snapshot, fundamentals }, i) => {
                  const income = supportBadge(row.incomeStatements)
                  const balance = supportBadge(row.balanceSheets)
                  const cash = supportBadge(row.cashFlows)
                  const ratios = supportBadge(row.ratios)
                  const snapRows = snapshot?.snapshot_row_count ?? 0
                  const uniRows = snapshot?.universe_ticker_count ?? 0
                  const coveragePct = uniRows > 0 ? (snapRows / uniRows) * 100 : null
                  const isLast = i === rows.length - 1
                  const td = isLast ? readinessStepUi.snapTdLast : readinessStepUi.snapTd
                  return (
                    <tr key={row.code}>
                      <td className={cn(td, readinessStepUi.snapCode)}>
                        <span className={readinessStepUi.snapCodePill}>{row.code}</span>
                      </td>
                      <td className={td}>{row.description}</td>
                      <td className={td}>
                        <SupportFundCell badge={income} count={fundamentals?.income_statement_symbols} />
                      </td>
                      <td className={td}>
                        <SupportFundCell badge={balance} count={fundamentals?.balance_sheet_symbols} />
                      </td>
                      <td className={td}>
                        <SupportFundCell badge={cash} count={fundamentals?.cash_flow_symbols} />
                      </td>
                      <td className={td}>
                        <SupportFundCell badge={ratios} count={fundamentals?.ratio_symbols} />
                      </td>
                      <td className={cn(td, readinessStepUi.snapNum)}>{fmt(snapRows)}</td>
                      <td className={cn(td, readinessStepUi.snapNum)}>{fmt(uniRows)}</td>
                      <td className={td}>
                        {coveragePct == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex items-center gap-2 min-w-[7rem]">
                            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', coverageBarClass(coveragePct))}
                                style={{ width: `${Math.max(0, Math.min(100, coveragePct))}%` }}
                              />
                            </div>
                            <span className="font-mono text-dense-caption tabular-nums shrink-0">
                              {coveragePct.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className={cn(td, readinessStepUi.snapDim)}>{row.note ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function SupportFundCell({
  badge,
  count,
}: {
  badge: { text: string; className: string }
  count?: number
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={badge.className}>{badge.text}</span>
      {typeof count === 'number' && (
        <span className="font-mono text-dense-caption tabular-nums text-muted-foreground">{fmt(count)}</span>
      )}
    </div>
  )
}
