/**
 * The Console's New objective panel (design Rev .100 `Autopilot Console`,
 * Owner 2026-09-29): three origins side by side instead of a blank form.
 * Promote a hand-run draft by giving it a schedule, or a saved screen into a
 * draft; Fork a standing objective with its policy copied and its lineage
 * kept; or start from a Template. Every path but the draft promotion ends in
 * the same form, pre-filled — an origin fills the fields in, it does not skip
 * them.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchObjectiveRuns, fetchObjectives, patchObjective } from '@/api/research/harness'
import { fetchSavedScreens } from '@/api/research/savedScreens'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { firstResearchAuthGapError } from '@/lib/auth/researchAuthGap'
import { NewObjectiveForm, type ObjectiveSeed } from '@/components/research/NewObjectiveDialog'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useAutopilotStanding, usePolicyTemplates } from '@/hooks/useLoopHarness'
import { SCHEDULES, objectivePath } from '@/lib/harness/objectivePolicy'
import { todayIso } from '@/lib/researchFreshness'
import { cn } from '@/lib/utils'
import { forkBody, objectiveOrigins, screenOrigin, type OriginColumn, type OriginPick } from './objectiveOrigins'
import { CloseButton } from '@/components/data-display'

const TAG_INK: Record<OriginColumn['id'], string> = {
  promote: 'var(--color-profit)',
  fork: 'var(--sk-accent)',
  template: 'var(--sk-mute2)',
}

function seedFor(p: OriginPick, today: string): ObjectiveSeed | null {
  if (p.kind === 'fork') {
    const body = forkBody(p.objective, today)
    const { origin, ...policy } = body.policy_json as Record<string, unknown>
    return {
      heading: `Fork · ${p.objective.title}`,
      title: body.title,
      description: body.description,
      schedule: body.schedule,
      persona: body.persona,
      policy: { label: `Copied from ${p.objective.title}`, json: policy },
      origin: origin as Record<string, unknown>,
    }
  }
  if (p.kind === 'screen')
    return {
      heading: `Promote · ${p.screen.name}`,
      title: p.screen.name,
      description: p.screen.description ?? `Promoted from the saved screen “${p.screen.name}”.`,
      origin: screenOrigin(p.screen, today),
    }
  if (p.kind === 'template') return { heading: `New objective · ${p.template.name}`, templateId: p.template.id }
  return null
}

function PromoteDraft({ pick, onDone }: { pick: Extract<OriginPick, { kind: 'draft' }>; onDone: () => void }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [schedule, setSchedule] = useState('daily_open')
  const promote = useMutation({
    mutationFn: () => patchObjective(pick.id, { schedule }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['research-engine', 'objectives'] })
      onDone()
      navigate(objectivePath(pick.id))
    },
  })
  return (
    <div className="mt-1 flex flex-col gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--color-profit)_7%,transparent)] px-2 py-1.5">
      <span className="text-dense-meta text-[var(--sk-soft)]">
        Give it a schedule and it runs on its own. With no settled record it still starts on probation — every batch waits for
        you until five outcomes settle.
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <select
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          aria-label="Schedule"
          className="h-6 mat-field px-1.5 text-dense-meta"
        >
          {SCHEDULES.filter((s) => s.value !== 'adhoc').map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={promote.isPending}
          onClick={() => promote.mutate()}
          className="h-6 rounded-full border-0 bg-[var(--color-profit)] px-2.5 text-dense-meta font-semibold text-[var(--sk-on-accent)] disabled:opacity-60"
        >
          {promote.isPending ? 'Promoting…' : 'Promote'}
        </button>
      </span>
      {promote.isError ? <span className="text-dense-meta text-destructive">Not promoted: {(promote.error as Error).message}</span> : null}
    </div>
  )
}

export function NewObjectiveOrigins({ onClose }: { onClose: () => void }) {
  const [seed, setSeed] = useState<ObjectiveSeed | null>(null)
  const [promoting, setPromoting] = useState<string | null>(null)
  const objQ = useQuery({
    queryKey: QUERY_KEYS.researchEngine.objectives({ status: 'active' }),
    queryFn: () => fetchObjectives({ status: 'active' }),
    staleTime: 15_000,
  })
  const runsQ = useQuery({
    queryKey: ['research-engine', 'objective-runs', 'origins'],
    queryFn: () => fetchObjectiveRuns({ limit: 200 }),
    staleTime: 60_000,
  })
  const screensQ = useQuery({ queryKey: ['research-engine', 'saved-screens'], queryFn: fetchSavedScreens, staleTime: 60_000, retry: 1 })
  const templatesQ = usePolicyTemplates()
  const standing = useAutopilotStanding()
  const columns = useMemo(() => {
    const runs = new Map<string, number>()
    for (const r of runsQ.data?.items ?? []) runs.set(r.objective_id, (runs.get(r.objective_id) ?? 0) + 1)
    return objectiveOrigins({
      objectives: objQ.data?.items ?? [],
      runsByObjective: runs,
      records: new Map((standing.data?.objectives ?? []).map((o) => [o.id, o.track_record])),
      screens: screensQ.data?.screens ?? [],
      templates: templatesQ.data?.items ?? [],
    })
  }, [objQ.data, runsQ.data, standing.data, screensQ.data, templatesQ.data])
  const loading = objQ.isLoading || runsQ.isLoading || templatesQ.isLoading
  // Signed out these reads answer 401; an origin with nothing to offer would
  // otherwise say its empty line ("no objective has a record yet") as fact.
  const gap = firstResearchAuthGapError(
    objQ.data ? null : objQ.error,
    runsQ.data ? null : runsQ.error,
    templatesQ.data ? null : templatesQ.error,
    screensQ.data ? null : screensQ.error,
    standing.data ? null : standing.error,
  )
  const today = todayIso()

  return (
    <section className="overflow-hidden bg-[color-mix(in_srgb,var(--sk-accent)_6%,transparent)] mat-card" aria-label="New objective">
      <header className="flex flex-wrap items-baseline gap-2 border-b border-border px-3 py-2">
        <span className="text-dense-body font-semibold">New objective</span>
        <span className="text-dense-meta text-muted-foreground">
          three origins, no blank form — a policy you guessed is a policy with no evidence behind it
        </span>
        <CloseButton className="ml-auto self-center" onClick={onClose} label="Close new objective" />
      </header>
      {gap ? <ResearchAuthGap error={gap} layout="banner" className="mx-3 mt-2" /> : null}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]">
        {columns.map((c, ci) => (
          <div key={c.id} className={cn('flex min-w-0 flex-col gap-1.5 px-3 py-3', ci > 0 && 'border-l border-border')}>
            <div className="flex items-baseline gap-2">
              <span className="text-dense-body font-semibold">{c.name}</span>
              <span
                className="rounded-full px-1.5 font-mono text-dense-micro font-bold"
                style={{ color: TAG_INK[c.id], background: `color-mix(in srgb, ${TAG_INK[c.id]} 12%, transparent)` }}
              >
                {c.tag}
              </span>
            </div>
            <p className="m-0 text-dense-meta leading-normal text-[var(--sk-mute2)]">{c.why}</p>
            {loading ? (
              <span className="text-dense-meta text-muted-foreground">Reading…</span>
            ) : c.picks.length === 0 ? (
              <span className="text-dense-meta leading-normal text-muted-foreground">{gap ? '— not read' : c.empty}</span>
            ) : (
              <div className="flex flex-col gap-0.5">
                {c.picks.map((p) => (
                  <div key={`${p.kind}:${p.id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        if (p.kind === 'draft') setPromoting(promoting === p.id ? null : p.id)
                        else setSeed(seedFor(p, today))
                      }}
                      className="flex w-full items-baseline gap-2 rounded-md px-1.5 py-1 text-left hover:bg-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)]"
                    >
                      <span className="min-w-0 truncate text-dense-label">{p.label}</span>
                      <span className="ml-auto shrink-0 font-mono text-dense-micro text-muted-foreground">{p.meta}</span>
                    </button>
                    {p.kind === 'draft' && promoting === p.id ? <PromoteDraft pick={p} onDone={onClose} /> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="m-0 border-t border-border px-3 py-2 text-dense-micro leading-normal text-muted-foreground">
        However it is born, a new objective starts with no record — so the leash’s fourth condition cannot hold and every batch
        waits for you. It does not need a safety setting; it needs five settled outcomes.
      </p>
      {seed ? (
        <NewObjectiveForm
          seed={seed}
          onClose={() => {
            setSeed(null)
          }}
        />
      ) : null}
    </section>
  )
}
