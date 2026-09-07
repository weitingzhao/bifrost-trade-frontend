/**
 * How the judges' verdicts look on the page.
 *
 * Split out of the stepper because it is a different job: the stepper narrates
 * what a run did, stage by stage, while this reads one stage's output — four
 * paragraphs per judge per candidate — and gives it a shape the eye can work
 * with. Keeping them together also pushed the stepper past the file-length
 * ratchet, which was the file saying the same thing.
 */
import { useState } from 'react'
import {
  Ban,
  Briefcase,
  Circle,
  CircleCheck,
  ClipboardCopy,
  Gavel,
  Microscope,
  Minus,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { agentView, splitNumerics, stanceScore, stanceView } from '@/lib/harness/personaVisual'
import { candidateMarkdown, copyText } from '@/lib/harness/personaExport'
import type { PersonaRow, PersonaVerdict } from '@/components/research/harness/HarnessPipelineStepper'
import type { TriageView } from '@/lib/harness/harnessTrace'

const STANCE_ICON = { check: CircleCheck, alert: TriangleAlert, ban: Ban, dash: Minus } as const
const AGENT_ICON = {
  scope: Microscope,
  briefcase: Briefcase,
  shield: ShieldCheck,
  gavel: Gavel,
  dot: Circle,
} as const

/** The stance as a mark you can find without reading the word beside it. */
export function StanceMark({ stance }: { stance: string }) {
  const v = stanceView(stance)
  const Icon = STANCE_ICON[v.icon]
  return (
    <span className={cn('inline-flex items-center gap-1', v.className)}>
      <Icon className="size-3 shrink-0" aria-hidden />
      <span>{v.label}</span>
    </span>
  )
}

/**
 * Where a candidate sits between opposed and supported.
 *
 * Four verdicts per judge is a lot of words for one question — is this worth
 * doing? The bar answers that first, and the words stay underneath for the
 * reader who wants to know why. Abstentions sit outside the bar because they
 * are an absence of opinion, not a moderate one.
 */
export function StanceBar({ verdicts }: { verdicts: PersonaVerdict[] }) {
  const { score, counted, abstained } = stanceScore(verdicts.map((v) => v.stance))
  if (score == null) {
    return (
      <span className="text-dense-micro text-muted-foreground">
        no stance taken{abstained > 0 ? ` · ${abstained} abstained` : ''}
      </span>
    )
  }
  const pct = ((score + 1) / 2) * 100
  const tone =
    score > 0.25 ? 'bg-success' : score < -0.25 ? 'bg-destructive' : 'bg-warning'
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`Mean stance ${score.toFixed(2)} across ${counted} verdict${counted === 1 ? '' : 's'} (−1 opposed … +1 supportive)${abstained > 0 ? `; ${abstained} abstained, left out` : ''}`}
    >
      <span className="relative h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-border">
        <span className="absolute inset-y-0 left-1/2 w-px bg-muted-foreground/50" />
        <span
          className={cn('absolute inset-y-0 w-1.5 rounded-full', tone)}
          style={{ left: `calc(${pct.toFixed(1)}% - 0.1875rem)` }}
        />
      </span>
      <span className="font-mono tabular-nums text-dense-micro text-muted-foreground">
        {score > 0 ? '+' : ''}
        {score.toFixed(2)}
      </span>
      {abstained > 0 ? (
        <span className="text-dense-micro text-muted-foreground/70">{abstained} abstained</span>
      ) : null}
    </span>
  )
}

/** The judge's prose, with its figures set in tabular numerals so they read. */
export function ReasonText({ text }: { text: string }) {
  return (
    <>
      {splitNumerics(text).map((part, i) =>
        part.numeric ? (
          <span
            key={i}
            className="font-mono tabular-nums text-foreground/85"
          >
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}

export function VerdictList({ verdicts }: { verdicts: PersonaVerdict[] }) {
  if (verdicts.length === 0) {
    return (
      <p className="text-dense-caption text-muted-foreground">
        No per-persona verdicts recorded.
      </p>
    )
  }
  const judged = verdicts.some((v) => v.model)
  return (
    <ul className="space-y-1">
      {verdicts.map((v) => {
        const a = agentView(v.agent)
        const AgentIcon = AGENT_ICON[a.icon]
        return (
          <li key={`${v.model ?? ''}:${v.agent}`} className="flex gap-2 text-dense-caption">
            {judged ? (
              <span
                className="w-28 shrink-0 truncate font-mono text-muted-foreground/80"
                title={v.source === 'heuristic_fallback' ? `${v.model} fell back to the heuristic` : v.model ?? undefined}
              >
                {v.model ?? 'heuristic'}
                {v.source === 'heuristic_fallback' ? ' ⚠' : ''}
              </span>
            ) : null}
            <span className="flex w-24 shrink-0 items-center gap-1 font-medium" title={a.asks}>
              <AgentIcon className="size-3 shrink-0 text-muted-foreground" aria-hidden />
              {a.label}
            </span>
            <span className="w-20 shrink-0">
              <StanceMark stance={v.stance} />
            </span>
            <span className="w-8 shrink-0 tabular-nums text-muted-foreground/70">
              {v.confidence == null ? '—' : v.confidence.toFixed(2)}
            </span>
            <span className="min-w-0 flex-1 text-muted-foreground">
              <ReasonText text={v.summary} />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Take these candidates elsewhere.
 *
 * Sits on the group rather than the whole stage so the reader can lift the one
 * name they are arguing with, instead of the whole batch and then trimming.
 */
export function CopyCandidates({ rows }: { rows: PersonaRow[] }) {
  const [done, setDone] = useState(false)
  const label = rows.length === 1 ? rows[0].symbol : `${rows.length} candidates`
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded border border-border/60 px-1.5 py-[0.05rem] text-dense-micro text-muted-foreground hover:bg-muted hover:text-foreground"
      title={`Copy ${label} and every judge’s reasoning as Markdown, to paste into another model or a note`}
      onClick={() => {
        void copyText(rows.map((r) => candidateMarkdown(r)).join('\n')).then((ok) => {
          setDone(ok)
          if (ok) window.setTimeout(() => setDone(false), 1500)
        })
      }}
    >
      <ClipboardCopy className="size-3 shrink-0" aria-hidden />
      {done ? 'copied' : 'copy'}
    </button>
  )
}

/**
 * What triage decided, and whether it decided anything.
 *
 * The stage always ranks. It only narrows when the objective sets a cap, and
 * the difference is the whole point of reading this: a ranked list that changed
 * nothing is advice, and a ranked list that held five candidates back is a
 * decision about where the run's money went. The bar shows worth; the held rows
 * are dimmed and say so in words rather than only in colour.
 */
export function TriageFold({ triage }: { triage: TriageView | null }) {
  if (!triage) {
    return (
      <p className="text-dense-meta text-muted-foreground">
        No triage step — the run predates it, or the objective turned it off.
      </p>
    )
  }
  if (triage.error) {
    return (
      <p className="text-dense-meta text-warning">
        Triage failed ({triage.error}). Every candidate went to the judges, which is
        what the run did before this stage existed.
      </p>
    )
  }
  return (
    <div className="space-y-1.5">
      <p className="text-dense-caption text-muted-foreground">
        {triage.source === 'llm' ? (
          <>
            <span className="font-mono text-foreground/80">{triage.model}</span> read the
            compact evidence for {triage.ranked.length} candidate
            {triage.ranked.length === 1 ? '' : 's'} in one call, with no tools.
          </>
        ) : (
          <>
            Ranked by the selection score, without a model
            {triage.error ? '' : ' — the ranking model was unavailable'}.
          </>
        )}{' '}
        {triage.held.length === 0 ? (
          <span className="text-warning">
            Advisory only: every candidate still went to the judges. Set
            <span className="font-mono"> triage.deep_judge_top_n</span> on the objective to
            act on this ranking.
          </span>
        ) : (
          <span>
            The top <span className="tabular-nums">{triage.topN}</span> went on to the
            judges; <span className="tabular-nums">{triage.held.length}</span>{' '}
            {triage.held.length === 1 ? 'was' : 'were'} held here, unjudged, and cannot be
            auto-accepted.
          </span>
        )}
      </p>
      <ul className="space-y-0.5">
        {triage.ranked.map((r) => (
          <li
            key={r.symbol}
            className={cn('flex items-center gap-2 text-dense-caption', !r.deep && 'opacity-55')}
          >
            <span className="w-16 shrink-0 font-mono font-medium">{r.symbol}</span>
            <span
              className="relative h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-border"
              title={`worth ${r.worth.toFixed(2)}`}
            >
              <span
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full',
                  r.worth >= 0.6 ? 'bg-success' : r.worth >= 0.3 ? 'bg-warning' : 'bg-muted-foreground/60',
                )}
                style={{ width: `${Math.max(3, r.worth * 100).toFixed(0)}%` }}
              />
            </span>
            <span className="w-8 shrink-0 font-mono tabular-nums text-muted-foreground/70">
              {r.worth.toFixed(2)}
            </span>
            <span className="w-12 shrink-0 text-dense-micro">
              {r.deep ? (
                <span className="text-muted-foreground">judged</span>
              ) : (
                <span className="text-warning">held</span>
              )}
            </span>
            <span className="min-w-0 flex-1 text-muted-foreground">
              <ReasonText text={r.why} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
