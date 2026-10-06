/**
 * The Rank section's drawer (Rev .131; was the left Rank by panel, Rev .128):
 * what the chosen model is and where it reads, then its presets and weights
 * (client-side re-weighting of the server's own lenses), Radar's factors, or
 * None's sort. Ranking orders, never filters.
 */
import { SegmentControl } from '@/components/data-display'
import { MOMENTUM_FACTORS } from '@/lib/momentumFactors'
import { VOL_LENSES } from '@/lib/research/volRatingsModel'
import { cn } from '@/lib/utils'
import { SEPA_LENSES, SEPA_PRESETS, type RankModel } from './stockScreenModel'
import { PREMIUM_PRESETS, type WeightSet } from './stockScreenView'

const RANK_DESC: Record<RankModel, { title: string; desc: string }> = {
  sepa: {
    title: 'SEPA stock model',
    desc: 'Is the company in a tradeable trend? Trend 11, growth 8, momentum tier and options tier make one composite. Grade, path and stage are the server’s cuts of that composite.',
  },
  radar: {
    title: 'Radar',
    desc: 'A separate engine (Momentum Radar): nine factors scored server-side into one score and a letter grade. There are no weights to move. It is not SEPA’s momentum tier.',
  },
  premium: {
    title: 'Premium (vol model)',
    desc: 'Ranks the underlying for selling premium: IV rank, VRP, term slope, pin and terrain. It says nothing about the company.',
  },
  none: { title: 'No model', desc: 'The screen alone: a set, not a ranking. Sort it by name.' },
}

function presetIdOf(presets: readonly { id: string; weights: Record<string, number> }[], w: Record<string, number>) {
  return presets.find((p) => Object.entries(p.weights).every(([k, v]) => (w[k] ?? 0) === v))?.id ?? 'custom'
}

export function RankDrawer({
  model,
  weights,
  onWeights,
  source,
}: {
  model: RankModel
  weights: WeightSet
  onWeights: (next: WeightSet) => void
  source: string
}) {
  const d = RANK_DESC[model]
  const lensed =
    model === 'sepa'
      ? { lenses: SEPA_LENSES.map((l) => ({ key: l.key, label: l.label })), presets: SEPA_PRESETS as readonly { id: string; label: string; note: string; weights: Record<string, number> }[], w: weights.sepa }
      : model === 'premium'
        ? { lenses: VOL_LENSES.map((l) => ({ key: l.key, label: l.label })), presets: PREMIUM_PRESETS, w: weights.premium }
        : null
  const setW = (w: Record<string, number>) =>
    onWeights(model === 'sepa' ? { ...weights, sepa: w } : { ...weights, premium: w })
  const pid = lensed ? presetIdOf(lensed.presets, lensed.w) : null
  const sum = lensed ? Object.values(lensed.w).reduce((a, b) => a + b, 0) : 0
  return (
    <div className="grid gap-x-7 gap-y-2.5 border-b border-foreground/[0.06] bg-foreground/[0.02] px-3 py-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-dense-label font-semibold">{d.title}</span>
        <span className="text-pretty text-dense-label leading-normal text-[var(--sk-soft)]">{d.desc}</span>
        <span className="break-words font-mono text-dense-caption text-muted-foreground">{source}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        {lensed ? (
          <>
            <SegmentControl
              options={lensed.presets.map((p) => ({ value: p.id, label: p.label, title: p.note }))}
              value={pid ?? 'custom'}
              onChange={(v) => {
                const p = lensed.presets.find((x) => x.id === v)
                if (p) setW({ ...p.weights })
              }}
              size="xs"
              ariaLabel="Weight preset"
              className="w-full"
            />
            {lensed.lenses.map((l) => {
              const v = lensed.w[l.key] ?? 0
              return (
                <label key={l.key} className="grid items-center gap-2 text-dense-label [grid-template-columns:96px_minmax(0,1fr)_30px]">
                  <span className="whitespace-nowrap text-[var(--sk-soft)]">{l.label}</span>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={5}
                    value={v}
                    onChange={(e) => setW({ ...lensed.w, [l.key]: Number(e.target.value) })}
                    className="h-3.5 w-full accent-[var(--sk-accent)]"
                    aria-label={`${l.label} weight`}
                  />
                  <span className={cn('text-right font-mono', v === 0 ? 'text-muted-foreground' : 'text-foreground')}>{v}</span>
                </label>
              )
            })}
            <div className="flex justify-between text-dense-meta text-muted-foreground">
              <span>{pid === 'custom' ? 'custom weights · client-side' : (lensed.presets.find((p) => p.id === pid)?.note ?? '')}</span>
              <span className="font-mono">Σ {sum}</span>
            </div>
          </>
        ) : null}
        {model === 'radar' ? (
          <div className="flex flex-wrap gap-1">
            {MOMENTUM_FACTORS.map((f) => (
              <span
                key={f.key}
                title={f.pinned ? `${f.note} ${f.pinned}` : f.note}
                className={cn('mat-tag font-mono text-dense-caption', f.pinned ? 'text-muted-foreground' : 'text-[var(--sk-soft)]')}
              >
                {f.key}
              </span>
            ))}
          </div>
        ) : null}
        {model === 'none' ? (
          <div className="flex items-center gap-2">
            <span data-sr-tb="label">Sort</span>
            <SegmentControl
              options={[
                { value: 'sym', label: 'A–Z' },
                {
                  value: 'earn',
                  label: 'Earnings',
                  disabled: true,
                  title: 'Sorting the set by its next print is not built yet — each row’s Earn column carries Research’s estimate.',
                },
              ]}
              value="sym"
              onChange={() => {}}
              size="xs"
              ariaLabel="Sort"
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
