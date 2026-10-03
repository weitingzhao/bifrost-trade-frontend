/**
 * Trade review's right-hand column: the verdict, the timeline, the tags and
 * what the page is reading.
 *
 * The verdict the design draws is a cell of the 2×2 — plan quality against
 * adherence — and it stays marked, because the plan half is what is absent.
 * What the path *can* say is said underneath it rather than dressed up as the
 * verdict: how much of the best mark the exit landed, and what the position
 * marked against me on the way.
 */
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtIsoDateToken } from '@/lib/format'
import { fmtUsd, fmtPct0 } from '@/utils/positions'
import type { MarkPath } from '@/utils/reviewMarkPath'
import type { ReviewContract } from '@/utils/reviewContracts'
import type { DerivedTag, SourceRow, TimelineStage, Tone } from './tradeFitModel'

/**
 * A stage or a tag is a state, not a signed figure (§14.8, Rev .90): good is
 * the state green, a caution amber, a bad state the red — never the profit /
 * loss inks, which belong to the dollars beside them.
 */
const TONE_TEXT: Record<Tone, string> = {
  success: 'text-[var(--sk-state-green)]',
  warning: 'text-warning',
  danger: 'text-destructive',
  neutral: 'text-muted-foreground',
}

/**
 * The same tones as an edge. Inline, because `mat-card` clears border-colour
 * classes (unlayered rule) — the class version drew no edge at all.
 */
const TONE_EDGE: Record<Tone, { borderColor: string } | undefined> = {
  success: { borderColor: 'color-mix(in srgb, var(--sk-state-green) 40%, transparent)' },
  warning: { borderColor: 'color-mix(in srgb, var(--color-warning) 40%, transparent)' },
  danger: { borderColor: 'color-mix(in srgb, var(--destructive) 40%, transparent)' },
  neutral: undefined,
}

export function VerdictPanel({ trade, markPath }: { trade: ReviewContract; markPath: MarkPath | null }) {
  return (
    <section className={positionsUi.panel} style={TONE_EDGE.warning} aria-label="Verdict">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Verdict</span>
        <span className="ml-auto flex items-center gap-1.5">
          {trade.exitKind === 'open' ? (
            <DenseTag variant="neutral" size="cell">
              provisional
            </DenseTag>
          ) : null}
          <DenseTag variant="warning" size="cell">
            no plan to judge
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
              <span className="font-semibold text-loss">{fmtUsd(markPath.worst, true)}</span> against me
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

/** The realised figure is signed money — the direction inks are right here. */
function pnlText(v: number): string {
  return v >= 0 ? 'text-profit' : 'text-loss'
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
          <div key={s.key} className="min-w-0 border px-2.5 py-1.75 mat-card" style={TONE_EDGE[s.tone]}>
            <div className="flex items-baseline gap-2">
              <span className={cn(positionsUi.cap, TONE_TEXT[s.tone])}>{s.stage}</span>
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

/**
 * Tags, and the review itself (design Rev .110). Derived tags come off the path;
 * the reader may drop one that does not apply and add one the rules missed.
 * Confirm review stamps the instance done and moves on. The record is
 * `trade_review` — one row per instance, read by Queue and the Review badge.
 */
export function TagsPanel({
  tags,
  added,
  dropped,
  reviewed,
  confirmBlocked,
  saving,
  error,
  onChange,
  onConfirm,
}: {
  tags: readonly DerivedTag[]
  added: readonly string[]
  dropped: readonly string[]
  reviewed: boolean
  /** Why this review cannot be confirmed yet; null when it can. */
  confirmBlocked: string | null
  saving: boolean
  error: string | null
  onChange: (next: { added?: string[]; dropped?: string[] }) => void
  onConfirm: () => void
}) {
  const [draft, setDraft] = useState('')
  const readable = tags.filter((t) => !t.unreadable).length
  const toggleDrop = (key: string) =>
    onChange({ dropped: dropped.includes(key) ? dropped.filter((k) => k !== key) : [...dropped, key] })
  const add = () => {
    const text = draft.trim()
    if (!text || added.includes(text)) return
    onChange({ added: [...added, text] })
    setDraft('')
  }
  return (
    <section className={positionsUi.panel} aria-label="Tags">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Tags</span>
        <span className={positionsUi.panelTitle}>Auto-derived</span>
        <span className="ml-auto text-dense-meta text-muted-foreground">
          {readable} from the path{dropped.length ? ` · ${dropped.length} dropped` : ''}
        </span>
      </header>
      <div className="flex flex-col gap-1.5 px-3 py-2.5">
        {tags.map((t) => {
          const off = dropped.includes(t.key)
          return (
            <div
              key={t.key}
              className={cn(
                'min-w-0 px-2.5 py-1.75',
                // An unreadable tag keeps its place on a dashed outline — the
                // absence marker — rather than on the card material.
                t.unreadable ? 'rounded-[var(--mat-card-radius)] border border-dashed border-border' : 'border mat-card',
                off && 'opacity-55',
              )}
              style={t.unreadable || off ? undefined : TONE_EDGE[t.tone]}
            >
              <div className="flex items-baseline gap-2">
                <span className={cn('text-dense-body font-semibold', off ? 'text-muted-foreground line-through' : TONE_TEXT[t.tone])}>
                  {t.label}
                </span>
                <span className={cn(positionsUi.mono, 'ml-auto text-dense-caption text-muted-foreground')}>
                  {t.unreadable ? 'n/c' : 'auto'}
                </span>
                {t.unreadable ? null : (
                  <button
                    type="button"
                    className={positionsUi.link}
                    title={off ? 'Put this tag back' : 'This tag does not apply — drop it from the review'}
                    onClick={() => toggleDrop(t.key)}
                  >
                    {off ? 'Keep' : 'Drop'}
                  </button>
                )}
              </div>
              <p className="m-0 pt-0.5 text-dense-meta leading-normal text-muted-foreground text-pretty">{t.why}</p>
            </div>
          )
        })}
        {added.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {added.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--sk-accent)_14%,transparent)] px-2 py-0.5 text-dense-meta text-foreground">
                {a}
                <button
                  type="button"
                  aria-label={`Remove tag ${a}`}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => onChange({ added: added.filter((x) => x !== a) })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <form
          className="flex items-center gap-1.5 pt-0.5"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input
            aria-label="Add a tag the rules missed"
            className="h-7 min-w-0 flex-1 px-2 text-dense-label mat-field"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a tag the rules missed"
            maxLength={60}
          />
          <button type="submit" className={positionsUi.btn} disabled={!draft.trim()}>
            Add
          </button>
        </form>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
        <button
          type="button"
          className={cn(
            'inline-flex h-7 items-center rounded-full px-3 text-dense-label font-semibold',
            reviewed
              ? 'bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] text-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
            (confirmBlocked != null || saving) && 'cursor-not-allowed opacity-50',
          )}
          disabled={confirmBlocked != null || saving || reviewed}
          title={confirmBlocked ?? (reviewed ? 'Already reviewed' : 'Stamp this trade reviewed and open the next one waiting')}
          onClick={onConfirm}
        >
          {reviewed ? 'Reviewed ✓' : 'Confirm review'}
        </button>
        <span className="text-dense-meta text-muted-foreground text-pretty">
          {error
            ? error
            : confirmBlocked ??
              (reviewed ? 'Stamped — Queue and the Review badge read it.' : 'Confirming moves to the next trade waiting.')}
        </span>
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
            className="grid grid-cols-[0.75rem_minmax(0,1fr)] items-start gap-2.5 border-b border-border px-3 py-1.75 last:border-b-0"
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
