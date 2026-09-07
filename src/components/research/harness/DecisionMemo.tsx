/**
 * The run as a decision memo: the picks first, the reasons beneath, the
 * process last.
 *
 * The drawer used to narrate the run in the order the system executed it, so
 * the candidates — the only thing the Owner opens it for — sat in the seventh
 * step and their reasons in the fifth. This reads in the order a reader decides:
 * one sentence saying what the batch is worth, a ranked deck of rating cards,
 * and behind each card the full case. Every figure here was written by the run;
 * nothing is recomputed on the page.
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { DenseTag } from '@/components/data-display'
import { cn } from '@/lib/utils'
import { StanceMark, VerdictList, CopyCandidates, ReasonText } from '@/components/research/harness/PersonaVerdicts'
import type { PersonaRow } from '@/components/research/harness/HarnessPipelineStepper'
import { actionTone, fmtPct, fmtPx, memoHeadline, stars, summarize } from '@/lib/harness/rating'
import type { CandidateRating } from '@/lib/harness/rating'
import { fmtUsd } from '@/lib/harness/runSpend'

export function DecisionMemo({
  ratings,
  rows,
  considered,
  spendUsd,
}: {
  ratings: CandidateRating[]
  rows: PersonaRow[]
  considered: number | null
  spendUsd: number | null
}) {
  const [open, setOpen] = useState<string | null>(ratings[0]?.symbol ?? null)
  const bySymbol = new Map(rows.map((r) => [r.symbol.toUpperCase(), r]))
  const s = summarize(ratings)

  if (ratings.length === 0) {
    return (
      <div className="rounded-md border border-border/60 bg-secondary/40 px-3 py-2">
        <p className="text-dense-meta">No rating on this run.</p>
        <p className="text-dense-caption text-muted-foreground">
          It predates the rating stage, or nothing was proposed. The stages below still read.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border/60 bg-secondary/40 px-3 py-2">
        <p className="text-dense-body font-medium text-balance">{memoHeadline(ratings, considered)}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-dense-caption text-muted-foreground">
          <span>
            <span className="font-mono tabular-nums text-foreground">{s.total}</span> proposed
          </span>
          <span>
            <span className="font-mono tabular-nums text-foreground">
              {(s.byAction.buy_zone ?? 0) + (s.byAction.accumulate ?? 0)}
            </span>{' '}
            actionable
          </span>
          <span>
            <span className="font-mono tabular-nums text-foreground">{s.split}</span> split ·{' '}
            <span className="font-mono tabular-nums text-foreground">{s.blocked}</span> blocked
          </span>
          {spendUsd != null && spendUsd > 0 ? (
            <span>
              <span className="font-mono tabular-nums text-foreground">{fmtUsd(spendUsd)}</span> this run
            </span>
          ) : null}
        </div>
      </div>

      <ol className="divide-y divide-border/50 rounded-md border border-border/60">
        {ratings.map((r, i) => {
          const isOpen = open === r.symbol
          const row = bySymbol.get(r.symbol) ?? null
          return (
            <li key={r.symbol} className={cn(isOpen && 'bg-secondary/30')}>
              <RatingCard rank={i + 1} r={r} open={isOpen} onToggle={() => setOpen(isOpen ? null : r.symbol)} />
              {isOpen ? <RatingCase r={r} row={row} /> : null}
            </li>
          )
        })}
      </ol>
      <p className="text-dense-micro text-muted-foreground">
        Ranked by conviction, then action, then distance to the pivot. Stop is the tighter of the
        run’s own 50-day line and −8% from the pivot; target is 2R. Every figure is the run’s.
      </p>
    </div>
  )
}

function RatingCard({
  rank,
  r,
  open,
  onToggle,
}: {
  rank: number
  r: CandidateRating
  open: boolean
  onToggle: () => void
}) {
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <button
      type="button"
      onClick={onToggle}
      className="grid w-full grid-cols-[1.5rem_5.5rem_1fr] items-start gap-x-3 px-2.5 py-2 text-left hover:bg-muted/30 md:grid-cols-[1.5rem_5.5rem_1fr_17rem]"
      aria-expanded={open}
    >
      <span className="flex items-center gap-1 pt-0.5 font-mono text-dense-micro text-muted-foreground">
        <Chevron className="size-3" aria-hidden />
        {String(rank).padStart(2, '0')}
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-dense-body font-semibold tracking-wide">{r.symbol}</span>
        <span className="block text-dense-micro text-muted-foreground">
          {r.grade ? (
            <>
              <span className="font-semibold text-foreground">{r.grade}</span>
              {r.grade_score != null ? <span className="tabular-nums"> {r.grade_score.toFixed(1)}</span> : null}
              {r.basis?.path ? ` · ${r.basis.path}` : ''}
            </>
          ) : (
            'no grade'
          )}
        </span>
        <span className="block font-mono text-dense-meta text-warning" title={r.conviction_reason}>
          {stars(r.conviction)}
        </span>
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1">
          <DenseTag variant={actionTone(r.action)} size="cell">
            {r.action_label}
          </DenseTag>
          {r.inputs.agreement === 'dissent' ? (
            <DenseTag variant="warning" size="cell">
              split
            </DenseTag>
          ) : null}
          {r.outlook && r.outlook !== 'stable' ? (
            <DenseTag variant={r.outlook === 'improving' ? 'success' : 'warning'} size="cell" title={r.score_drift ? `score ${r.score_drift.from} → ${r.score_drift.to}` : undefined}>
              {r.outlook}
            </DenseTag>
          ) : null}
        </span>
        <span className="mt-0.5 block text-dense-caption text-muted-foreground">
          <ReasonText text={r.why} />
        </span>
        {r.instrument.suggestion ? (
          <span className="mt-0.5 block text-dense-micro text-muted-foreground/80" title={r.instrument.note}>
            {r.instrument.stage_row?.replace('_', ' ')} × IV {r.instrument.iv_col}
            {r.instrument.iv_rank != null ? ` (${r.instrument.iv_rank.toFixed(0)})` : ''} →{' '}
            <span className="text-foreground/80">{r.instrument.suggestion}</span>
          </span>
        ) : null}
      </span>
      <span className="col-span-3 mt-1.5 grid grid-cols-4 gap-1 md:col-span-1 md:mt-0">
        <Level label="Close" value={fmtPx(r.basis?.close)} sub={r.timing.pct_vs_pivot != null ? `${fmtPct(r.timing.pct_vs_pivot)} vs pivot` : undefined} />
        <Level label="Entry" value={r.levels ? `${fmtPx(r.levels.entry_lo)}–${fmtPx(r.levels.entry_hi)}` : '—'} sub={r.levels ? 'pivot to +5%' : 'not applicable'} tone={r.timing.zone === 'in_zone' ? 'success' : undefined} />
        <Level label="Stop" value={fmtPx(r.levels?.stop)} sub={r.levels ? `${r.levels.stop_source} · −${r.levels.risk_pct.toFixed(1)}%` : undefined} tone="danger" />
        <Level label="Target" value={fmtPx(r.levels?.target_2r)} sub={r.levels ? `2R · 3R ${fmtPx(r.levels.target_3r)}` : undefined} />
      </span>
    </button>
  )
}

function Level({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'success' | 'danger' }) {
  return (
    <span className="rounded border border-border/60 bg-background px-1.5 py-1">
      <span className="block text-dense-micro uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn('block font-mono text-dense-meta tabular-nums', tone === 'success' && 'text-success', tone === 'danger' && 'text-destructive')}>{value}</span>
      {sub ? <span className="block truncate text-dense-micro text-muted-foreground/80">{sub}</span> : null}
    </span>
  )
}

/** The full case behind one card: why it was picked, how to exit, what the judges said. */
function RatingCase({ r, row }: { r: CandidateRating; row: PersonaRow | null }) {
  const b = r.basis
  const comps = b ? Object.entries(b.components).filter(([, v]) => v != null) : []
  return (
    <div className="grid gap-2 border-t border-border/40 px-2.5 py-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <div className="space-y-2">
        <Box title="Why it was picked">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-dense-caption">
            <dt className="text-muted-foreground">Setup</dt>
            <dd>{[b?.path, r.stage, r.grade ? `grade ${r.grade}` : null].filter(Boolean).join(' · ') || '—'}</dd>
            {comps.length ? (
              <>
                <dt className="text-muted-foreground">Components</dt>
                <dd className="font-mono tabular-nums">{comps.map(([k, v]) => `${k} ${v!.toFixed(1)}`).join(' · ')}</dd>
              </>
            ) : null}
            {b && (b.sma_50 != null || b.sma_200 != null) ? (
              <>
                <dt className="text-muted-foreground">vs 50d / 200d</dt>
                <dd className="font-mono tabular-nums">
                  {fmtPct(r.timing.pct_vs_50d)} / {b.close != null && b.sma_200 ? fmtPct((b.close / b.sma_200 - 1) * 100) : '—'}
                </dd>
              </>
            ) : null}
            <dt className="text-muted-foreground">Source record</dt>
            <dd>
              {r.inputs.judged > 0 ? (
                <>
                  hit rate <span className="font-mono tabular-nums">{r.inputs.hit_rate?.toFixed(2) ?? '—'}</span> over{' '}
                  <span className="font-mono tabular-nums">{r.inputs.judged}</span> judged
                </>
              ) : (
                'none settled yet'
              )}
            </dd>
            <dt className="text-muted-foreground">Conviction</dt>
            <dd>
              <span className="font-mono text-warning">{stars(r.conviction)}</span> — {r.conviction_reason}
            </dd>
            <dt className="text-muted-foreground">Action</dt>
            <dd>{r.action_label} — {r.action_reason}</dd>
          </dl>
        </Box>
        <Box title="Exit if">
          {b?.invalidation.length ? (
            <ul className="list-disc space-y-0.5 pl-4 text-dense-caption">
              {b.invalidation.map((line) => (
                <li key={line}>
                  <ReasonText text={line} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-dense-caption text-muted-foreground">No invalidation lines recorded.</p>
          )}
        </Box>
      </div>
      <Box title="What the judges said">
        {row ? (
          <>
            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-dense-caption">
              <span className="text-muted-foreground">net</span> <StanceMark stance={row.net} />
              <span className="text-muted-foreground">· validate</span> <StanceMark stance={row.validate} />
              {row.agreement ? <span className="text-muted-foreground">· judges {row.agreement}</span> : null}
              <span className="ml-auto">
                <CopyCandidates rows={[row]} />
              </span>
            </div>
            <VerdictList verdicts={row.verdicts} />
          </>
        ) : (
          <p className="text-dense-caption text-muted-foreground">No judge verdicts recorded for this name.</p>
        )}
      </Box>
    </div>
  )
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/50 bg-background px-2.5 py-2">
      <h4 className="mb-1 text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  )
}
