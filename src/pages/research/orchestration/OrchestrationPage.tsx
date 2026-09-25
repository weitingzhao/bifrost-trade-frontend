/**
 * Research › Copilot › Orchestration — how the agents are wired to each other.
 *
 * Split out of Personas at Rev 2026-09-21.6 (Shell Spec §11.4): the two pages
 * answer different readers. **Whose reading to trust** is the trader's and
 * stays on the bench; **who hands to whom, and what each may call** is the
 * engineer's and is this page. Whether an agent runs as a model or a
 * heuristic is the operator's, and that stays on System › Status.
 *
 * Four sections, in the prototype's order: the two entry paths side by side,
 * the agent-as-tool strip, the wiring table, and the runtime facts folded
 * away. The app's own diagram — the same graph drawn rather than tabulated —
 * keeps its place behind a fold at the foot: it is not in the design, and it
 * is the only rendering that shows the shape at a glance.
 */
import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader, PageShell, SectionPanel } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { AgentOrchestrationDiagram } from '@/components/copilot/AgentOrchestrationDiagram'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { Skeleton } from '@/components/ui/skeleton'
import { useAgentPersonas } from '@/hooks/useAgentPersonas'
import { rowSelectProps } from '@/hooks/useRowLink'
import {
  ORCHESTRATION_RUNTIME,
  ROLE_LABELS,
  agentLabel,
} from '@/lib/copilot/agentPersonaCatalog'
import {
  edgeCount,
  filterByPath,
  personaPathReading,
  wiringRows,
  type PathFilter,
} from '@/pages/research/orchestration/wiringRows'
import { useQuery } from '@tanstack/react-query'
import { fetchResearchHealth } from '@/api/research/health'
import { cn } from '@/lib/utils'

const LEAD =
  'How the agents are wired to each other. A question you type takes the chat path and is routed ' +
  'once; an objective takes the batch path and is graded by a fixed chain. Who each one is, and ' +
  'how well it has judged, is on Personas.'

interface Stage {
  n: string
  name: string
  tag: string
  sub: string
}

/** The chat path, as the design states it — three stages, one handoff. */
const CHAT: Stage[] = [
  {
    n: '1',
    name: 'Your question',
    tag: 'entry',
    sub: '⌘J on any page, or an Ask on a panel. The page you stood on rides along as a snapshot — symbol, date, origin.',
  },
  {
    n: '2',
    name: 'Triage',
    tag: 'router',
    sub: 'Reads the intent and hands off once. It is the only thing that chooses an agent; you cannot, and this is not a setting.',
  },
  {
    n: '3',
    name: 'One specialist answers',
    tag: 'handoff',
    sub: 'That agent owns the thread until you start another. Its reads are cited; anything it wants to write comes back as a card.',
  },
]

/** The batch path — four stages, and the chain's order is not a decision. */
const BATCH: Stage[] = [
  {
    n: '1',
    name: 'Objective · policy funnel',
    tag: 'policy',
    sub: 'What to pick: universe, layers, score cuts. No agent judges at this stage — the cap sorts, it does not grade.',
  },
  {
    n: '2',
    name: 'Persona eval chain',
    tag: 'fixed',
    sub: 'analyze → portfolio → validate → verdict, in that order, on every candidate. Agreement among them is one of the four leash conditions.',
  },
  {
    n: '3',
    name: 'Loop Curator',
    tag: 'curate',
    sub: 'Drafts the playbook rule or hypothesis the batch argues for, as a patch with its evidence attached.',
  },
  {
    n: '4',
    name: 'Decision Inbox',
    tag: 'you',
    sub: 'Where it waits. Auto-approve reaches research drafts only — never a policy suggestion, never an order intent (D10).',
  },
]

function Path({ stages, cap, title, note }: { stages: Stage[]; cap: string; title: string; note: string }) {
  return (
    <SectionPanel cap={cap} title={title} note={note}>
      <ol className="m-0 flex list-none flex-col gap-0 px-3 py-2.5">
        {stages.map((s, i) => (
          <li key={s.n}>
            <div className="flex items-start gap-2.5">
              <span className="pt-0.5 font-mono text-dense-micro text-muted-foreground">{s.n}</span>
              <div className="min-w-0 space-y-0.5">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-dense-label font-semibold">{s.name}</span>
                  <DenseTag variant="category" size="cell">
                    {s.tag}
                  </DenseTag>
                </span>
                <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
                  {s.sub}
                </p>
              </div>
            </div>
            {i < stages.length - 1 ? (
              <span className="ml-[0.3rem] block h-3 w-px bg-border" aria-hidden />
            ) : null}
          </li>
        ))}
      </ol>
    </SectionPanel>
  )
}

/** The runtime facts, behind a fold: true, and not what the page is for. */
function Fold({
  title,
  note,
  children,
}: {
  title: string
  note: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 bg-secondary px-3 py-2 text-left text-dense-label font-semibold hover:bg-secondary/80"
      >
        <ChevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
        {title}
        <span className="text-dense-meta font-normal text-muted-foreground">{note}</span>
      </button>
      {open ? <div className="border-t border-border/60">{children}</div> : null}
    </section>
  )
}

export default function OrchestrationPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useAgentPersonas()
  const agents = useMemo(() => data ?? [], [data])
  const [path, setPath] = useState<PathFilter>('all')

  const labels: Record<string, string | undefined> = {}
  for (const a of agents) labels[a.agent_name] = a.label

  const rows = useMemo(() => wiringRows(agents.map((a) => a.agent_name)), [agents])
  const shown = useMemo(() => filterByPath(rows, path), [rows, path])
  const edges = edgeCount(shown)
  const healthQ = useQuery({
    queryKey: ['research', 'health'],
    queryFn: fetchResearchHealth,
    staleTime: 60_000,
  })
  const personaPath = personaPathReading(healthQ.data, healthQ.isError)
  const toPersona = (name: string) =>
    navigate(`/research/agent-personas?agent=${encodeURIComponent(name)}`)

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Orchestration"
        description={LEAD}
        actions={
          <span className="flex flex-wrap items-center gap-2">
            <DenseTag
              variant="warning"
              size="cell"
              title="D10 (Shell Spec §11.0): no agent on either path places, modifies or cancels an order. Writes land as cards you approve."
            >
              D10 · observe-only
            </DenseTag>
            <Link to="/research/agent-personas" className="text-dense-meta hover:underline">
              Personas →
            </Link>
          </span>
        }
      />

      {isError ? <ResearchAuthGap error={error} /> : null}
      {isLoading ? <Skeleton className="h-48 w-full rounded-lg" /> : null}

      {!isLoading && !isError ? (
        <>
          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
            <Path
              cap="Chat path"
              title="you ask, triage routes once"
              note="one handoff, not a committee"
              stages={CHAT}
            />
            <Path
              cap="Batch path"
              title="an objective runs, a fixed chain grades it"
              note="the chain's order is not a routing decision"
              stages={BATCH}
            />
          </div>

          <SectionPanel
            cap="Agent as tool"
            title="Verdict has no MCP tools of its own"
            note="this is how the morning and EOD briefs are composed"
          >
            <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              {(rows.find((r) => r.agent === 'verdict')?.calls ?? []).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => toPersona(sub)}
                  className="inline-flex items-baseline gap-1.5 rounded border border-border bg-background px-2 py-0.5 text-dense-meta hover:border-border/80"
                >
                  <span className="font-mono text-dense-micro text-muted-foreground">{sub}</span>
                  {agentLabel(sub, 'en', labels[sub])}
                </button>
              ))}
              <span className="text-muted-foreground" aria-hidden>
                →
              </span>
              <span className="inline-flex items-baseline gap-1.5 rounded border border-border bg-secondary px-2 py-0.5 text-dense-meta font-semibold">
                Verdict
                <span className="font-mono text-dense-micro text-muted-foreground">verdict</span>
              </span>
              <span className="max-w-[60ch] text-dense-meta leading-normal text-muted-foreground text-pretty">
                It calls the four specialists as sub-tools and synthesises one verdict, so a brief
                cites four readings and carries one stance. A dissent among them is kept, never
                averaged away.
              </span>
            </div>
          </SectionPanel>

          <SectionPanel
            cap="Wiring"
            title="every agent, who calls it, and how"
            action={
              <span className="flex items-center gap-2">
                <span className="text-dense-meta text-muted-foreground">{edges} edges</span>
                <SegmentControl
                  size="xs"
                  ariaLabel="Path"
                  value={path}
                  onChange={(v) => setPath(v as PathFilter)}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'chat', label: 'Chat' },
                    { value: 'batch', label: 'Batch' },
                  ]}
                />
              </span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[45rem] border-collapse text-dense-label">
                <thead>
                  <tr className="border-b border-border text-dense-micro uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-1.5 text-left font-semibold">Agent</th>
                    <th className="px-3 py-1.5 text-left font-semibold">Role</th>
                    <th className="px-3 py-1.5 text-left font-semibold">Called by</th>
                    <th className="px-3 py-1.5 text-left font-semibold">How</th>
                    <th className="px-3 py-1.5 text-left font-semibold">It calls</th>
                    <th className="px-3 py-1.5 text-left font-semibold">Path</th>
                    <th className="px-3 py-1.5 text-left font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr
                      key={r.agent}
                      {...rowSelectProps(false, () => toPersona(r.agent))}
                      className="border-b border-border/50 last:border-b-0 hover:bg-secondary/40"
                      title={`Open ${agentLabel(r.agent, 'en', labels[r.agent])}’s persona`}
                    >
                      <td className="px-3 py-1.5">
                        <span className="flex flex-col">
                          <span className="font-semibold">
                            {agentLabel(r.agent, 'en', labels[r.agent])}
                          </span>
                          <span className="font-mono text-dense-micro text-muted-foreground">
                            {r.agent}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <DenseTag variant="category" size="cell">
                          {ROLE_LABELS.en[r.role]}
                        </DenseTag>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {r.invokedBy.map((e) => e.by).join(' · ') || '—'}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-dense-micro text-muted-foreground">
                        {r.invokedBy.map((e) => e.kind.replace('_', ' ')).join(' · ') || '—'}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-dense-micro text-muted-foreground">
                        {r.calls.join(' · ') || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {r.paths.join(' · ') || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-dense-meta text-warning">{r.note ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
              A <span className="font-mono text-foreground/80">handoff</span> passes the whole
              conversation over — the receiving agent answers you directly. An{' '}
              <span className="font-mono text-foreground/80">as tool</span> call keeps the caller in
              charge and takes back a reading. A{' '}
              <span className="font-mono text-foreground/80">chain</span> edge is neither: the loop
              runs it after a batch, and no question is routed to it. Validate carries a neutral
              mandate on both paths — it is instructed to look for the falsification first, which is
              why it agrees with you least often and still earns the highest weight.
            </p>
          </SectionPanel>

          {/* Beyond the design, and kept: the same graph drawn rather than
              tabulated. The table can be filtered and read row by row; only
              the diagram shows the shape at a glance. Folded, because two
              renderings of one graph should not both be the first thing. */}
          <Fold title="The same graph, drawn" note="— the diagram this page grew out of">
            <div className="p-3">
              <AgentOrchestrationDiagram
                activeAgent={null}
                onSelect={toPersona}
                lang="en"
                agentApiLabels={labels}
              />
            </div>
          </Fold>

          <Fold
            title="How it is wired"
            note="— runtime facts, read live, not operated here"
          >
            <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-1.5 px-3 py-2.5 text-dense-meta sm:grid-cols-[auto_minmax(0,1fr)]">
              <dt className="text-muted-foreground">SDK</dt>
              <dd className="m-0 font-mono">{ORCHESTRATION_RUNTIME.sdk}</dd>
              <dt className="text-muted-foreground">Transport</dt>
              <dd className="m-0 font-mono">{ORCHESTRATION_RUNTIME.transport}</dd>
              <dt className="text-muted-foreground">Tool server</dt>
              <dd className="m-0 font-mono">{ORCHESTRATION_RUNTIME.mcpServer}</dd>
              {/* Rev .48 Q1 (B): read live here, not on System Status — Status
                  keeps its three questions, and changing the flag is Ops'. */}
              <dt className="text-muted-foreground">Persona eval path</dt>
              <dd className="m-0">
                <span className="font-mono">{personaPath.value}</span>{' '}
                <span className="text-muted-foreground">· {personaPath.note}</span>
              </dd>
              <dt className="text-muted-foreground">Orders</dt>
              <dd className="m-0">
                None of these agents may place, modify or cancel one. D10 is held by the spine and
                the daemon overlays, not by this page.
              </dd>
            </dl>
          </Fold>
        </>
      ) : null}
    </PageShell>
  )
}
