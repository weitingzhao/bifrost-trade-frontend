import type { ReactNode } from 'react'
import type { LedgerMetricExplainPayload } from '@/utils/ledger/ledgerSummaryExplainPayload'
import type { LedgerMetricExplainKind } from '@/utils/ledger/ledgerMetricExplainKinds'
import { LEDGER_METRIC_EXPLAIN_MAX_ROWS } from '@/utils/ledger/ledgerSummaryExplainPayload'
function SectionTitle({ n, children }: { n: 1 | 2 | 3 | 4; children: ReactNode }) {
  return (
    <h4 className="mt-3 mb-1.5 text-sm font-semibold text-foreground first:mt-0">
      {n}. {children}
    </h4>
  )
}

function ExplainList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground leading-relaxed">{children}</ul>
}

function ExplainSteps({ children }: { children: ReactNode }) {
  return (
    <ol className="list-decimal space-y-2 pl-4 text-xs text-muted-foreground leading-relaxed marker:font-medium">
      {children}
    </ol>
  )
}

function FormulaBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="mt-1.5 overflow-x-auto rounded-md border border-border/60 bg-muted/40 px-2.5 py-2 font-mono text-dense-caption leading-relaxed whitespace-pre-wrap text-foreground">
      {children}
    </pre>
  )
}

function LiveExample({ payload }: { payload: LedgerMetricExplainPayload }) {
  return (
    <>
      <SectionTitle n={4}>Live example — current Summary</SectionTitle>
      <p className="text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">Trade ledger tab:</strong> {payload.ledgerTabLabel}
        {' · '}
        <strong className="text-foreground">Summary period mode:</strong> {payload.summaryPeriodModeLabel}
        {' · '}
        <strong className="text-foreground">Bucket:</strong> {payload.bucketLabel}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed">
        <strong>{payload.metricLabel}</strong> — value shown in the grid:{' '}
        <strong>{payload.displayedFormatted}</strong>
        {Number.isFinite(payload.displayedRaw) && (
          <span className="text-muted-foreground"> (numeric: {payload.displayedRaw.toFixed(4)})</span>
        )}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Substitution with rows in this bucket:</p>
      {payload.formulaLines.map((line, i) => (
        <pre
          key={i}
          className="mt-1 overflow-x-auto rounded bg-muted/50 px-2 py-1 font-mono text-dense-caption whitespace-pre-wrap"
        >
          {line}
        </pre>
      ))}
      {payload.emptyMessage ? (
        <p className="mt-1 text-xs text-muted-foreground">{payload.emptyMessage}</p>
      ) : null}
      {payload.detailRows.length > 0 ? (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-dense-caption">
            <thead>
              <tr className="border-b border-border">
                {payload.detailColumnHeaders.map(h => (
                  <th key={h} className="py-1 pr-2 text-left font-semibold text-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payload.detailRows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/40">
                  {payload.detailColumnHeaders.map(h => (
                    <td key={h} className="py-0.5 pr-2 font-mono text-muted-foreground">
                      {String((row as Record<string, unknown>)[h] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {payload.truncatedCount > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              … and {payload.truncatedCount} more row(s) not shown (display limit{' '}
              {LEDGER_METRIC_EXPLAIN_MAX_ROWS}).
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
    <div className="space-y-1 text-xs">
      {kind === 'options_period_realized' && (
        <>
          <SectionTitle n={1}>Raw data sources</SectionTitle>
          <ExplainList>
            <li>
              <strong className="text-foreground">API:</strong>{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-dense-caption">GET /executions</code> with{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-dense-caption">source_scope=performance_book</code>{' '}
              — server reads finalized executions (e.g.{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-dense-caption">account_executions_final</code>).
            </li>
            <li>
              <strong className="text-foreground">UI rows:</strong> each execution has{' '}
              <code className="font-mono">time</code> (Unix seconds), <code className="font-mono">sec_type</code>,{' '}
              <code className="font-mono">symbol</code>, <code className="font-mono">expiry</code>,{' '}
              <code className="font-mono">strike</code>, <code className="font-mono">option_right</code>, etc.
            </li>
            <li>
              <strong className="text-foreground">Groups:</strong>{' '}
              <code className="font-mono">buildOptExecutionGroups(executions)</code> produces{' '}
              <code className="font-mono">OptExecutionGroup[]</code>. Each group has <code className="font-mono">status</code>,{' '}
              <code className="font-mono">realized_pnl</code>, <code className="font-mono">trades[]</code>.
            </li>
            <li>
              <strong className="text-foreground">Closed PnL field:</strong> for{' '}
              <code className="font-mono">status === &apos;realized&apos;</code>,{' '}
              <code className="font-mono">realized_pnl</code> is the group-level closed PnL from fills (cash flow and
              commission), not a single raw IB column.
            </li>
          </ExplainList>
          <SectionTitle n={2}>Formula and calculation</SectionTitle>
          <ExplainSteps>
            <li>
              Let <code className="font-mono">G</code> be the set of groups with{' '}
              <code className="font-mono">status === &apos;realized&apos;</code> after Trade ledger filters.
            </li>
            <li>
              For each <code className="font-mono">g ∈ G</code>, assign calendar month{' '}
              <code className="font-mono">m(g) = YYYY-MM</code> from{' '}
              <code className="font-mono">max( t.time | t ∈ g.trades )</code> (UTC, from Unix seconds).
            </li>
            <li>
              Map <code className="font-mono">m(g)</code> to the selected Summary period key <code className="font-mono">P</code>{' '}
              (Month / Quarter / Half-year / Year).
            </li>
            <li>
              For the cell labeled period key <code className="font-mono">P*</code>:
              <FormulaBlock>
                {`value(P*) = Σ  g.realized_pnl
  over all g ∈ G such that periodKey(m(g)) = P*`}
              </FormulaBlock>
            </li>
          </ExplainSteps>
          <SectionTitle n={3}>Result on screen</SectionTitle>
          <ExplainList>
            <li>USD with no decimals in the Summary grid.</li>
            <li>
              Color: <span className="text-[var(--color-success)]">positive</span> &gt; 0,{' '}
              <span className="text-[var(--color-danger)]">negative</span> &lt; 0, muted gray for exactly 0.
            </li>
            <li>
              Same row also shows <code className="font-mono">N groups</code> and the period label (e.g.{' '}
              <code className="font-mono">2026-03</code>).
            </li>
          </ExplainList>
        </>
      )}

      {kind === 'options_total_realized' && (
        <>
          <SectionTitle n={1}>Raw data sources</SectionTitle>
          <ExplainList>
            <li>
              Same as period cells: <code className="font-mono">GET /executions</code> (
              <code className="font-mono">performance_book</code>) → <code className="font-mono">buildOptExecutionGroups</code>{' '}
              → closed groups with <code className="font-mono">realized_pnl</code>.
            </li>
            <li>Trade ledger filters apply before the sum.</li>
          </ExplainList>
          <SectionTitle n={2}>Formula and calculation</SectionTitle>
          <p className="text-xs text-muted-foreground">
            Let <code className="font-mono">G</code> be all closed option groups in scope after filters.
          </p>
          <FormulaBlock>
            {`totalRealizedPnL = Σ  g.realized_pnl
  for g ∈ G where g.status === 'realized'`}
          </FormulaBlock>
          <p className="mt-1 text-xs text-muted-foreground">
            The period grid above does not change this total — it is the full sum over the same filtered closed groups.
          </p>
          <SectionTitle n={3}>Result on screen</SectionTitle>
          <ExplainList>
            <li>
              Shown in the <strong className="text-foreground">Total</strong> box next to the group count.
            </li>
            <li>Color follows the sign of the total (same rules as period cells).</li>
          </ExplainList>
        </>
      )}

      {kind === 'stocks_period_realized' && (
        <>
          <SectionTitle n={1}>Raw data sources</SectionTitle>
          <ExplainList>
            <li>
              <strong className="text-foreground">API:</strong> <code className="font-mono">GET /executions</code> — same
              Trade ledger feed as the table.
            </li>
            <li>
              <strong className="text-foreground">Stock filter:</strong> <code className="font-mono">sec_type === STK</code>{' '}
              after filters and Stocks category tab when applicable.
            </li>
            <li>
              <strong className="text-foreground">Per-fill PnL:</strong> <code className="font-mono">execution.realized_pnl</code>{' '}
              from IB commission report; missing → 0 in the sum.
            </li>
            <li>
              <strong className="text-foreground">Time for bucketing:</strong> <code className="font-mono">execution.time</code>{' '}
              (UTC month).
            </li>
          </ExplainList>
          <SectionTitle n={2}>Formula and calculation</SectionTitle>
          <ExplainSteps>
            <li>
              Let <code className="font-mono">E</code> be in-scope stock executions.
            </li>
            <li>
              Month bucket <code className="font-mono">m(e) = YYYY-MM</code> from <code className="font-mono">e.time</code> (UTC).
            </li>
            <li>Roll into Summary period key <code className="font-mono">P</code>.</li>
            <li>
              For period key <code className="font-mono">P*</code>:
              <FormulaBlock>
                {`realizedPnL(P*) = Σ  COALESCE(e.realized_pnl, 0)
  for e ∈ E such that periodKey(m(e)) = P*`}
              </FormulaBlock>
            </li>
          </ExplainSteps>
          <SectionTitle n={3}>Result on screen</SectionTitle>
          <ExplainList>
            <li>Colored value on the same line as <code className="font-mono">N trades</code>.</li>
            <li>
              <strong className="text-foreground">Notional</strong> on the line below is a separate metric.
            </li>
          </ExplainList>
        </>
      )}

      {kind === 'stocks_period_notional' && (
        <>
          <SectionTitle n={1}>Raw data sources</SectionTitle>
          <ExplainList>
            <li>Same execution rows as this period cell (same filters and bucket).</li>
            <li>
              Fields: <code className="font-mono">quantity</code>, <code className="font-mono">price</code>.
            </li>
          </ExplainList>
          <SectionTitle n={2}>Formula and calculation</SectionTitle>
          <FormulaBlock>{`notional(e) = |quantity(e)| × price(e)`}</FormulaBlock>
          <FormulaBlock>{`notional(P*) = Σ  notional(e)  for e in the same bucket as P*`}</FormulaBlock>
          <SectionTitle n={3}>Result on screen</SectionTitle>
          <ExplainList>
            <li>
              Second line in the cell: <strong className="text-foreground">Notional</strong> + USD amount (trade size, not PnL).
            </li>
          </ExplainList>
        </>
      )}

      {kind === 'stocks_total_realized' && (
        <>
          <SectionTitle n={1}>Raw data sources</SectionTitle>
          <ExplainList>
            <li>Same as Stocks table: filtered STK executions.</li>
            <li>
              Field: <code className="font-mono">realized_pnl</code> per execution.
            </li>
          </ExplainList>
          <SectionTitle n={2}>Formula and calculation</SectionTitle>
          <FormulaBlock>
            {`totalRealizedPnL = Σ  COALESCE(e.realized_pnl, 0)
  for all stock executions e in scope`}
          </FormulaBlock>
          <SectionTitle n={3}>Result on screen</SectionTitle>
          <ExplainList>
            <li>In the <strong className="text-foreground">Total</strong> box after trade count.</li>
          </ExplainList>
        </>
      )}

      {kind === 'stocks_total_unrealized' && (
        <>
          <SectionTitle n={1}>Raw data sources</SectionTitle>
          <ExplainList>
            <li>
              <code className="font-mono">GET /status</code> → portfolio positions (IB snapshot). Not on execution rows.
            </li>
            <li>Keys: <code className="font-mono">account_id</code> + STK <code className="font-mono">contract_key</code>.</li>
          </ExplainList>
          <SectionTitle n={2}>Formula and calculation</SectionTitle>
          <FormulaBlock>
            {`totalUnrealized = Σ  U(k)   over distinct (account, STK key) with a position row`}
          </FormulaBlock>
          <SectionTitle n={3}>Result on screen</SectionTitle>
          <ExplainList>
            <li>
              <strong className="text-foreground">Total</strong> box: label <code className="font-mono">U</code> + amount when any
              position exists.
            </li>
          </ExplainList>
        </>
      )}

      {kind === 'stocks_total_notional' && (
        <>
          <SectionTitle n={1}>Raw data sources</SectionTitle>
          <ExplainList>
            <li>All in-scope stock executions after filters.</li>
          </ExplainList>
          <SectionTitle n={2}>Formula and calculation</SectionTitle>
          <FormulaBlock>
            {`totalNotional = Σ  |quantity(e)| × price(e)`}
          </FormulaBlock>
          <SectionTitle n={3}>Result on screen</SectionTitle>
          <ExplainList>
            <li>
              <strong className="text-foreground">Total</strong> box: prefix <code className="font-mono">nv</code> + amount.
            </li>
          </ExplainList>
        </>
      )}

      <LiveExample payload={payload} />
    </div>
  )
}
