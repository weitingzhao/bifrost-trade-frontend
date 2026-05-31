import type { ReactNode } from 'react'
import type { LedgerMetricExplainPayload } from '@/utils/ledger/ledgerSummaryExplainPayload'
import type { LedgerMetricExplainKind } from '@/utils/ledger/ledgerMetricExplainKinds'
import { LEDGER_METRIC_EXPLAIN_MAX_ROWS } from '@/utils/ledger/ledgerSummaryExplainPayload'

function SectionTitle({ n, children }: { n: number; children: ReactNode }) {
  return <h4 className="font-semibold text-foreground mt-3 mb-1 first:mt-0">{n}. {children}</h4>
}

function LiveExample({ payload }: { payload: LedgerMetricExplainPayload }) {
  return (
    <>
      <SectionTitle n={4}>Live example — current Summary</SectionTitle>
      <p className="text-muted-foreground">
        <strong>Trade ledger tab:</strong> {payload.ledgerTabLabel}
        {' · '}
        <strong>Summary period mode:</strong> {payload.summaryPeriodModeLabel}
        {' · '}
        <strong>Bucket:</strong> {payload.bucketLabel}
      </p>
      <p>
        <strong>{payload.metricLabel}</strong> — value shown in the grid:{' '}
        <strong>{payload.displayedFormatted}</strong>
        {Number.isFinite(payload.displayedRaw) && (
          <span className="text-muted-foreground"> (numeric: {payload.displayedRaw.toFixed(4)})</span>
        )}
      </p>
      {payload.formulaLines.map((line, i) => (
        <pre key={i} className="mt-1 rounded bg-muted/50 px-2 py-1 font-mono text-[10px] whitespace-pre-wrap">
          {line}
        </pre>
      ))}
      {payload.emptyMessage ? (
        <p className="text-muted-foreground mt-1">{payload.emptyMessage}</p>
      ) : null}
      {payload.detailRows.length > 0 ? (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                {payload.detailColumnHeaders.map(h => (
                  <th key={h} className="text-left py-1 pr-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payload.detailRows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/50">
                  {payload.detailColumnHeaders.map(h => (
                    <td key={h} className="py-0.5 pr-2 font-mono">{String(row[h] ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {payload.truncatedCount > 0 ? (
            <p className="text-muted-foreground mt-1">
              … and {payload.truncatedCount} more row(s) not shown (limit {LEDGER_METRIC_EXPLAIN_MAX_ROWS}).
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

export function LedgerMetricExplainContent({
  kind,
  payload,
}: {
  kind: LedgerMetricExplainKind
  payload: LedgerMetricExplainPayload
}) {
  return (
    <div className="space-y-1">
      {kind.startsWith('options_') && (
        <>
          <SectionTitle n={1}>Raw data sources</SectionTitle>
          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
            <li>GET /executions with performance_book scope → buildOptExecutionGroups → closed groups with realized_pnl.</li>
            <li>Trade ledger filters apply before bucketing and sums.</li>
          </ul>
          <SectionTitle n={2}>Formula</SectionTitle>
          <p className="text-muted-foreground">
            Sum group.realized_pnl for closed option groups in the selected period bucket (or all groups for Total).
          </p>
          <SectionTitle n={3}>On screen</SectionTitle>
          <p className="text-muted-foreground">USD with no decimals; color follows sign (green / red / muted).</p>
        </>
      )}
      {kind.startsWith('stocks_') && (
        <>
          <SectionTitle n={1}>Raw data sources</SectionTitle>
          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
            <li>STK executions from GET /executions after Trade ledger filters.</li>
            <li>Realized PnL from execution.realized_pnl; notional = |qty| × price per fill.</li>
            <li>Unrealized total uses GET /status portfolio snapshot for distinct STK keys.</li>
          </ul>
          <SectionTitle n={2}>Formula</SectionTitle>
          <p className="text-muted-foreground">
            Period cells bucket by execution.time (UTC month) then aggregate per Summary period mode.
          </p>
        </>
      )}
      <LiveExample payload={payload} />
    </div>
  )
}
