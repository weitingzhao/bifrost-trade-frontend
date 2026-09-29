/**
 * Trace — `/research/trace?m=M-9` (design `Research Trace.dc.html`, Rev
 * .100/.102; Vision §22.5–22.6). One artifact's chain, top to bottom: the
 * trail it was distilled from, the distill, the memory, and what it caused.
 * Solid arcs happened; dashed arcs are the loop's not-yet, each saying why.
 * The footer is the §22.5 immune check, read from where the evidence stands.
 *
 * Opens from a memory's Trace action (You page, the Journal's Day view). The
 * design's contract is the app's: a trace is a walk over Journal edges, no
 * store of its own — so this page reads `journal.memory` and derives.
 */
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMemory } from '@/api/research/journal'
import { fetchObjectiveRuns, fetchObjectives } from '@/api/research/harness'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useAutopilotStanding } from '@/hooks/useLoopHarness'
import { isProposable } from '@/lib/harness/memoryProposals'
import { objectiveOrigin } from '@/lib/harness/objectiveOrigin'
import { PageHead, PageShell } from '@/components/layout'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { ViewState } from '@bifrost/ui'
import { cn } from '@/lib/utils'
import { immuneCheck, SOURCE_STANDING, traceChain, type TraceArc, type TraceNode } from './traceModel'

const MUTE = 'var(--sk-mute2)'
const LINE = 'var(--sk-line2)'
const ORANGE = 'var(--color-unrealized)'
const LIME = 'var(--sk-ticker)'
const PURPLE = 'var(--sk-accent)'
const SKY = 'var(--sk-contract)'

const ARC_INK: Record<TraceArc, string> = {
  trail: MUTE,
  distill: MUTE,
  memory: ORANGE,
  propose: ORANGE,
  will: PURPLE,
  run: LIME,
  settle: MUTE,
}

function tagInk(n: TraceNode): string {
  if (n.arc === 'trail') {
    const standing = SOURCE_STANDING[n.tag.toLowerCase()]
    return standing === 'market' ? SKY : standing === 'yours' ? 'var(--sk-soft)' : 'var(--color-warning)'
  }
  return n.arc === 'distill' || n.arc === 'settle' ? MUTE : ARC_INK[n.arc]
}

const IMMUNE_INK = {
  rooted: 'var(--color-profit)',
  yours: 'var(--sk-soft)',
  echo: 'var(--color-warning)',
  empty: MUTE,
} as const

const IMMUNE_CAP = { rooted: 'Immune check', yours: 'Immune check', echo: 'Echo', empty: 'Immune check' } as const

function Node({ n, next, onGo }: { n: TraceNode; next: TraceNode | undefined; onGo: (to: string) => void }) {
  const ink = tagInk(n)
  const dashed = !n.walked || (next != null && !next.walked)
  return (
    <div className="grid grid-cols-[92px_20px_minmax(0,1fr)] gap-x-2.5">
      <div className="pt-2.5 text-right">
        <span className="font-mono text-dense-micro font-bold tracking-[.1em] uppercase" style={{ color: ARC_INK[n.arc] }}>
          {n.arc}
        </span>
      </div>
      <div className="relative flex justify-center">
        <span aria-hidden className="absolute inset-y-0 w-0 border-l-2" style={{ borderLeftStyle: dashed ? 'dashed' : 'solid', borderLeftColor: LINE }} />
        <span
          title={n.walked ? 'A Journal artifact' : 'Not walked yet — the dashed part of the loop'}
          className="relative z-[1] mt-3 box-content size-[9px] rounded-full border-2"
          style={{ background: n.walked ? ink : 'transparent', borderColor: n.walked ? 'var(--sk-raised)' : LINE }}
        />
      </div>
      <div className="min-w-0 pt-2 pb-3.5">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
          <span
            title="Artifact kind — the variant carries the meaning"
            className="rounded-full px-1.5 py-px font-mono text-dense-micro font-bold tracking-[.06em]"
            style={{ color: ink, background: `color-mix(in srgb, ${ink} 14%, transparent)` }}
          >
            {n.tag}
          </span>
          <span className={cn('text-dense-body leading-snug font-semibold', !n.walked && 'text-[var(--sk-mute2)]')}>{n.title}</span>
          <span className="ml-auto font-mono text-dense-micro whitespace-nowrap text-muted-foreground">{n.at}</span>
        </div>
        {n.sub ? <p className="mt-1 text-dense-meta leading-relaxed text-pretty text-[var(--sk-mute2)]">{n.sub}</p> : null}
        {n.kids.length ? (
          <div className="mt-1.5 flex flex-col gap-0.5">
            {n.kids.map((k, i) => {
              const row = (
                <>
                  <span className="w-[78px] flex-none font-mono text-dense-micro text-muted-foreground">{k.at}</span>
                  <span className="flex-none font-mono text-dense-micro font-bold" style={{ color: ink }}>
                    {k.kind}
                  </span>
                  <span className="min-w-0 text-dense-micro text-[var(--sk-soft)] [overflow-wrap:anywhere]">{k.text}</span>
                </>
              )
              return k.to ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => onGo(k.to!)}
                  className="flex cursor-pointer items-baseline gap-2 rounded border-0 bg-transparent p-0 text-left hover:bg-[color-mix(in_srgb,var(--sk-ink)_5%,transparent)]"
                >
                  {row}
                </button>
              ) : (
                <div key={i} className="flex items-baseline gap-2" title="The store carries no page for this piece of evidence">
                  {row}
                </div>
              )
            })}
          </div>
        ) : null}
        {n.go ? (
          <div className="mt-1.5">
            <button type="button" onClick={() => onGo(n.go!.to)} className="text-dense-meta whitespace-nowrap text-primary hover:underline">
              {n.go.label}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function TracePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const memQ = useQuery({
    queryKey: ['research', 'journal', 'memory'],
    queryFn: fetchMemory,
    staleTime: 300_000,
    retry: 1,
  })
  const memories = memQ.data?.memories ?? []
  const asked = params.get('m')
  const memory = asked ? memories.find((m) => m.id === asked) : memories[0]
  const objQ = useQuery({
    queryKey: QUERY_KEYS.research.objectives({ status: 'active' }),
    queryFn: () => fetchObjectives({ status: 'active' }),
    staleTime: 15_000,
  })
  const bornObj = memory ? (objQ.data?.items ?? []).find((o) => objectiveOrigin(o)?.memory_id === memory.id) ?? null : null
  const bornRunsQ = useQuery({
    queryKey: ['research', 'objective-runs', 'trace', bornObj?.id ?? ''],
    queryFn: () => fetchObjectiveRuns({ objective_id: bornObj!.id, limit: 100 }),
    enabled: bornObj != null,
    staleTime: 60_000,
  })
  const standing = useAutopilotStanding()
  const bornRec = bornObj ? standing.data?.objectives.find((o) => o.id === bornObj.id)?.track_record : undefined
  const downstream = memory
    ? {
        proposed: isProposable(memory, memQ.data?.axes ?? []),
        born: bornObj
          ? {
              id: bornObj.id,
              title: bornObj.title,
              created: bornObj.created_at,
              runs: bornRunsQ.data?.items.length ?? 0,
              settled: bornRec?.status === 'ok' && bornRec.scope !== 'source' ? bornRec.judged : 0,
            }
          : null,
      }
    : undefined
  const nodes =
    memory && memQ.data ? traceChain({ memory, axes: memQ.data.axes, sources: memQ.data.sources, downstream }) : []
  const immune = memory ? immuneCheck(memory) : null
  const pick = (id: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        next.set('m', id)
        return next
      },
      { replace: true },
    )

  return (
    <PageShell padding="compact">
      <article className="mx-auto flex w-full max-w-[760px] flex-col gap-3.5">
        <PageHead
          title={memory ? `Trace · ${memory.id}` : 'Trace'}
          meta={memory ? 'where it came from, what it caused' : undefined}
          info="Opens from any artifact's Trace action. Every node is a Journal artifact; solid arcs happened, dashed arcs are the loop's not-yet. Up asks provenance, down asks consequence (Vision §22.6). A trace is a walk over Journal edges — evidence refs, citations, objective origin, run → verdict attribution. No new store; the chain is derived."
        />
        {memories.length > 1 ? (
          <div data-sr-toolbar className="flex flex-wrap items-center gap-1.5">
            <span className="text-dense-meta text-muted-foreground">Trace a memory</span>
            {memories.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => pick(m.id)}
                title={m.text}
                aria-pressed={m.id === memory?.id}
                className={cn(
                  'h-5.5 cursor-pointer rounded-md border-0 px-1.5 font-mono text-dense-micro font-bold',
                  m.id === memory?.id
                    ? 'bg-[color-mix(in_srgb,var(--color-unrealized)_18%,transparent)] text-[var(--color-unrealized)]'
                    : 'bg-transparent text-[var(--sk-soft)] hover:bg-[color-mix(in_srgb,var(--sk-ink)_7%,transparent)]',
                )}
              >
                {m.id}
              </button>
            ))}
          </div>
        ) : null}

        {memQ.isLoading ? (
          <ViewState kind="loading" title="Reading the memory store" rows={6} cols={3} />
        ) : memQ.isError ? (
          <ResearchAuthGap error={memQ.error} />
        ) : !memory ? (
          <ViewState
            kind="empty"
            title={asked ? `No memory ${asked}` : 'No memory to trace'}
            detail={
              asked
                ? 'It is not in the store — forgotten, archived, or never distilled. The You page lists what the distill holds now.'
                : 'The nightly distill has not written a memory yet; it starts from your trail after the close.'
            }
            actionLabel="You →"
            onAction={() => navigate('/research/agent-personas/you')}
          />
        ) : (
          <>
            <section className="flex flex-col" aria-label={`Trace of ${memory.id}`}>
              {nodes.map((n, i) => (
                <Node key={`${n.arc}-${n.tag}`} n={n} next={nodes[i + 1]} onGo={(to) => navigate(to)} />
              ))}
            </section>
            {immune ? (
              <footer className="flex flex-col gap-1.5 border-t border-[var(--sk-line)] pt-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="flex-none font-mono text-dense-micro font-bold tracking-[.1em] uppercase" style={{ color: IMMUNE_INK[immune.verdict] }}>
                    {IMMUNE_CAP[immune.verdict]}
                  </span>
                  <span className="text-dense-meta leading-relaxed text-[var(--sk-mute2)]">{immune.text}</span>
                </div>
                <span className="text-dense-micro leading-relaxed text-[var(--sk-faint)]">
                  The chain is derived: the memory store gives the evidence, the distill dates and the portrait axes it backs; below
                  the memory, an objective drafted from its proposal records it as its origin, and its runs and settles follow.
                </span>
              </footer>
            ) : null}
          </>
        )}
      </article>
    </PageShell>
  )
}
