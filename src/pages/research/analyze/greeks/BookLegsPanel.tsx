/**
 * The design's Legs table: every option leg, grouped by expiry, nearest first.
 */
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeadRow,
  DenseTableHeader,
  DenseTableRow,
  GroupHeaderRow,
  denseTableNumCell,
} from '@/components/data-display'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/utils/positions'
import { fmtPctFromFraction } from '@/lib/format'
import { withSymbolParam } from '@/lib/symbolLink'
import { ANALYZE_HUB } from '@/lib/analyzeHubs'
import { pnlColorClass } from '@/utils/dailyChange'
import { TIGHT_DTE, type BookLegRow, type ExpiryGroup } from './bookGreeksModel'

const NUM = cn(denseTableNumCell, 'font-mono tabular-nums')
/** Leg + nine readings — the colSpan every group heading spans. */
const COLS = 10

const signed0 = (v: number | null) => (v == null ? '—' : fmtUsd(v, true))

/**
 * The dense cell base is `max-w-0`, which squeezes a token column to nothing
 * on a wide table. The leg is the row's subject, so it gets a width and does
 * not wrap.
 */
function LegCell({ row, loading }: { row: BookLegRow; loading: boolean }) {
  return (
    <DenseTableCell className="w-[28ch] min-w-[28ch] whitespace-nowrap" title={row.token}>
      <Link
        to={withSymbolParam(ANALYZE_HUB.discovery, row.underlying)}
        className="font-mono text-entity-option hover:underline"
      >
        {row.token}
      </Link>
      {row.tight ? (
        <span className="ml-2 text-dense-micro font-bold text-warning" title="Short leg inside the tight line, or under 21 days">
          TIGHT
        </span>
      ) : null}
      {/* While the chains are still in flight every row looks unpriced, which
          is the one thing this badge must never say by accident. */}
      {row.unpriced && !loading ? (
        <span
          className="ml-2 text-dense-micro font-bold text-muted-foreground"
          title="No vendor row for this contract — counted out of the totals, never summed as zero"
        >
          UNPRICED
        </span>
      ) : null}
    </DenseTableCell>
  )
}

export function BookLegsPanel({
  groups,
  tightPct,
  loading,
  footer,
}: {
  groups: readonly ExpiryGroup[]
  tightPct: number
  loading: boolean
  footer: React.ReactNode
}) {
  return (
    <section className="overflow-hidden border mat-card">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Legs
        </span>
        <span className="text-dense-body font-semibold">grouped by expiry · nearest first</span>
        <span className="ml-auto text-dense-caption text-muted-foreground">
          tight = short leg inside {fmtPctFromFraction(tightPct, 0)} of strike or under {TIGHT_DTE} DTE
        </span>
      </header>
      <DenseDataTable wrapClassName="rounded-none border-0" tableClassName="min-w-[880px]">
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead className="w-[28ch] min-w-[28ch]">Leg</DenseTableHead>
            <DenseTableHead align="right">Qty</DenseTableHead>
            <DenseTableHead align="right">Mark</DenseTableHead>
            <DenseTableHead align="right">IV</DenseTableHead>
            <DenseTableHead align="right">Δ</DenseTableHead>
            <DenseTableHead align="right">Γ · per pt</DenseTableHead>
            <DenseTableHead align="right">Vega</DenseTableHead>
            <DenseTableHead align="right">Θ / d</DenseTableHead>
            <DenseTableHead align="right">DTE</DenseTableHead>
            <DenseTableHead align="right">Cushion</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
            {groups.map((g) => (
              <Fragment key={g.expiry}>
                <GroupHeaderRow
                  colSpan={COLS}
                  label={
                    <span className="inline-flex items-baseline gap-2">
                      <span className="uppercase tracking-[0.08em]">{g.label}</span>
                      <span className="font-mono font-normal text-muted-foreground">
                        · {g.rows.length} {g.rows.length === 1 ? 'contract' : 'contracts'}
                      </span>
                    </span>
                  }
                />
                {g.rows.map((r) => (
                  <DenseTableRow
                    key={r.ticker ?? r.token}
                    className={r.tight ? 'bg-warning-soft/15' : undefined}
                  >
                    <LegCell row={r} loading={loading} />
                    <DenseTableCell className={cn(NUM, r.qty < 0 ? 'text-loss' : 'text-profit')}>
                      {r.qty > 0 ? `+${r.qty}` : r.qty}
                    </DenseTableCell>
                    <DenseTableCell className={NUM}>
                      {r.mark == null ? '—' : fmtUsd(r.mark)}
                    </DenseTableCell>
                    <DenseTableCell className={cn(NUM, 'text-muted-foreground')}>
                      {r.iv == null ? '—' : fmtPctFromFraction(r.iv, 1)}
                    </DenseTableCell>
                    <DenseTableCell className={NUM}>
                      {r.delta == null ? '—' : r.delta.toFixed(1)}
                    </DenseTableCell>
                    <DenseTableCell className={cn(NUM, r.gamma != null && r.gamma < 0 ? 'text-warning' : undefined)}>
                      {signed0(r.gamma)}
                    </DenseTableCell>
                    <DenseTableCell className={cn(NUM, 'text-muted-foreground')}>
                      {signed0(r.vega)}
                    </DenseTableCell>
                    <DenseTableCell className={cn(NUM, r.theta == null ? undefined : pnlColorClass(r.theta))}>
                      {signed0(r.theta)}
                    </DenseTableCell>
                    <DenseTableCell className={cn(NUM, r.dte != null && r.dte < TIGHT_DTE ? 'text-warning' : 'text-muted-foreground')}>
                      {r.dte ?? '—'}
                    </DenseTableCell>
                    <DenseTableCell
                      className={cn(
                        NUM,
                        r.band === 'breached'
                          ? 'text-loss'
                          : r.band === 'tight'
                            ? 'text-warning'
                            : 'text-muted-foreground',
                      )}
                      title={
                        r.cushion == null
                          ? 'no spot for this underlying'
                          : r.band === 'breached'
                            ? 'in the money'
                            : 'room before the strike is in play'
                      }
                    >
                      {r.cushion == null ? '—' : fmtPctFromFraction(r.cushion, 1)}
                    </DenseTableCell>
                  </DenseTableRow>
                ))}
              </Fragment>
            ))}
            {groups.length === 0 ? (
              <DenseTableRow>
                <DenseTableCell colSpan={COLS} className="text-muted-foreground">
                  The book holds no option legs.
                </DenseTableCell>
              </DenseTableRow>
            ) : null}
        </DenseTableBody>
      </DenseDataTable>
      <div className="border-t border-border px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
        {footer}
      </div>
    </section>
  )
}
