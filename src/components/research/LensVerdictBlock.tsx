/**
 * The design's `sy-verdict` block — one lens's call with the evidence that
 * earned it: verdict bar and words from the registry, hit 5d / hit 20d from
 * the lens's own track record, the similar-readings forward médian, and the
 * record's scope. Every Symbol face panel opens with one, so it is shared.
 *
 * The colour rules are the prototype's own: a thin sample (n < 10) is amber
 * whatever the rate; ≥55% reads green against the 50% base rate, ≤45% red.
 */
import type { ExhibitPayload } from '@/api/research/exhibit'
import { labelForBand, toneForBand } from '@/lib/lensVerdict'
import { cn } from '@/lib/utils'

const CAP = 'text-dense-micro font-semibold uppercase tracking-[0.1em] text-muted-foreground'

function rateClass(h: number | null, n: number): string {
  if (!n || h == null) return 'text-muted-foreground'
  if (n < 10) return 'text-warning'
  return h >= 0.55 ? 'text-profit' : h <= 0.45 ? 'text-loss' : 'text-foreground'
}

function toneClasses(tone: string): { bar: string; text: string } {
  switch (tone) {
    case 'success':
      return { bar: 'bg-success', text: 'text-success' }
    case 'danger':
      return { bar: 'bg-destructive', text: 'text-destructive' }
    case 'warning':
      return { bar: 'bg-warning', text: 'text-warning' }
    default:
      return { bar: 'bg-[var(--sk-line2)]', text: 'text-secondary-foreground' }
  }
}

function Evidence({ cap, value, sub, cls }: { cap: string; value: string; sub?: string; cls?: string }) {
  return (
    <span className="flex min-w-[4.5rem] flex-col items-start gap-px">
      <span className={CAP}>{cap}</span>
      <b className={cn('font-mono text-dense-body tabular-nums', cls ?? 'text-foreground')}>{value}</b>
      {sub ? <small className="font-mono text-dense-micro text-muted-foreground">{sub}</small> : null}
    </span>
  )
}

export function LensVerdictBlock({ lensId, exhibit }: { lensId: string; exhibit: ExhibitPayload | undefined }) {
  const band = exhibit?.verdict?.band ?? null
  const tone = toneClasses(toneForBand(lensId, band))
  const label = exhibit?.verdict?.label
  const means = exhibit?.verdict?.means ?? null
  const tr = exhibit?.track_record ?? null
  const sim = exhibit?.similar ?? null
  const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v * 100)}%`)
  const simMed = sim?.median_fwd != null ? `${sim.median_fwd >= 0 ? '+' : '−'}${Math.abs(sim.median_fwd * 100).toFixed(1)}%` : '—'
  const simCls =
    sim == null || sim.n < 5
      ? 'text-warning'
      : (sim.share_positive ?? 0) >= 0.6
        ? 'text-profit'
        : (sim.share_positive ?? 1) <= 0.4
          ? 'text-loss'
          : 'text-foreground'

  return (
    <div className="flex flex-wrap items-start gap-3 border-b border-border/60 px-3 py-2.5">
      <span className={cn('mt-0.5 h-9 w-1 shrink-0 rounded-sm', tone.bar)} />
      <div className="min-w-0 flex-[1_1_14rem]">
        <div className={cn('text-dense-body font-semibold', tone.text)}>
          {label ?? labelForBand(lensId, band)}
        </div>
        {means ? (
          <div className="text-dense-caption leading-normal text-muted-foreground text-pretty">{means}</div>
        ) : null}
      </div>
      <div
        className="flex flex-wrap items-start gap-x-4 gap-y-1.5"
        title={
          tr
            ? `${tr.window_days}d window · ${tr.n} triggers · ${tr.symbol_scoped ? 'this symbol' : 'all symbols'}`
            : 'No track record behind this lens yet.'
        }
      >
        <Evidence cap="hit 5d" value={pct(tr?.hit_rate_5d)} sub={tr ? `n ${tr.n}` : undefined} cls={rateClass(tr?.hit_rate_5d ?? null, tr?.n ?? 0)} />
        <Evidence cap="hit 20d" value={pct(tr?.hit_rate_20d)} sub={tr ? `n ${tr.n}` : undefined} cls={rateClass(tr?.hit_rate_20d ?? null, tr?.n ?? 0)} />
        <Evidence
          cap={`similar · ${sim?.horizon ?? 5}d`}
          value={simMed}
          sub={sim ? `${pct(sim.share_positive)} positive · n ${sim.n}` : 'no neighbours'}
          cls={simCls}
        />
        <Evidence
          cap="scope"
          value={tr ? (tr.symbol_scoped ? 'this symbol' : 'all symbols') : '—'}
          cls="text-secondary-foreground text-dense-caption"
        />
      </div>
    </div>
  )
}
