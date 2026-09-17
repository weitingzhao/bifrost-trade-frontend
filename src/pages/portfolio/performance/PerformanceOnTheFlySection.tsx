import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { perfUi } from './performanceUi'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { usePerformanceOnTheFly } from '@/hooks/usePerformanceOnTheFly'
import type { PerformanceTimeRange } from '@/utils/ledger/performanceUtils'
import { fmtChicagoTime } from '@/pages/portfolio/performance/performanceFormatters'
import { OTF_STK_UNREALIZED_HELP } from '@/pages/portfolio/performance/performanceConstants'
import { fmtSignedUsd0 } from '@/pages/portfolio/performance/performanceReading'
import { buildOtfRows, otfCountLabel, type OtfRow } from '@/pages/portfolio/performance/performanceOnTheFly'

interface PerformanceOnTheFlySectionProps {
  timeRange: PerformanceTimeRange
  calendarMonth: string
  strategyOpportunityId: number | null
  strategyInstanceId: number | null
  /** Open the On the fly derivation: which TWS fills end up here. */
  onExplain?: () => void
}

const OPT_UNREALIZED_HELP =
  'Option legs use the same per-execution cash flow as Trade Ledger → Options → Details. Pairing uses backend opt pairs when available, else FIFO by contract.'

const LEG_VALUE_HELP =
  'Option rows: the premium by side, as the ledger shows it. Stock rows: shares × price, long positive. The unmatched legs sum to the Unrealized figures above.'

/** The prototype's two greys are one colour on the Portfolio skin. */
const dim = 'text-muted-foreground'
const th = 'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption leading-normal font-semibold text-secondary-foreground'
const td = 'whitespace-nowrap border-b border-border/55 px-2 py-1.25 text-right font-mono text-xs leading-normal tabular-nums'

function money(v: number | null): string {
  return v == null || Math.abs(v) < 0.5 ? '—' : fmtSignedUsd0(v)
}

function directionInk(v: number | null): string {
  return v == null || Math.abs(v) < 0.5 ? dim : pnlColorClass(v)
}

export function PerformanceOnTheFlySection({
  timeRange,
  calendarMonth,
  strategyOpportunityId,
  strategyInstanceId,
  onExplain,
}: PerformanceOnTheFlySectionProps) {
  const [open, setOpen] = useState(false)

  // Fetched while collapsed too: the header says how many fills there are and what they made.
  const { data, isLoading, isError, error } = usePerformanceOnTheFly({
    enabled: true,
    timeRange,
    calendarMonth,
    strategyOpportunityId,
    strategyInstanceId,
  })

  const rows = useMemo(() => buildOtfRows(data?.executions ?? []), [data?.executions])
  const net = data?.perf.summary?.net_pnl ?? null

  const count = isLoading ? 'loading…' : isError ? 'failed to load' : data ? otfCountLabel(rows) : ''

  return (
    <section className={perfUi.panel} aria-label="On the fly executions">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          perfUi.panelToggle,
          'text-dense-body leading-normal hover:bg-[var(--sk-raised2)]',
          open ? 'rounded-t-md' : 'rounded-md',
        )}
      >
        <span className="w-2.5 text-muted-foreground">{open ? '▾' : '▸'}</span>
        <span className={cn(perfUi.cap, 'leading-normal')}>On the fly</span>
        <span className={cn(perfUi.panelTitle, 'leading-normal')}>outside every strategy</span>
        <span className={cn(perfUi.mono, 'text-xs leading-normal text-muted-foreground')}>{count}</span>
        {net != null && rows.length > 0 ? (
          <span className={cn(perfUi.mono, 'ml-auto text-dense-body leading-normal font-bold', directionInk(net))}>
            {fmtSignedUsd0(net)}
          </span>
        ) : null}
      </button>

      {open && (
        <div>
          {isError && (
            <p className="m-0 px-3 py-2 text-dense-meta text-destructive">{error?.message ?? 'Failed to load on-the-fly data'}</p>
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <p className={cn('m-0 px-3 py-2 text-dense-meta', dim)}>No on-the-fly fills in this range.</p>
          )}
          {!isLoading && !isError && rows.length > 0 && (
            <>
              {data?.computed != null && <SecTypeStrip rows={rows} computed={data.computed} />}
              <div className="overflow-x-auto">
                {/* §14.6: the prototype's 620 floor plus a Date column. */}
                <table className="w-full min-w-[700px] border-collapse">
                  <thead>
                    <tr>
                      <th className={cn(th, 'text-left')}>Date</th>
                      <th className={cn(th, 'text-left')}>Fill</th>
                      <th className={th}>Qty</th>
                      <th className={th}>Price</th>
                      <th className={th}>Comm</th>
                      <th className={th}>Realized</th>
                      <th className={th} title={LEG_VALUE_HELP}>
                        Leg value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <OnTheFlyRow key={r.key} row={r} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <footer className={cn(perfUi.panelFoot, 'py-1.75 leading-normal')}>
            Grouped by sec type. TWS fills the Flex or journal book already records are left out, and so are BAG combo
            legs, so a combo is not counted twice.{' '}
            {onExplain ? (
              <button type="button" className={cn(perfUi.link, 'leading-normal')} onClick={onExplain}>
                how these fills are chosen →
              </button>
            ) : null}
          </footer>
        </div>
      )}
    </section>
  )
}

function SecTypeStrip({
  rows,
  computed,
}: {
  rows: OtfRow[]
  computed: { opt: { realized: number; unrealized: number }; stk: { realized: number; unrealized: number } }
}) {
  const groups = [
    { id: 'OPT', label: 'Options', agg: computed.opt, help: OPT_UNREALIZED_HELP },
    { id: 'STK', label: 'Stocks', agg: computed.stk, help: OTF_STK_UNREALIZED_HELP },
  ]
    .map((g) => ({ ...g, rows: rows.filter((r) => r.group === g.id) }))
    .filter((g) => g.rows.length > 0)
  if (groups.length === 0) return null
  return (
    <div className="flex flex-col gap-1 border-b border-border px-3 py-2" aria-label="On the fly by sec type">
      {groups.map((g) => {
        const comm = g.rows.reduce((s, r) => s + (Number(r.comm) || 0), 0)
        return (
          <div key={g.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-dense-meta">
            <span className="w-16 font-semibold text-secondary-foreground">{g.label}</span>
            <span className={dim}>
              {g.rows.length} {g.rows.length === 1 ? 'fill' : 'fills'}
            </span>
            <span className="text-muted-foreground">
              Realized (FIFO){' '}
              <span className={cn(perfUi.mono, 'font-semibold', directionInk(g.agg.realized))}>{money(g.agg.realized)}</span>
            </span>
            <span className="inline-flex items-baseline gap-1 text-muted-foreground">
              Unrealized (open){' '}
              <span className={cn(perfUi.mono, 'text-secondary-foreground')}>{money(g.agg.unrealized)}</span>
              <InfoTooltip text={g.help} />
            </span>
            <span className="text-muted-foreground">
              Comm <span className={cn(perfUi.mono, dim)}>{comm.toFixed(2)}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function OnTheFlyRow({ row: r }: { row: OtfRow }) {
  return (
    <tr
      className="hover:[&>td]:bg-[var(--sk-raised2)]"
      title={`${r.account} · exec ${r.execId} · ${fmtChicagoTime(r.time)} CT`}
    >
      <td className={cn(td, 'text-left text-secondary-foreground')}>{r.date}</td>
      <td className={cn(td, 'text-left')}>
        <span className={cn(perfUi.mono, perfUi.sky, 'font-bold')}>{r.sym}</span>{' '}
        <span className="text-muted-foreground">{r.what}</span>{' '}
        <span className={cn('font-sans', dim)}>{r.group}</span>
      </td>
      <td className={cn(td, 'text-secondary-foreground')}>{r.qty}</td>
      <td className={cn(td, 'text-secondary-foreground')}>{r.price}</td>
      <td className={cn(td, dim)}>{r.comm}</td>
      <td className={cn(td, 'font-semibold', directionInk(r.realized))}>{money(r.realized)}</td>
      <td className={cn(td, 'text-secondary-foreground')}>{money(r.legValue)}</td>
    </tr>
  )
}
