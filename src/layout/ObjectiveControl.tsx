/**
 * The Objective control (design Rev .55, Shell Spec §4 "Lens 拆分"): the
 * working context, on every page. The chip names the objective, its mode, and
 * the one count that waits for you; the popover is its progress by that mode —
 * a real reading per stage, never a tick — with the switch and the way to all
 * objectives.
 *
 * It replaces the objective half of the Lens. The symbol half went to the
 * omnibar's prefix token; the account half the design also draws is not here,
 * because the shell owns no account scope yet (each page owns its own) and a
 * control that shows a scope it cannot set is the thing the Lens existed to
 * prevent — that question is with Design.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { HealthLamp } from '@bifrost/ui'
import { DenseTag } from '@/components/data-display'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fetchAutopilotStanding, fetchObjectives, type ResearchObjective } from '@/api/research/harness'
import { useStrategyPlans } from '@/hooks/useStrategyPlans'
import { ALL_OBJECTIVES, useObjectiveScope } from '@/lib/objectiveScope'
import { objectiveWiredPages, scopeRouteLabel } from '@/lib/design/scopes'
import { readStoredContext, writeStoredContext } from '@/lib/symbolContext'
import { cn } from '@/lib/utils'
import { MODE_WHO, isObjectiveMode, type ObjectiveMode } from '@/lib/harness/objectivePolicy'
import { planFilterCounts } from '@/utils/planStatusCounts'
import { SHELL_TOP_BAR_CONTROL_CLASS } from './shellChrome'
import { handProgress, loopProgress, waitingStep, type ProgressStep } from './objectiveProgress'

const INK: Record<ProgressStep['lamp'], string> = {
  green: 'text-foreground',
  yellow: 'text-[var(--color-lamp-yellow)]',
  gray: 'text-muted-foreground',
  red: 'text-[var(--color-lamp-red)]',
}

/** Where a stage opens: Symbol and Plans carry a hand objective's subject. */
function stageHref(step: ProgressStep, subject: string | null): string {
  return subject && (step.to === '/research/symbol' || step.to === '/trade/plans')
    ? `${step.to}?symbol=${encodeURIComponent(subject)}`
    : step.to
}

/**
 * An assisted or auto objective reads the Autopilot standing — the same key
 * the Autopilot pages poll — and only while one is in force, so the top bar
 * adds no request on a desk that has none selected.
 */
function useLoopSteps(obj: ResearchObjective | null, mode: ObjectiveMode | null): ProgressStep[] {
  const loop = obj != null && (mode === 'assisted' || mode === 'auto')
  const standing = useQuery({
    queryKey: ['research', 'loop', 'autopilot'],
    queryFn: fetchAutopilotStanding,
    refetchInterval: 60_000,
    enabled: loop,
  })
  if (!loop || (mode !== 'assisted' && mode !== 'auto')) return []
  return loopProgress(mode, standing.data?.objectives.find((o) => o.id === obj.id) ?? null)
}

/** A hand objective reads its subject's plans; only it asks, so only it fetches. */
function HandSteps({ subject, children }: { subject: string; children: (steps: ProgressStep[]) => ReactNode }) {
  const plans = useStrategyPlans({ symbol: subject })
  const counts = plans.data ? planFilterCounts(plans.data.items) : null
  return <>{children(handProgress(subject, counts ? { open: counts.open, draft: counts.draft, filled: counts.filled } : null))}</>
}

export function ObjectiveControl() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { objective, isAll, select } = useObjectiveScope()
  const objQuery = useQuery({
    queryKey: ['research', 'objectives', 'lens'],
    queryFn: () => fetchObjectives({ limit: 50 }),
    staleTime: 5 * 60_000,
  })
  const objectives = useMemo(() => objQuery.data?.items ?? [], [objQuery.data?.items])
  const current = isAll ? null : (objectives.find((o) => o.id === objective) ?? null)
  const mode = current && isObjectiveMode(current.mode) ? current.mode : null
  const subject = current?.subject ?? null
  const loopSteps = useLoopSteps(current, mode)

  const pick = (o: ResearchObjective | null) => {
    select(o ? o.id : ALL_OBJECTIVES)
    // A hand objective loads its subject into the carried symbol (§4).
    if (o?.mode === 'hand' && o.subject) writeStoredContext(o.subject, readStoredContext().date ?? '')
    setOpen(false)
  }
  const go = (step: ProgressStep) => {
    setOpen(false)
    navigate(stageHref(step, subject))
  }
  const wired = objectiveWiredPages().map(scopeRouteLabel).join(' · ')

  const render = (steps: ProgressStep[]) => {
    const wait = waitingStep(steps)
    const chipTitle = current
      ? `${current.title}${mode ? ` · ${mode}` : ''}${wait ? ` · ${wait.stage} ${wait.v}` : ''}`
      : 'No objective — pick one to scope lineage'
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={chipTitle}
            aria-label={chipTitle}
            className={cn(
              SHELL_TOP_BAR_CONTROL_CLASS,
              'hidden max-w-[16rem] gap-1.5 whitespace-nowrap sm:inline-flex',
              current ? 'border-[var(--sk-line2)] bg-[var(--sk-raised)]' : 'border-[var(--sk-line0)] hover:bg-secondary',
              open && 'border-[var(--sk-accent)]',
            )}
          >
            {mode ? (
              <span className="font-mono text-dense-micro uppercase tracking-[0.1em] text-muted-foreground">{mode}</span>
            ) : null}
            <span className={cn('truncate font-semibold', current ? 'text-foreground' : 'text-muted-foreground')}>
              {current ? current.title : 'No objective'}
            </span>
            {wait ? <span className="font-mono text-dense-micro text-[var(--color-lamp-yellow)]">{wait.v}</span> : null}
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[420px] p-0">
          {current ? (
            <>
              <div className="flex flex-wrap items-baseline gap-2 border-b border-border px-3 py-2.5">
                <span className="text-dense-body font-semibold">{current.title}</span>
                <DenseTag size="cell" variant={current.status === 'active' ? 'success' : 'neutral'}>
                  {current.status}
                </DenseTag>
                {subject ? (
                  <span className="font-mono text-dense-meta text-muted-foreground">
                    carrying <span className="font-bold text-[var(--sk-ticker)]">{subject}</span>
                  </span>
                ) : null}
                <span className="ml-auto font-mono text-dense-micro text-muted-foreground">{current.schedule}</span>
              </div>
              <p className="m-0 px-3 pt-2 pb-0.5 text-dense-meta leading-normal text-[var(--sk-mute2)]">
                {mode ? MODE_WHO[mode] : 'This objective states no mode — set one on its page.'}
              </p>
              <div className="py-1">
                {steps.map((st) => (
                  <button
                    key={st.stage}
                    type="button"
                    onClick={() => go(st)}
                    title={`Open ${st.stage}`}
                    className={cn(
                      'grid w-full cursor-pointer grid-cols-[12px_104px_74px_minmax(0,1fr)] items-center gap-2 border-0 px-3 py-1.5 text-left hover:bg-secondary',
                      st.hot ? 'bg-[color-mix(in_srgb,var(--color-lamp-yellow)_8%,transparent)]' : 'bg-transparent',
                    )}
                  >
                    <HealthLamp lamp={st.lamp} variant="dot" title={st.stage} />
                    <span className="text-xs text-foreground">{st.stage}</span>
                    <span className={cn('text-right font-mono text-xs tabular-nums', INK[st.lamp])}>{st.v}</span>
                    <span className="truncate text-dense-meta text-[var(--sk-mute2)]" title={st.note}>
                      {st.note}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="m-0 border-b border-border px-3 py-2.5 text-dense-meta leading-normal text-muted-foreground">
              No objective is in force. Pick one to see its progress and scope the pages that read it.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-3 py-2">
            <span
              className="text-dense-caption font-bold uppercase tracking-[0.12em] text-muted-foreground"
              title={`The objective narrows ${wired || 'no page yet'}; elsewhere it is carried, not applied.`}
            >
              Switch
            </span>
            {[null, ...objectives].map((o) => {
              const on = o ? o.id === objective : isAll
              return (
                <button
                  key={o?.id ?? 'none'}
                  type="button"
                  onClick={() => pick(o)}
                  title={o ? o.title : 'No objective'}
                  className={cn(
                    'max-w-[9rem] cursor-pointer truncate rounded-[4px] border bg-transparent px-2 py-0.5 text-dense-meta',
                    on ? 'border-[var(--sk-accent)] text-foreground' : 'border-[var(--sk-line)] text-secondary-foreground',
                  )}
                >
                  {o ? o.title : 'None'}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/review/objectives')
              }}
              className="ml-auto cursor-pointer border-0 bg-transparent text-dense-meta text-[var(--sk-accent)] hover:underline"
            >
              All objectives →
            </button>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  if (mode === 'hand') return subject ? <HandSteps subject={subject}>{render}</HandSteps> : render(handProgress(null, null))
  return render(loopSteps)
}
