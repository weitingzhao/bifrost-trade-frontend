/**
 * How big — three caps, the smallest computed one wins.
 *
 * The tail cap keeps its bar and says it is not computed: the size beside it
 * is taken over the caps that were, and a missing cap can only leave the size
 * too large. Rev .24 asks for that to be visible, so each structure carries
 * `k of 3 caps` in the table and the grey tail line here.
 */
import { Link } from 'react-router-dom'
import { HOUSE_GATE_PCT } from '@/utils/backingJudgment'
import { fmtPct0 } from '@/utils/positions'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { cn } from '@/lib/utils'
import { recordLabel } from './compareModel'
import type { CompareRow } from './useCompareRows'

function Bar({
  label,
  n,
  max,
  binding,
  title,
  owed,
}: {
  label: string
  n: number | null
  max: number
  binding: boolean
  title: string
  owed?: string
}) {
  return (
    <div className="grid grid-cols-[132px_minmax(0,1fr)_34px] items-center gap-2" title={title}>
      <span className="truncate text-dense-micro text-muted-foreground">{label}</span>
      {owed ? (
        <span className="truncate text-dense-micro text-muted-foreground/70">{owed}</span>
      ) : (
        <span className="relative block h-[7px] overflow-hidden rounded-sm bg-secondary">
          <span
            className={cn('absolute inset-y-0 left-0', binding ? 'bg-primary' : 'bg-muted-foreground/40')}
            style={{ width: `${n == null ? 0 : Math.min(100, (n / Math.max(1, max)) * 100)}%` }}
          />
        </span>
      )}
      <span className={cn('text-right font-mono text-dense-meta tabular-nums', binding ? 'text-foreground' : 'text-muted-foreground')}>
        {n == null ? '—' : n}
      </span>
    </div>
  )
}

export function CompareHowBig({
  rows,
  sizeOf,
  spendable,
  recordsLoaded,
}: {
  rows: readonly CompareRow[]
  sizeOf: (r: CompareRow) => number | null
  spendable: number | null
  recordsLoaded: boolean
}) {
  const placed = rows.filter((r) => r.placement?.ok && r.caps)
  const max = Math.max(1, ...placed.flatMap((r) => [r.caps!.backing ?? 0, r.caps!.conviction ?? 0]))
  if (placed.length === 0) {
    return <p className="px-3 py-6 text-center text-dense-meta text-muted-foreground">Nothing is placed yet, so nothing is sized.</p>
  }
  return (
    <div className="space-y-3 px-3 py-2.5">
      {placed.map((r) => {
        const c = r.caps!
        const n = sizeOf(r)
        return (
          <div key={r.id} className="space-y-1">
            <div className="flex items-baseline gap-2 text-dense-meta">
              <span className="font-semibold text-foreground">{r.name}</span>
              <span className="font-mono font-bold text-foreground">{n == null ? '—' : `× ${n}`}</span>
              <span className="ml-auto text-dense-caption text-muted-foreground">
                {c.binding == null ? 'no cap read' : `${c.binding} binds · ${c.computed} of 3 caps`}
              </span>
            </div>
            <Bar
              label="tail ≤ 1.5% NAV"
              n={null}
              max={max}
              binding={false}
              title="The loss at the 20-day distribution's p10 must stay under 1.5% of NAV. That distribution is not computed on this side."
              owed="tail cap · needs the 20-day distribution — not computed"
            />
            <Bar
              label={`backing < ${fmtPct0(HOUSE_GATE_PCT)} gate`}
              n={c.backing}
              max={max}
              binding={c.binding === 'backing'}
              title={
                c.backing == null
                  ? 'Room to the backing gate is unread, or the structure has no backing figure.'
                  : `${spendable == null ? '—' : fmtMvAbbrev(spendable)} of room to the ${fmtPct0(HOUSE_GATE_PCT)} gate ÷ ${r.econ?.backing == null ? '—' : fmtMvAbbrev(r.econ.backing)} a unit`
              }
            />
            <Bar
              label="conviction · by structure"
              n={c.conviction}
              max={max}
              binding={c.binding === 'conviction'}
              title={
                r.record == null
                  ? recordsLoaded
                    ? 'No closed instance of this structure on record, so the rule has nothing to read.'
                    : 'The record is still loading.'
                  : `${recordLabel(r.record)} — ${c.allowance?.label ?? '—'} allowance (${c.allowance?.why ?? ''}), as a share of the backing cap.`
              }
            />
            <p className="pl-[140px] text-dense-micro text-muted-foreground">
              {r.record ? recordLabel(r.record) : 'no record by structure'}
              <span className="text-muted-foreground/60"> · regime split owed</span>
            </p>
          </div>
        )
      })}
      <p className="border-t border-border/60 pt-2 text-dense-caption leading-relaxed text-muted-foreground">
        Tail cap needs the 20-day distribution and is not computed. Backing cap = room to the {fmtPct0(HOUSE_GATE_PCT)} gate
        ÷ what one unit takes from the pool. Conviction cap comes from{' '}
        <Link to="/review/playbook-stats" className="text-primary hover:underline">
          Playbook stats
        </Link>
        ’ rule on the structure’s closed record — full allowance, half under the sample floor, none under the decay line — read by
        structure; the split by regime is owed.
      </p>
    </div>
  )
}
