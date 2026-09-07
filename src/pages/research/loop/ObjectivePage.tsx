/**
 * One objective, as the thing it is: what it hunts, who judges, how tight the
 * leash, what it has done — and every knob the Owner may turn.
 *
 * `/research/loop/objectives/:objectiveId`
 *
 * The Autopilot page is the roster; this is the object. Identity edits (title,
 * description, schedule, persona, status) write in place. Policy edits go
 * through propose → approve so the ledger keeps the reason. Advisory only —
 * D10 BLOCKED.
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, ArchiveRestore, ArrowLeft, Play } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, EmptyState } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RunLoopDialog } from '@/components/research/harness/RunLoopDialog'
import { batchRunObjective, type AutopilotObjective, type BatchRunOverrides, type ResearchObjective } from '@/api/research/harness'
import {
  useAutopilotStanding,
  useChangePolicy,
  useObjective,
  usePatchObjective,
} from '@/hooks/useLoopHarness'
import { fmtIsoTs } from '@/lib/format'
import { fmtUsd } from '@/lib/harness/runSpend'
import { stars } from '@/lib/harness/rating'
import { loopPipelinePath } from '@/lib/harness/loopCopilotPrefill'
import { PERSONAS, SCHEDULES } from '@/lib/harness/objectivePolicy'
import { ObjectivePolicyEditor } from '@/pages/research/loop/ObjectivePolicyEditor'
import { ObjectiveRunsSection } from '@/pages/research/loop/ObjectiveRunsSection'

const TEXTAREA_CLASS =
  'w-full text-dense-body min-h-[60px] resize-y rounded-md border border-input bg-background px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export default function ObjectivePage() {
  const { objectiveId = '' } = useParams<{ objectiveId: string }>()
  const objQ = useObjective(objectiveId || null)
  const standingQ = useAutopilotStanding()
  const brief = standingQ.data?.objectives.find((o) => o.id === objectiveId) ?? null

  if (objQ.isLoading) {
    return (
      <PageShell padding="default" className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </PageShell>
    )
  }
  if (objQ.isError) {
    return (
      <PageShell padding="default">
        <QueryErrorAlert error={objQ.error} onRetry={() => void objQ.refetch()} />
      </PageShell>
    )
  }
  const obj = objQ.data
  if (!obj) {
    return (
      <PageShell padding="default">
        <EmptyState
          title="No such objective"
          description={`${objectiveId} is not in the active or archived list.`}
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/research/loop/harness">Back to Autopilot</Link>
            </Button>
          }
        />
      </PageShell>
    )
  }
  return <ObjectiveBody obj={obj} brief={brief} />
}

function ObjectiveBody({ obj, brief }: { obj: ResearchObjective; brief: AutopilotObjective | null }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const patchMut = usePatchObjective()
  const policyMut = useChangePolicy()
  const batchMut = useMutation({
    mutationFn: (v: { objectiveId: string; overrides: BatchRunOverrides }) => batchRunObjective(v.objectiveId, v.overrides),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'objective-runs'] })
      void queryClient.invalidateQueries({ queryKey: ['research', 'loop', 'autopilot'] })
      if (res.run?.id) navigate(loopPipelinePath(res.run.id, { live: true }))
    },
  })
  const [runOpen, setRunOpen] = useState(false)
  const [policyNote, setPolicyNote] = useState<string | null>(null)
  const archived = obj.status !== 'active'

  return (
    <PageShell padding="default" className="min-w-0 space-y-4 overflow-x-hidden">
      <PageHeader
        title={obj.title}
        breadcrumb={
          <Link to="/research/loop/harness" className="inline-flex items-center gap-1 text-dense-label text-muted-foreground hover:underline">
            <ArrowLeft className="size-3" /> Autopilot
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-7"
              disabled={archived || batchMut.isPending}
              title={archived ? 'Restore the objective to run it' : 'Start a run now with this policy'}
              onClick={() => setRunOpen(true)}
            >
              <Play className="mr-1 size-3" /> {batchMut.isPending ? 'Starting…' : 'Run now'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7"
              disabled={patchMut.isPending}
              onClick={() =>
                patchMut.mutate({ objectiveId: obj.id, body: { status: archived ? 'active' : 'archived' } })
              }
            >
              {archived ? (
                <>
                  <ArchiveRestore className="mr-1 size-3" /> Restore
                </>
              ) : (
                <>
                  <Archive className="mr-1 size-3" /> Archive
                </>
              )}
            </Button>
          </div>
        }
      />
      <p className="flex flex-wrap items-center gap-2 text-dense-label">
        <DenseTag variant={archived ? 'neutral' : 'success'} size="cell">
          {obj.status}
        </DenseTag>
        <DenseTag variant="neutral" size="cell">
          {SCHEDULES.find((s) => s.value === obj.schedule)?.label.split(' — ')[0] ?? obj.schedule}
        </DenseTag>
        <span className="text-muted-foreground">{brief?.hunts || obj.description}</span>
        {batchMut.isError ? (
          <span className="text-destructive">{batchMut.error instanceof Error ? batchMut.error.message : String(batchMut.error)}</span>
        ) : null}
      </p>

      <Standing brief={brief} archived={archived} onOpenMemo={(runId) => navigate(loopPipelinePath(runId, { live: false }))} />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <IdentityCard
          obj={obj}
          saving={patchMut.isPending}
          error={patchMut.isError ? String(patchMut.error) : null}
          onSave={(body) => patchMut.mutate({ objectiveId: obj.id, body })}
        />
        <div className="min-w-0">
          <h2 className="mb-2 text-dense-body font-semibold">Policy</h2>
          <ObjectivePolicyEditor
            policy={obj.policy_json ?? {}}
            submitting={policyMut.isPending}
            error={policyMut.isError ? (policyMut.error instanceof Error ? policyMut.error.message : String(policyMut.error)) : null}
            lastResult={policyNote}
            onSubmit={(suggestion, rationale) => {
              setPolicyNote(null)
              policyMut.mutate(
                { objectiveId: obj.id, suggestion, rationale },
                { onSuccess: () => setPolicyNote('Applied. The change is in the Decision Inbox ledger as an approved policy_suggestion.') },
              )
            }}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-dense-body font-semibold">
          Runs{brief ? ` · ${brief.runs}` : ''}
        </h2>
        <ObjectiveRunsSection objectiveId={obj.id} objectiveTitle={obj.title} />
      </section>

      {runOpen ? (
        <RunLoopDialog
          open
          onOpenChange={(o) => !o && setRunOpen(false)}
          objectiveId={obj.id}
          objectiveTitle={obj.title}
          maxCandidates={Number((obj.policy_json as Record<string, unknown> | null)?.max_candidates) || 8}
          pending={batchMut.isPending}
          onRun={(overrides) => {
            setRunOpen(false)
            batchMut.mutate({ objectiveId: obj.id, overrides })
          }}
        />
      ) : null}
    </PageShell>
  )
}

function Standing({
  brief,
  archived,
  onOpenMemo,
}: {
  brief: AutopilotObjective | null
  archived: boolean
  onOpenMemo: (runId: string) => void
}) {
  if (!brief) {
    return (
      <p className="text-dense-label text-muted-foreground">
        {archived
          ? 'Archived — not on the autopilot roster, so no standing is computed. Its runs stay below.'
          : 'Standing not loaded yet.'}
      </p>
    )
  }
  const memo = brief.last_memo
  const rec = brief.track_record
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
      <div className="min-w-0">
        <div className="text-dense-meta uppercase tracking-wide text-muted-foreground">Last memo</div>
        {memo ? (
          <>
            <button type="button" className="mt-0.5 text-left text-base leading-relaxed hover:underline" onClick={() => onOpenMemo(memo.run_id)}>
              {memo.headline}
            </button>
            {memo.picks.length ? (
              <p className="mt-1 flex flex-wrap gap-1.5">
                {memo.picks.map((p) => (
                  <DenseTag key={p.symbol} variant={p.action === 'buy_zone' || p.action === 'accumulate' ? 'success' : 'neutral'} size="cell">
                    {p.symbol} {stars(p.conviction).replace(/☆+$/, '')}
                  </DenseTag>
                ))}
              </p>
            ) : null}
            <p className="mt-1 text-dense-label text-muted-foreground">{fmtIsoTs(memo.started_at)}</p>
          </>
        ) : (
          <p className="mt-0.5 text-dense-label text-muted-foreground">No rated run yet.</p>
        )}
      </div>
      <Fact label="Track record">
        {rec.status === 'ok' && rec.hit_rate != null ? (
          <>
            <span className="font-mono text-lg font-semibold tabular-nums">{Math.round(rec.hit_rate * 100)}%</span>
            <span className="text-dense-label text-muted-foreground">
              {' '}
              beat SPY · {rec.judged} at T+{rec.horizon_days}
              {rec.scope === 'source' ? ' · harness-wide' : ''}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">nothing settled yet</span>
        )}
      </Fact>
      <Fact label="Cost · 30 days">
        <span className="font-mono text-lg font-semibold tabular-nums">{fmtUsd(brief.spend_30d_usd)}</span>
      </Fact>
      <Fact label="Waiting on you">
        <span className="font-mono text-lg font-semibold tabular-nums">{brief.pending_memos}</span>
        <span className="text-dense-label text-muted-foreground"> {brief.pending_memos === 1 ? 'memo' : 'memos'}</span>
      </Fact>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-dense-meta uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 leading-relaxed">{children}</div>
    </div>
  )
}

function IdentityCard({
  obj,
  saving,
  error,
  onSave,
}: {
  obj: ResearchObjective
  saving: boolean
  error: string | null
  onSave: (body: { title?: string; description?: string; schedule?: string; persona?: string }) => void
}) {
  const [title, setTitle] = useState(obj.title)
  const [description, setDescription] = useState(obj.description)
  const [schedule, setSchedule] = useState(obj.schedule)
  const [persona, setPersona] = useState(obj.persona)
  const dirty =
    title.trim() !== obj.title || description.trim() !== obj.description || schedule !== obj.schedule || persona !== obj.persona

  return (
    <div className="space-y-3 rounded-lg border border-border bg-secondary/40 px-4 py-3">
      <h2 className="text-dense-body font-semibold">Identity</h2>
      <label className="block">
        <span className="text-dense-meta uppercase tracking-wide text-muted-foreground">Title</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-7 text-dense-body" />
      </label>
      <label className="block">
        <span className="text-dense-meta uppercase tracking-wide text-muted-foreground">What it is for</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`mt-1 ${TEXTAREA_CLASS}`} />
      </label>
      <label className="block">
        <span className="text-dense-meta uppercase tracking-wide text-muted-foreground">Schedule</span>
        <Select value={schedule} onValueChange={setSchedule}>
          <SelectTrigger className="mt-1 h-7 text-dense-body">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCHEDULES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-dense-body">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-dense-label text-muted-foreground">
          The unattended CronJob runs every active objective on weekdays; adhoc objectives only run from Run now.
        </span>
      </label>
      <label className="block">
        <span className="text-dense-meta uppercase tracking-wide text-muted-foreground">Persona</span>
        <Select value={persona} onValueChange={setPersona}>
          <SelectTrigger className="mt-1 h-7 text-dense-body">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERSONAS.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-dense-body">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="h-7"
          disabled={!dirty || saving || !title.trim() || !description.trim()}
          onClick={() =>
            onSave({
              ...(title.trim() !== obj.title ? { title: title.trim() } : {}),
              ...(description.trim() !== obj.description ? { description: description.trim() } : {}),
              ...(schedule !== obj.schedule ? { schedule } : {}),
              ...(persona !== obj.persona ? { persona } : {}),
            })
          }
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {dirty ? (
          <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => { setTitle(obj.title); setDescription(obj.description); setSchedule(obj.schedule); setPersona(obj.persona) }}>
            Reset
          </Button>
        ) : null}
        <span className="text-dense-label text-muted-foreground">
          {obj.id} · created {fmtIsoTs(obj.created_at)}
        </span>
      </div>
      {error ? <p className="text-dense-label text-destructive">{error}</p> : null}
    </div>
  )
}
