/**
 * Single trade's right-hand column: the verdict, the timeline, the tags and
 * what the page is reading.
 *
 * The verdict the design draws is a cell of the 2×2 — plan quality against
 * adherence — and it stays marked, because the plan half is what is absent.
 * What the path *can* say is said underneath it rather than dressed up as the
 * verdict: how much of the best mark the exit landed, and what the position
 * marked against me on the way.
 */
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtIsoDateToken } from '@/lib/format'
import { fmtUsd, fmtPct0 } from '@/utils/positions'
import type { MarkPath } from '@/utils/reviewMarkPath'
import type { ReviewTrade } from '@/utils/reviewTrades'
import type { DerivedTag, SourceRow, TimelineStage, Tone } from './tradeFitModel'

const TONE_TEXT: Record<Tone, string> = {
  success: 'text-[var(--color-profit)]',
  warning: 'text-warning',
  danger: 'text-[var(--color-loss)]',
  neutral: 'text-muted-foreground',
}

/** §14.7 ②: P&L colours go on signed numbers; a bordered box takes a lamp colour. */
const TONE_BORDER: Record<Tone, string> = {
  success: 'border-success/40',
  warning: 'border-warning/40',
  danger: 'border-danger/40',
  neutral: 'border-border',
}

export function VerdictPanel({ trade, markPath }: { trade: ReviewTrade; markPath: MarkPath | null }) {
  return (
    <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Verdict">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Verdict</span>
        <span className="ml-auto">
          <DenseTag variant="warning" size="cell">
            ⚠ NO PLAN TO JUDGE
          </DenseTag>
        </span>
      </header>
      <p className="m-0 px-3 py-2 text-dense-body leading-normal text-secondary-foreground text-pretty">
        The design&rsquo;s verdict is one cell of the 2×2 — good plan or weak, followed or broken. Both axes need the
        plan this position was opened under, and none is linked, so the cell is withheld. The{' '}
        <span className={pnlText(trade.realised)}>{fmtUsd(trade.realised, true)}</span> is real and says nothing about
        judgement on its own.
      </p>
      {markPath == null ? null : (
        <p className="m-0 border-t border-border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
          What the path alone says: the exit landed{' '}
          <span className="font-semibold text-secondary-foreground">{fmtPct0(markPath.captureOfBest)}</span> of the
          best mark this position ever printed
          {markPath.everUnderwater ? (
            <>
              , and it marked{' '}
              <span className="font-semibold text-[var(--color-loss)]">{fmtUsd(markPath.worst, true)}</span> against me
              on {fmtIsoDateToken(markPath.worstDate)} on the way
            </>
          ) : (
            ', and it never marked below the entry'
          )}
          . Neither is a judgement — they are the ceiling and the floor any judgement would be measured between.
        </p>
      )}
    </section>
  )
}

function pnlText(v: number): string {
  return v >= 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'
}

export function TimelinePanel({ stages }: { stages: readonly TimelineStage[] }) {
  return (
    <section className={positionsUi.panel} aria-label="Timeline">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Timeline</span>
        <span className={positionsUi.panelTitle}>Plan → fills → exit</span>
      </header>
      <div className="flex flex-col gap-1.5 px-3 py-2.5">
        {stages.map((s) => (
          <div key={s.key} className={cn('min-w-0 rounded-md border bg-[var(--sk-raised2)] px-2.5 py-1.75', TONE_BORDER[s.tone])}>
            <div className="flex items-baseline gap-2">
              <span className={cn(positionsUi.cap, 'tracking-[0.07em]', TONE_TEXT[s.tone])}>{s.stage}</span>
              <span className="min-w-0 truncate text-dense-body font-semibold text-foreground">{s.title}</span>
              <span className={cn(positionsUi.mono, 'ml-auto whitespace-nowrap text-dense-meta text-muted-foreground')}>
                {s.when ? fmtIsoDateToken(s.when) : '—'}
              </span>
            </div>
            <p className="m-0 pt-0.5 text-dense-meta leading-normal text-muted-foreground text-pretty">{s.sub}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function TagsPanel({ tags }: { tags: readonly DerivedTag[] }) {
  const readable = tags.filter((t) => !t.unreadable).length
  return (
    <section className={positionsUi.panel} aria-label="Tags">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Tags</span>
        <span className={positionsUi.panelTitle}>Auto-derived</span>
        <span className="ml-auto text-dense-meta text-muted-foreground">
          {readable} from the path · nothing stores a dropped tag
        </span>
      </header>
      <div className="flex flex-col gap-1.5 px-3 py-2.5">
        {tags.map((t) => (
          <div
            key={t.key}
            className={cn(
              'min-w-0 rounded-md border px-2.5 py-1.75',
              t.unreadable ? 'border-border bg-transparent' : cn(TONE_BORDER[t.tone], 'bg-[var(--sk-raised2)]'),
            )}
          >
            <div className="flex items-baseline gap-2">
              <span className={cn('text-dense-body font-semibold', TONE_TEXT[t.tone])}>{t.label}</span>
              <span className={cn(positionsUi.mono, 'ml-auto text-dense-caption uppercase text-muted-foreground')}>
                {t.unreadable ? 'n/c' : 'auto'}
              </span>
            </div>
            <p className="m-0 pt-0.5 text-dense-meta leading-normal text-muted-foreground text-pretty">{t.why}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function SourcesPanel({ rows }: { rows: readonly SourceRow[] }) {
  return (
    <section className={positionsUi.panel} aria-label="Data">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Data</span>
        <span className={positionsUi.panelTitle}>What this page is reading</span>
      </header>
      <div className="flex flex-col">
        {rows.map((r) => (
          <div
            key={r.key}
            className="grid grid-cols-[0.75rem_minmax(0,1fr)] items-start gap-2.5 border-b border-border/55 px-3 py-1.75 last:border-b-0"
          >
            <span className="pt-1">
              <StatusLamp lamp={r.lamp} variant="dot" title={r.title} />
            </span>
            <span className="min-w-0">
              <span className="block text-dense-body text-foreground">{r.title}</span>
              <span className="block pt-0.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
                {r.sub}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
