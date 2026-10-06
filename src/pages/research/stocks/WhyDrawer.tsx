/**
 * Why (Rev .121 #3, .122 #5): one row, three answers — why it ranks here
 * (the model's parts × weight share = points, summing to the composite),
 * what the three models say about it (each against its own bar), and why it
 * passed (every active stage, condition by condition).
 */
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CloseButton, IconActionButton } from '@/components/data-display'
import { AddToPoolButton } from '@/components/research/AddToPoolButton'
import { PlanThisButton } from '@/components/research/PlanThisButton'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { withChartSignal, withSymbolParam } from '@/lib/symbolLink'
import { momentumFactorReadings } from '@/lib/momentumFactors'
import { compositeParts as volParts } from '@/lib/research/volRatingsModel'
import { cn } from '@/lib/utils'
import { MODEL_TINT } from './stockScreenView'
import { pineChartSignal } from './stockScreenStages'
import { MomentumFactorsPanel } from './MomentumFactorsPanel'
import {
  AGREE_BAR,
  AGREE_OF,
  MODEL_KEYS,
  MODEL_LABEL,
  clears,
  covered,
  passesStage,
  sepaParts,
  stageActive,
  type NameRow,
  type Probe,
  type RankModel,
  type ScorePart,
  type ScreenState,
  type Stage,
} from './stockScreenModel'
import { NOT_RATED } from './stockScreenView'

function Part({ p }: { p: ScorePart }) {
  return (
    <div className="grid items-center gap-2 text-dense-label [grid-template-columns:92px_44px_minmax(0,1fr)_40px]" title={p.note}>
      <span className="truncate text-[var(--sk-soft)]">{p.label}</span>
      <span className="text-right font-mono text-foreground">{p.raw}</span>
      <span className="h-1 overflow-hidden rounded-[3px] bg-foreground/[0.08]">
        <span className="block h-full bg-primary/70" style={{ width: `${Math.max(0, Math.min(100, p.value ?? 0))}%` }} />
      </span>
      <span
        className="text-right font-mono text-[var(--sk-mute2)]"
        title={p.points == null ? 'weight 0' : `lens ${(p.value ?? 0).toFixed(0)} × weight ${p.weight} / applied`}
      >
        {p.points == null ? '' : p.points.toFixed(1)}
      </span>
    </div>
  )
}

export function WhyDrawer({
  row,
  model,
  weights,
  score,
  pos,
  screen,
  stages,
  probe,
  rankIn,
  leadersSession,
  onPrev,
  onNext,
  onClose,
}: {
  row: NameRow
  model: RankModel
  weights: { sepa: Record<string, number>; premium: Record<string, number> }
  score: number | null
  pos: string
  screen: ScreenState
  stages: readonly Stage[]
  probe: Probe
  /** "#k of N in <universe>" for a model, or ''. */
  rankIn: (m: 'sepa' | 'radar' | 'premium') => string
  /** Set when opened from Leaders: a name on a session. */
  leadersSession: string | null
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}) {
  let parts: ScorePart[] = []
  let rankTitle = ''
  let rankNote = ''
  if (leadersSession) {
    rankTitle = `Radar · session ${leadersSession}`
  } else if (model === 'none') {
    rankTitle = 'no model'
    rankNote = 'Nothing ranks it: with Rank by › None the screen is a set. Pick a model to see where it would sit and why.'
  } else if (score == null) {
    rankTitle = `${MODEL_LABEL[model]} · not rated`
    rankNote = NOT_RATED[model]
  } else if (model === 'sepa' && row.sepa) {
    parts = sepaParts(row.sepa, weights.sepa)
    rankTitle = `SEPA · composite ${score.toFixed(1)}`
    rankNote = `Points = lens score × weight share, and they sum to the composite. Grade ${row.sepa.grade} · ${row.sepa.path} is the mart’s cut at Model weights; moving the sliders re-orders the list but does not re-grade.`
  } else if (model === 'premium' && row.prem) {
    parts = volParts(row.prem, weights.premium).map((p) => ({
      key: p.key,
      label: p.label,
      raw: p.reading,
      value: p.value,
      weight: p.weight,
      points: p.points,
    }))
    rankTitle = `Premium · composite ${score.toFixed(1)}`
    rankNote = 'Points = lens score × weight share. A seller’s view: rich IV and a fat risk premium score high.'
  } else if (model === 'radar' && row.radar) {
    parts = momentumFactorReadings(row.radar.row).map((f) => ({
      key: f.key,
      label: f.key,
      raw: f.text,
      value: f.text === '—' ? null : Number(f.text),
      weight: 0,
      points: null,
      note: f.pinned ?? f.note,
    }))
    rankTitle = `Radar ${row.radar.grade} · score ${row.radar.score.toFixed(1)}`
    rankNote = 'Radar scores server-side; the nine factors are its inputs as returned, with no weights to move. z_ofi is not computed.'
  }
  const act = leadersSession ? [] : stages.filter((st) => stageActive(st, screen))
  const verdicts = act.map((st) => {
    const need = screen.mins[st.id] ?? 0
    const items: { label: string; hit: boolean }[] = []
    if ((st.kind === 'min' || st.kind === 'agree') && need > 0) {
      const has =
        st.id === 'trend' ? row.sepa?.trendN : st.id === 'growth' ? row.sepa?.growthN : st.id === 'momtier' ? row.sepa?.momN : st.chips.filter((c) => probe(row, c.id)).length
      items.push({ label: `≥ ${need} of ${st.max ?? st.chips.length} · has ${has ?? 0}`, hit: (has ?? 0) >= need })
    }
    for (const c of st.chips) if (screen.on[c.id]) items.push({ label: c.label, hit: probe(row, c.id) })
    return { st, ok: passesStage(row, st, screen, probe), items }
  })
  const agreeN = MODEL_KEYS.filter((m) => clears(row, AGREE_OF[m])).length
  const failed = verdicts.filter((v) => !v.ok).length
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-foreground/[0.06] px-3 py-2.5">
        <Link to={withSymbolParam(withChartSignal(SYMBOL_PATH, pineChartSignal(screen.on)), row.sym)} className="font-mono text-dense-body font-bold text-entity-symbol hover:underline">
          {row.sym}
        </Link>
        <span className="min-w-0 truncate text-dense-label text-[var(--sk-mute2)]">{row.company ?? ''}</span>
        <span className="ml-auto inline-flex gap-0.5">
          <IconActionButton title="Previous (k)" ariaLabel="Previous" onClick={onPrev}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </IconActionButton>
          <IconActionButton title="Next (j)" ariaLabel="Next" onClick={onNext}>
            <ChevronRight className="h-3.5 w-3.5" />
          </IconActionButton>
          <CloseButton title="Close (esc)" onClick={onClose} className="self-center" />
        </span>
      </header>
      <div className="px-3 py-1.5 font-mono text-dense-meta text-muted-foreground">{pos}</div>

      <section className="flex flex-col gap-2 px-3 pb-3 pt-2">
        <div className="flex items-baseline gap-2">
          <span data-sr-tb="label">Why it ranks here</span>
          <span className="text-dense-label font-semibold">{rankTitle}</span>
        </div>
        {leadersSession ? (
          <MomentumFactorsPanel symbol={row.sym} session={leadersSession} isSelection />
        ) : (
          parts.map((p) => <Part key={p.key} p={p} />)
        )}
        {rankNote ? <div className="text-pretty text-dense-meta leading-normal text-muted-foreground">{rankNote}</div> : null}
      </section>

      <section className="flex flex-col gap-1.5 border-t border-foreground/[0.06] px-3 pb-3 pt-2.5">
        <div className="flex items-baseline gap-2">
          <span data-sr-tb="label">Three models</span>
          <span className="text-dense-label font-semibold">{agreeN} of 3 clear their bar</span>
        </div>
        {MODEL_KEYS.map((m) => {
          const id = AGREE_OF[m]
          const has = covered(row, id)
          const hit = clears(row, id)
          const read =
            m === 'sepa'
              ? row.sepa
                ? `${row.sepa.grade} · ${row.sepa.path} · comp ${row.sepa.comp.toFixed(0)}`
                : 'not evaluated'
              : m === 'radar'
                ? row.radar
                  ? `Radar ${row.radar.grade} · score ${row.radar.score.toFixed(1)}`
                  : 'not graded on the latest session'
                : row.prem
                  ? `comp ${row.prem.serverScore?.toFixed(0) ?? '—'} · ${row.prem.regime ?? '—'}`
                  : 'not in its 691'
          return (
            <div
              key={m}
              title={AGREE_BAR[id]}
              className={cn(
                'grid items-baseline gap-2 rounded-md border-l-2 px-1.5 py-1 [grid-template-columns:14px_64px_minmax(0,1fr)]',
                model === m ? 'border-primary' : 'border-transparent',
              )}
            >
              <span className={cn('font-mono text-dense-label', !has ? 'text-muted-foreground' : hit ? 'text-foreground' : 'text-destructive')}>
                {!has ? '—' : hit ? '✓' : '✕'}
              </span>
              <span className={cn('inline-flex items-center gap-1.5 text-dense-label font-semibold', has ? 'text-foreground' : 'text-muted-foreground')}>
                <span className="h-[7px] w-[7px] flex-none rounded-[2px]" style={{ background: MODEL_TINT[m] }} />
                {MODEL_LABEL[m]}
              </span>
              <span className="flex min-w-0 flex-col gap-px">
                <span className={cn('font-mono text-dense-meta', has ? 'text-foreground' : 'text-muted-foreground')}>{read}</span>
                <span className="font-mono text-dense-caption text-muted-foreground">{rankIn(m)}</span>
              </span>
            </div>
          )
        })}
        <div className="text-dense-meta leading-normal text-muted-foreground">
          Each model is judged by its own bar; nothing is blended. The one ordering the list is marked.
        </div>
      </section>

      <section className="flex flex-col gap-2.5 border-t border-foreground/[0.06] px-3 pb-3 pt-2.5">
        <div className="flex items-baseline gap-2">
          <span data-sr-tb="label">Why it passed</span>
          <span className="text-dense-label font-semibold">
            {leadersSession ? 'Leaders ignores the screen' : !act.length ? 'no screen' : failed ? `fails ${failed} of ${act.length}` : `all ${act.length} stages`}
          </span>
        </div>
        {verdicts.map((v) => (
          <div key={v.st.id} className="flex flex-col gap-1">
            <div className="flex items-baseline gap-1.5 text-dense-label">
              <span className="font-semibold">{v.st.title}</span>
              <span className={cn('ml-auto font-mono text-dense-meta', v.ok ? 'text-foreground' : 'text-destructive')}>{v.ok ? 'pass' : 'miss'}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {v.items.map((it) => (
                <span key={it.label} className={cn('mat-tag border text-dense-meta', it.hit ? 'border-foreground/20 text-foreground' : 'border-transparent text-muted-foreground')}>
                  {it.hit ? '✓ ' : '✕ '}
                  {it.label}
                </span>
              ))}
            </div>
          </div>
        ))}
        {leadersSession || !act.length ? (
          <div className="text-dense-meta leading-normal text-muted-foreground">
            {leadersSession
              ? 'Leaders is Radar’s history across sessions. Switch to Ranked to test this name against the screen.'
              : 'No condition is on, so every name in the universe passes. Start from a preset or add a condition.'}
          </div>
        ) : null}
      </section>

      <div className="mt-auto flex flex-wrap gap-1.5 border-t border-foreground/[0.06] px-3 py-2.5">
        <PlanThisButton symbol={row.sym} source="stock-screen" sourceLabel="Stock screen" note={`Ranked by ${MODEL_LABEL[model]}`} variant="primary" />
        <Link to={withSymbolParam(withChartSignal(SYMBOL_PATH, pineChartSignal(screen.on)), row.sym)} className="mat-btn inline-flex h-7 items-center border px-2.5 text-dense-label">
          Symbol →
        </Link>
        <AddToPoolButton symbol={row.sym} source="stock-screen" score={score} tags={['stock-screen', model]} label="Pool" />
      </div>
    </div>
  )
}
