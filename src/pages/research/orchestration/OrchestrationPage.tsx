/**
 * Research › Copilot › Orchestration — who hands off to whom.
 *
 * Split out of Personas at Rev 2026-09-21.6 (Shell Spec §11.4): the two pages
 * answer different readers' questions. **Whose reading to trust** is the
 * trader's, and it stays on Personas with the bench. **Who hands to whom, and
 * what each may call** is the engineer's, and it is this page. Whether an
 * agent runs as a model or a heuristic is the operator's, and that stays on
 * System › Status.
 *
 * The diagram itself did not change — it moved. What changed around it: the
 * SDK and transport names left the page head for the fold at the foot, since
 * a page a trader opens should not lead with a library name.
 */
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout'
import { AgentOrchestrationDiagram } from '@/components/copilot/AgentOrchestrationDiagram'
import { ORCHESTRATION_RUNTIME } from '@/lib/copilot/agentPersonaCatalog'
import { useAgentPersonas } from '@/hooks/useAgentPersonas'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const LEAD =
  'How a question reaches an agent and what that agent may call. Triage routes a thread; a ' +
  'candidate batch takes the review chain instead. Nothing here places an order — D10 holds at ' +
  'every edge.'

/** The runtime facts, behind a fold: true, and not what the page is for. */
function HowItIsWired() {
  const [open, setOpen] = useState(false)
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-dense-label text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      >
        <ChevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
        How it is wired
        <span className="text-dense-meta text-muted-foreground/70">
          — SDK, transport, tool server, and what runs as a model
        </span>
      </button>
      {open ? (
        <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-1.5 border-t border-border/60 px-3 py-2.5 text-dense-meta sm:grid-cols-[auto_minmax(0,1fr)]">
          <dt className="text-muted-foreground">SDK</dt>
          <dd className="m-0 font-mono">{ORCHESTRATION_RUNTIME.sdk}</dd>
          <dt className="text-muted-foreground">Transport</dt>
          <dd className="m-0 font-mono">{ORCHESTRATION_RUNTIME.transport}</dd>
          <dt className="text-muted-foreground">Tool server</dt>
          <dd className="m-0 font-mono">{ORCHESTRATION_RUNTIME.mcpServer}</dd>
          <dt className="text-muted-foreground">Persona eval</dt>
          <dd className="m-0">
            <span className="font-mono">BIFROST_PERSONA_EVAL_AGENTS=1</span> turns the agent path
            on; without it a persona is evaluated by the heuristic. Which one is running is a
            deployment reading, and it lives on{' '}
            <span className="text-foreground/80">System › Status</span>, not here.
          </dd>
          <dt className="text-muted-foreground">Orders</dt>
          <dd className="m-0">
            None of these agents may place, modify or cancel one. D10 is held by the spine and the
            daemon overlays, not by this page.
          </dd>
        </dl>
      ) : null}
    </section>
  )
}

export default function OrchestrationPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useAgentPersonas()
  const agents = data ?? []
  const labels: Record<string, string | undefined> = {}
  for (const a of agents) labels[a.agent_name] = a.label

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader title="Orchestration" description={LEAD} />

      {isError ? <ResearchAuthGap error={error} /> : null}
      {isLoading ? <Skeleton className="h-64 w-full rounded-lg" /> : null}

      {!isLoading && !isError ? (
        <AgentOrchestrationDiagram
          activeAgent={null}
          // Picking an agent here is a question about that agent's persona,
          // and the persona lives on the page that owns it.
          onSelect={(name) => navigate(`/research/agent-personas?agent=${encodeURIComponent(name)}`)}
          lang="en"
          agentApiLabels={labels}
        />
      ) : null}

      <HowItIsWired />
    </PageShell>
  )
}
