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
