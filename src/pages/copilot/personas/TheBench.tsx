/**
 * The bench — the roster and the record in one table (design Rev 2026-09-21.6).
 *
 * The design merged what had been two: a flat roster of agents and a Track
 * record table below it. One table, nine agents and you, "scored by the same
 * rule": Agent · Role · Path · May call · Threads · Settled · Hit 20d ·
 * Agrees · Weight.
 *
 * **Four of those columns cannot be filled on this side, and the reason is
 * one sentence:** nothing records a judge's verdict against the outcome that
 * followed it. The outcome store attributes a settled candidate to its
 * *source* — where it came from — which is a different question from who
 * graded it, and the Track record table below has always said so. So the
 * record columns read `not recorded` in grey rather than `0`, and the
 * footnote names the store that would fill them. §2.1: grey is not red, and a
 * measured zero is not a missing reading.
 *
 * Two states that *are* real and do get drawn:
 * - **`not a judge`** for Write, Curator and Explain. They write or explain
 *   and never grade, so an empty record is a fact about the role, not a gap.
 * - **the grey ground and the note** on Verdict and Loop Curator: you never
 *   route a question to them. Read from `AGENT_DIRECTLY_ROUTABLE` through
 *   `notRoutableNote`, never from ids written in here.
 */
import { Link } from 'react-router-dom'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeadRow,
  DenseTableHeader,
  DenseTableRow,
  DenseTag,
} from '@/components/data-display'
import { SectionPanel } from '@/components/layout'
import { rowSelectProps } from '@/hooks/useRowLink'
import { agentPathLabel, notRoutableNote } from '@/lib/copilot/agentPaths'
import {
  AGENT_GUARDRAILS,
  AGENT_MCP_SCOPES,
  AGENT_ROLE_KIND,
  ROLE_LABELS,
  agentLabel,
} from '@/lib/copilot/agentPersonaCatalog'
import type { AgentPersona } from '@/api/agentPersona'
import { cn } from '@/lib/utils'

/** Roles that grade. The other three write or explain and never do. */
const JUDGES = new Set(['specialist', 'composer', 'loop'])

/** `research.vrp.* +4` — the first scope, and how many more it may call. */
function scopeText(agent: string): string {
  const scopes = AGENT_MCP_SCOPES[agent] ?? []
  if (scopes.length === 0) return 'no MCP tools'
  return scopes.length === 1 ? scopes[0] : `${scopes[0]} +${scopes.length - 1}`
}

function RecordCell({ judge, title }: { judge: boolean; title: string }) {
  return (
    <DenseTableCell className="max-w-none text-right text-muted-foreground" title={title}>
      {judge ? 'not recorded' : 'not a judge'}
    </DenseTableCell>
  )
}

export function TheBench({
  agents,
  selected,
  onSelect,
}: {
  agents: readonly AgentPersona[]
  selected: string | null
  onSelect: (agentName: string) => void
}) {
  return (
    <SectionPanel
      cap="The bench"
      title={`${agents.length} agents and you, scored by the same rule`}
      note="click a row to edit its persona below"
      action={
        <Link to="/research/orchestration" className="text-dense-meta hover:underline">
          Orchestration ↗
        </Link>
      }
    >
      <DenseDataTable wrapClassName="rounded-none border-0 overflow-x-auto">
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead className="max-w-none">Agent</DenseTableHead>
            <DenseTableHead className="max-w-none">Role</DenseTableHead>
            <DenseTableHead className="max-w-none">Path</DenseTableHead>
            <DenseTableHead className="max-w-none">May call</DenseTableHead>
            <DenseTableHead className="max-w-none text-right">Settled</DenseTableHead>
            <DenseTableHead className="max-w-none text-right">Hit 20d</DenseTableHead>
            <DenseTableHead className="max-w-none text-right">Agrees</DenseTableHead>
            <DenseTableHead className="max-w-none text-right">Weight</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {agents.map((a) => {
            const id = a.agent_name
            const role = AGENT_ROLE_KIND[id] ?? 'specialist'
            const judge = JUDGES.has(role)
            const note = notRoutableNote(id)
            const neutral = AGENT_GUARDRAILS[id]?.neutralAppendix === true
            const why = judge
              ? 'No store records this judge’s verdict against the outcome that followed — see the note below.'
              : 'This agent writes or explains and never grades. An empty record is the role, not a gap.'
            return (
              <DenseTableRow
                key={id}
                {...rowSelectProps(
                  selected === id,
                  () => onSelect(id),
                  cn(
                    selected === id && 'bg-primary/[0.06]',
                    note != null && 'bg-secondary/40',
                  ),
                )}
                title={
                  note == null
                    ? 'Click to edit its persona below.'
                    : `You never route a question here yourself — ${note}. Click to edit its persona.`
                }
              >
                <DenseTableCell className="max-w-none whitespace-nowrap">
                  <span className="flex flex-col">
                    <span className="font-semibold text-foreground">
                      {agentLabel(id, 'en', a.label)}
                    </span>
                    {/* Two layers, and the runtime id is never translated: it
                        is the name the process answers to. */}
                    <span className="font-mono text-dense-micro text-muted-foreground">{id}</span>
                  </span>
                </DenseTableCell>
                <DenseTableCell className="max-w-none">
                  <DenseTag variant="category" size="cell">
                    {ROLE_LABELS.en[role]}
                  </DenseTag>
                </DenseTableCell>
                <DenseTableCell className="max-w-none whitespace-nowrap">
                  <span className="flex flex-col">
                    <span>{agentPathLabel(id)}</span>
                    {note ? (
                      <span className="text-dense-micro text-muted-foreground">{note}</span>
                    ) : null}
                  </span>
                </DenseTableCell>
                <DenseTableCell className="max-w-none">
                  <span className="flex flex-col">
                    <span className="font-mono text-dense-micro text-muted-foreground">
                      {scopeText(id)}
                    </span>
                    {neutral ? (
                      <span className="text-dense-micro text-warning">neutral mandate</span>
                    ) : null}
                  </span>
                </DenseTableCell>
                <RecordCell judge={judge} title={why} />
                <RecordCell judge={judge} title={why} />
                <RecordCell judge={judge} title={why} />
                <RecordCell judge={judge} title={why} />
              </DenseTableRow>
            )
          })}
        </DenseTableBody>
      </DenseDataTable>
      <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
        Where you and a judge disagree is the most useful row: a judge that is right when you are
        wrong earns weight; one that only agrees with you adds nothing. Weight changes are a policy
        patch — they go through the Inbox, and adding or retiring a judge waits for you.{' '}
        <span className="text-foreground/80">
          The four record columns are empty for one reason
        </span>
        : nothing records a judge’s verdict against the outcome that followed it. The outcome store
        attributes a settled candidate to its <em>source</em> — where it came from — which the
        table below reads, and that is a different question from who graded it. Three rows read{' '}
        <span className="text-foreground/80">not a judge</span> instead, because writing and
        explaining are not grading. Rows on a grey ground are reached for you: Verdict composes its
        brief out of the other four, Loop Curator runs after a batch.
      </p>
    </SectionPanel>
  )
}
