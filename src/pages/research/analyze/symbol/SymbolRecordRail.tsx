/**
 * `Record on <symbol>` — what each lens, and you, have been worth here.
 *
 * The design's third rail panel: one bar per lens ranked by its 20-day hit
 * rate, your own hand verdicts on the same scale at the top, and one line of
 * scope underneath. `symbolRecord.ts` holds what the data does and does not
 * support — chiefly that these records are pooled across the universe rather
 * than this name's own, and that nothing stores a hand verdict.
 *
 * This panel is where the old `Validation` card went. As a card it re-listed
 * readings the five cards beside it were already showing; ranked in the rail it
 * answers the one question those cards cannot — *of everything that has an
 * opinion on this name, which has been right?*
 */
import { SectionPanel } from '@/components/layout'
import { Link } from 'react-router-dom'
import { THIN_SAMPLE, type SymbolRecord } from '@/lib/symbolRecord'
import { cn } from '@/lib/utils'

function Bar({ hit, thin }: { hit: number; thin: boolean }) {
  return (
    <span className="relative block h-1.5 rounded-sm bg-secondary">
      <span
        className={cn(
          'absolute inset-y-0 left-0 rounded-sm',
          thin ? 'bg-warning/70' : hit >= 0.5 ? 'bg-[var(--color-profit)]/70' : 'bg-destructive/60',
        )}
        style={{ width: `${Math.max(2, Math.min(100, hit * 100))}%` }}
      />
    </span>
  )
}

export function SymbolRecordRail({
  symbol,
  record,
  loading,
}: {
  symbol: string
  record: SymbolRecord
  loading: boolean
}) {
  const { rows, unsettled, scopedCount } = record
  return (
    <SectionPanel
      cap={`Record on ${symbol}`}
      title="what each lens — and you — have been worth here"
    >
      {/* Your own row first, on the same scale as the lenses, because the
          design scores you by the same rule it scores them by. It reads
          `not recorded` rather than 0%: nothing accepts a hand verdict, so
          there is nothing to have been right or wrong about yet — the panel
          above says why. */}
      <div
        className="grid grid-cols-[minmax(0,1fr)_3.5rem_2.75rem] items-center gap-2 border-b border-border/50 bg-primary/[0.05] px-3 py-1.5"
        title="A hand verdict is the same artifact a judge persona writes — stance, one line, optional citations — and it would settle into the same record. No route accepts one, so there is none to score."
      >
        <span className="text-dense-label font-semibold">
          you · hand verdicts{' '}
          <span className="font-mono text-dense-micro font-normal text-muted-foreground">none</span>
        </span>
        <span className="h-1.5 rounded-sm bg-secondary" />
        <span className="text-right font-mono text-dense-micro text-muted-foreground">
          not recorded
        </span>
      </div>

      {loading && rows.length === 0 ? (
        <p className="px-3 py-3 text-dense-meta text-muted-foreground">Reading the records…</p>
      ) : rows.length === 0 ? (
        <p className="px-3 py-3 text-dense-meta text-muted-foreground">
          No lens has a settled 20-day record to show yet.
        </p>
      ) : (
        rows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[minmax(0,1fr)_3.5rem_2.75rem] items-center gap-2 border-b border-border/50 px-3 py-1.5"
            title={[
              `${r.n} triggers settled at 20 days`,
              r.thin ? `under ${THIN_SAMPLE}, so the rate is amber whatever it says` : null,
              r.scoped ? `on ${symbol} itself` : 'pooled across the universe, not this name',
            ]
              .filter(Boolean)
              .join(' · ')}
          >
            <span className="truncate text-dense-label text-muted-foreground">{r.label}</span>
            <Bar hit={r.hit} thin={r.thin} />
            <span
              className={cn(
                'text-right font-mono text-dense-label tabular-nums',
                r.thin
                  ? 'text-warning'
                  : r.hit >= 0.5
                    ? 'text-[var(--color-profit)]'
                    : 'text-destructive',
              )}
            >
              {Math.round(r.hit * 100)}%
            </span>
          </div>
        ))
      )}

      <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
        20-day hit rate, on the side each lens is sitting on today. Thin samples (n &lt;{' '}
        {THIN_SAMPLE}) are amber whatever the rate says — hover a row for its sample.{' '}
        {scopedCount === 0 ? (
          <>
            <span className="text-foreground/80">
              None of these is {symbol}&rsquo;s own record
            </span>
            : every lens answers <span className="font-mono">symbol_scoped: false</span>, so what
            is ranked here is the record pooled across the universe. The design asks for this name
            only, and the day the exhibit scopes them the same bars will say so.
          </>
        ) : scopedCount === rows.length ? (
          <>
            <span className="text-foreground/80">
              All {rows.length} are {symbol}&rsquo;s own record
            </span>
            , which is what the design asks for.
          </>
        ) : (
          <>
            <span className="text-foreground/80">
              {scopedCount} of {rows.length} are {symbol}&rsquo;s own record
            </span>
            ; the rest answer <span className="font-mono">symbol_scoped: false</span> and are
            ranked on the record pooled across the universe, which is a record — just not this
            name&rsquo;s. Hover a row to see which.
          </>
        )}
        {unsettled.length > 0 ? (
          <>
            {' '}
            Read but never settled at 20 days:{' '}
            <span className="text-foreground/80">{unsettled.join(', ')}</span>.
          </>
        ) : null}{' '}
        <Link to="/review/playbook-stats" className="text-primary hover:underline">
          Playbook stats →
        </Link>
      </p>
    </SectionPanel>
  )
}
