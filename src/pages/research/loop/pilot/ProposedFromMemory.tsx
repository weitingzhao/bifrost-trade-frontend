/**
 * Proposed · from memory — the Console block (design Rev .100/.102, Vision
 * §22.4). Each row cites the memory it rests on; Draft objective opens a
 * pre-filled draft in place (Owner 2026-09-28: no dead-end toast), Create
 * writes it with the origin edge, and the row turns into ✓ Drafted with Undo.
 * Not now counts in the memory store (§20.6) and three go quiet.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionPanel } from '@/components/layout'
import { dismissMemoryHint, fetchMemory } from '@/api/research/journal'
import { createObjective, deleteObjective, fetchObjectives } from '@/api/research/harness'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { objectivePath } from '@/lib/harness/objectivePolicy'
import { todayIso } from '@/lib/researchFreshness'
import { draftFromProposal, memoryProposals, QUIET_AT, type MemoryProposal } from '@/lib/harness/memoryProposals'

const MEM = 'var(--color-unrealized)'

function DraftForm({ p, onCreate, onCancel, busy, error }: { p: MemoryProposal; onCreate: () => void; onCancel: () => void; busy: boolean; error: string | null }) {
  const navigate = useNavigate()
  const m = p.memory
  const rows: [string, string][] = [
    ['Thesis', p.thesis],
    ['Scope', p.scope],
    ['Dial', 'L0 — hand-run only; nothing runs on a schedule until you promote it'],
    ['Leash', 'no record yet, so every batch waits for you (the fourth condition needs five settled outcomes)'],
  ]
  return (
    <div className="mx-3 mb-2.5 flex flex-col gap-2 rounded-[var(--card-radius)] bg-[color-mix(in_srgb,var(--sk-accent)_7%,transparent)] px-3 py-2.5">
      <dl className="m-0 grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-dense-label leading-normal">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="pt-0.5 text-dense-micro font-semibold tracking-[.08em] text-muted-foreground uppercase">{k}</dt>
            <dd className={k === 'Thesis' ? 'm-0 text-foreground' : 'm-0 text-[var(--sk-soft)]'}>{v}</dd>
          </div>
        ))}
        <dt className="pt-0.5 text-dense-micro font-semibold tracking-[.08em] text-muted-foreground uppercase">Born</dt>
        <dd className="m-0 font-mono text-dense-meta" style={{ color: MEM }}>
          from {m.id} · n={m.evidence.length} — the link stays;{' '}
          <button type="button" onClick={() => navigate(`/research/trace?m=${encodeURIComponent(m.id)}`)} className="hover:underline" style={{ color: MEM }}>
            Trace shows the chain
          </button>
        </dd>
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCreate}
          disabled={busy}
          className="h-6 rounded-full border-0 bg-[var(--sk-accent)] px-3 text-dense-label font-semibold text-[var(--sk-on-accent)] disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create draft objective'}
        </button>
        <button type="button" onClick={onCancel} className="text-dense-meta text-muted-foreground hover:text-foreground">
          Cancel
        </button>
        <span className="ml-auto text-dense-meta text-muted-foreground">a draft never runs on its own — you hand-run it until it has a record</span>
      </div>
      {error ? <span className="text-dense-meta text-destructive">Not created: {error}</span> : null}
    </div>
  )
}

export function ProposedFromMemory() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState<string | null>(null)
  const memQ = useQuery({ queryKey: ['research-engine', 'journal', 'memory'], queryFn: fetchMemory, staleTime: 300_000, retry: 1 })
  const objQ = useQuery({
    queryKey: QUERY_KEYS.researchEngine.objectives({ status: 'active' }),
    queryFn: () => fetchObjectives({ status: 'active' }),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['research-engine', 'objectives'] })
    void qc.invalidateQueries({ queryKey: ['research-engine', 'journal', 'memory'] })
  }
  const create = useMutation({
    mutationFn: (p: MemoryProposal) => createObjective(draftFromProposal(p, todayIso())),
    onSuccess: () => {
      setOpen(null)
      refresh()
    },
  })
  const undo = useMutation({ mutationFn: (id: string) => deleteObjective(id), onSuccess: refresh })
  const later = useMutation({ mutationFn: (topic: string) => dismissMemoryHint(topic), onSuccess: refresh })

  if (!memQ.data || !objQ.data) return null
  const proposals = memoryProposals({
    memories: memQ.data.memories,
    axes: memQ.data.axes,
    hints: memQ.data.hints,
    objectives: objQ.data.items,
  })
  if (proposals.length === 0) return null

  return (
    <SectionPanel
      cap="Proposed"
      title="from memory"
      note="what the distill keeps seeing you do — it proposes, you decide; nothing here runs until approved"
    >
      <div className="flex flex-col">
        {proposals.map((p, i) => {
          const m = p.memory
          const formOn = open === m.id && !p.drafted
          return (
            <div key={m.id} className={i > 0 ? 'border-t border-border' : undefined}>
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5 px-3 py-2">
                <span className="text-dense-body font-semibold">{p.title}</span>
                <span className="min-w-0 flex-[1_1_280px] text-dense-meta leading-normal text-[var(--sk-mute2)]">{p.why}</span>
                <button
                  type="button"
                  onClick={() => navigate(`/research/agent-personas/you?m=${encodeURIComponent(m.id)}`)}
                  title={`Open memory ${m.id} on the You page — its evidence and Forget live there.`}
                  className="font-mono text-dense-meta hover:underline"
                  style={{ color: MEM }}
                >
                  {m.id} · n={m.evidence.length}
                </button>
                <span className="ml-auto inline-flex items-baseline gap-2">
                  {p.drafted ? (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate(objectivePath(p.drafted!.id))}
                        className="text-dense-meta text-[var(--color-profit)] hover:underline"
                      >
                        ✓ Drafted as “{p.drafted.title}”
                      </button>
                      <button
                        type="button"
                        disabled={undo.isPending}
                        onClick={() => undo.mutate(p.drafted!.id)}
                        title="Delete the draft objective and put the proposal back — refused once it has runs"
                        className="text-dense-meta text-muted-foreground hover:text-foreground"
                      >
                        Undo
                      </button>
                    </>
                  ) : formOn ? null : (
                    <>
                      <button
                        type="button"
                        onClick={() => setOpen(m.id)}
                        className="h-5.5 rounded-full border border-[color-mix(in_srgb,var(--sk-accent)_45%,transparent)] bg-transparent px-2.5 text-dense-meta font-semibold whitespace-nowrap text-[var(--sk-accent)]"
                      >
                        Draft objective →
                      </button>
                      <button
                        type="button"
                        disabled={later.isPending}
                        onClick={() => later.mutate(m.topic)}
                        title={`The dismissal counts as a signal (Spec §20.6) — ignored ${QUIET_AT} times, the proposal silences itself. The count is the one the Plans hint reads for this memory.`}
                        className="text-dense-meta whitespace-nowrap text-[var(--sk-mute2)] hover:text-foreground"
                      >
                        Not now{p.dismissals ? ` · ${p.dismissals}` : ''}
                      </button>
                    </>
                  )}
                </span>
              </div>
              {formOn ? (
                <DraftForm
                  p={p}
                  busy={create.isPending}
                  error={create.isError ? (create.error as Error).message : null}
                  onCreate={() => create.mutate(p)}
                  onCancel={() => setOpen(null)}
                />
              ) : null}
            </div>
          )
        })}
        {undo.isError ? (
          <span className="px-3 pb-2 text-dense-meta text-destructive">Undo refused: {(undo.error as Error).message}</span>
        ) : null}
      </div>
    </SectionPanel>
  )
}
