/**
 * One objective, as the thing it is — walked against
 * `Research Objective.dc.html` (Rev 2026-09-20.3) on 2026-09-22.
 *
 * `/research/loop/objectives/:objectiveId`
 *
 * The Autopilot page is the roster; this is the object. Identity writes in
 * place, policy goes through propose → approve so the ledger keeps the
 * reason, and nothing here places anything — D10 BLOCKED.
 *
 * ## What the walk moved
 *
 * The page was built from this design and never checked against it. Four of
 * its sections were missing and each was missing something real:
 *
 * - **Leash standing.** The four conditions had two homes — the Inbox's aside
 *   and the Console's panel — and not the page where a floor is set. A leash
 *   reads *this* objective's record against *this* objective's floor, and
 *   neither of the other two can show that.
 * - **A pending patch.** 20+ `policy_suggestion` drafts sit against this
 *   objective and the page said nothing; the Policy table invited a change
 *   while a queue of them waited.
 * - **The five KPIs.** The standing strip answered four different questions —
 *   last *memo* rather than last *run*, cost over 30 days rather than today,
 *   and no next run at all, which is the one fact a scheduled machine owes.
 * - **Delete**, which the API refuses once runs exist. Drawn disabled with
 *   that reason, because the absence of the control and the reason for it are
 *   two different things to learn.
 *
 * ## Owed, and why — measured, not assumed
 *
 * **Pause / Resume** has no store: `OBJECTIVE_STATUSES` is `['active',
 * 'archived']` and the backend answers 422 to anything else. The design's
 * five states (draft · probation · standing · paused · archived) are its
 * registry's, not this schema's, and pausing by archiving would lose the
 * distinction the design draws between them — reversible versus retirement.
 *
 * **Fork** has neither an endpoint that copies an objective nor a column that
 * records a parent, so lineage cannot be written or read. Both are marked in
 * place rather than drawn dead.
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, ArchiveRestore, ArrowLeft, Play, ShieldAlert } from 'lucide-react'
import { PageHeader, PageShell, PinButton } from '@/components/layout'
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
import {
  batchRunObjective,
  type AutopilotObjective,
  type BatchRunOverrides,
  type ObjectivePatchBody,
  type ResearchObjective,
} from '@/api/research/harness'
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
import { MODE_TAG, MODE_WHO, OBJECTIVE_MODES, PERSONAS, SCHEDULES, isObjectiveMode } from '@/lib/harness/objectivePolicy'
import { ObjectivePolicyEditor } from '@/pages/research/loop/ObjectivePolicyEditor'
import { ObjectiveLap } from '@/pages/research/loop/ObjectiveLap'
import { ObjectiveRunsSection } from '@/pages/research/loop/ObjectiveRunsSection'
import { ObjectiveLeashCard } from '@/pages/research/loop/ObjectiveLeashCard'
import { pendingPolicyPatches } from '@/pages/research/loop/objectivePatch'
import { useResearchDrafts } from '@/hooks/useResearchDrafts'
import { nextRun } from '@/lib/harness/objectiveSchedule'

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
          <div className="flex flex-wrap items-center gap-2">
            {/* The page's own constraint, where the design puts it: this
                objective opens hypotheses and never orders. */}
            <span
              className="inline-flex h-[22px] items-center gap-1 rounded-md border border-warning/45 bg-warning/10 px-2 font-mono text-dense-caption font-bold text-warning"
              title="D10 BLOCKED — advisory only. This objective opens hypotheses, never orders."
            >
              <ShieldAlert className="size-3" /> D10 BLOCKED
            </span>
            {/* The shelf's entry point (design 2026-09-20.2): going straight
                to the same machine every day is a shortcut, and a shortcut is
                something you put there — not a shape the tree claims to have. */}
            <PinButton to={`/research/loop/objectives/${obj.id}`} label={obj.title} />
            {/* The design links this objective's patches and runs as Journal
                nodes. The Journal answers `?sel=<node id>` and an objective is
                not one of its five stores, so this opens the Journal rather
                than carrying a parameter it would drop. */}
            <Link
              to="/research/journal"
              className="text-dense-caption text-primary hover:underline"
              title="The Journal has no node for an objective on this side — it opens on the day, not on this machine."
            >
              Journal →
            </Link>
            {/* Two of the design's header actions have no store, and say so
                rather than being drawn dead. */}
            <span
              className="rounded border border-dashed border-border px-2 py-0.5 text-dense-caption text-muted-foreground/70"
              title="Pause is the reversible retirement in the design. This schema has two statuses — active and archived — and the backend answers 422 to anything else, so pausing would have to mean archiving, which is the other thing."
            >
              ⏸ pause · no status for it
            </span>
            <span
              className="rounded border border-dashed border-border px-2 py-0.5 text-dense-caption text-muted-foreground/70"
              title="Fork copies an objective into a draft and records the lineage. No endpoint copies one and no column records a parent, so neither half can be written or read."
            >
              ⑂ fork · no lineage stored
            </span>
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
        {/* Who works it — the word the top-bar Objective control wears (Rev .55). */}
        {isObjectiveMode(obj.mode) ? (
          <DenseTag variant={MODE_TAG[obj.mode]} size="cell" title={MODE_WHO[obj.mode]}>
            {obj.mode}
            {obj.subject ? ` · ${obj.subject}` : ''}
          </DenseTag>
        ) : null}
        <span className="text-muted-foreground">{brief?.hunts || obj.description}</span>
        {batchMut.isError ? (
          <span className="text-destructive">{batchMut.error instanceof Error ? batchMut.error.message : String(batchMut.error)}</span>
        ) : null}
      </p>

      <Standing
        obj={obj}
        brief={brief}
        archived={archived}
        onOpenMemo={(runId) => navigate(loopPipelinePath(runId, { live: false }))}
      />

      <PatchPending objectiveId={obj.id} />

      {/* Under the standing, as the design places it: the row above says how
          this machine is doing, this one says where its work is. */}
      <ObjectiveLap objectiveId={obj.id} brief={brief} />

      {/* Identity and the leash side by side, as the design pairs them: what
          this objective *is*, and what it is allowed to do on its own. */}
      <section className="grid gap-4 lg:grid-cols-2">
        <IdentityCard
          obj={obj}
          saving={patchMut.isPending}
          error={patchMut.isError ? String(patchMut.error) : null}
          onSave={(body) => patchMut.mutate({ objectiveId: obj.id, body })}
        />
        <ObjectiveLeashCard objectiveId={obj.id} />
      </section>

      <section>
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
        <h2 className="mb-2 text-dense-body font-semibold">Runs</h2>
        {/* The raw count belongs beside the folded one or not at all: 27 runs
            and 12 rows are both true and mean different things, and printed
            next to each other without that sentence they read as a
            contradiction. */}
        <ObjectiveRunsSection
          objectiveId={obj.id}
          objectiveTitle={obj.title}
          rawRuns={brief?.runs ?? null}
        />
      </section>

      {/* The design draws Delete disabled with its reason. The API refuses one
          once runs exist — taking them would take the funnels and the
          candidate lineage with them — so the control and the reason arrive
          together rather than the control simply being absent. */}
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-dense-caption leading-relaxed text-muted-foreground">
        <span
          className="cursor-not-allowed text-muted-foreground/60"
          title="The API refuses a delete once runs exist — taking them would take the funnels and the candidate lineage with them. Delete is only for an objective that never ran."
        >
          Delete — {brief ? `${brief.runs} run${brief.runs === 1 ? '' : 's'} recorded` : 'runs recorded'}
        </span>
        <span>
          Archive is the retirement path. An archived objective leaves the Console roster; its runs,
          funnels and the candidates that reference them stay, and it can be restored.
        </span>
      </p>

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

/**
 * The design's five KPIs, and why they are these five.
 *
 * The strip this replaces answered four different questions: the *last memo*
 * rather than the last run, the cost over *30 days* rather than today, and no
 * next run at all — which is the one fact a machine that runs on a schedule
 * owes the page about itself. The memo is not lost: it leads the row, because
 * the most recent thing this objective said is worth more than the tile it
 * would otherwise sit in.
 */
function Standing({
  obj,
  brief,
  archived,
  onOpenMemo,
}: {
  obj: ResearchObjective
  brief: AutopilotObjective | null
  archived: boolean
  onOpenMemo: (runId: string) => void
}) {
  // One clock, read once on mount rather than during render — the same
  // pattern the Book and the Watchlist use, for the same reason.
  const [now] = useState(() => Date.now())
  const next = nextRun(obj.schedule, obj.status, now)
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
    <div className="grid gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3 md:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
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
      <Fact label="Next run" tip="This objective's own cadence. Run now does not move it.">
        <span className="font-mono text-lg font-semibold tabular-nums">{next.at}</span>
        <span className="text-dense-label text-muted-foreground"> {next.sub}</span>
      </Fact>
      <Fact label="Track record" tip="Settled outcomes of what this objective proposed — the reading the leash floor is compared against.">
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
      {/* The design reads spend *today*; this store keeps a 30-day sum and no
          per-day one, so the tile says which window it is rather than
          printing a month under a word that means a day. */}
      <Fact label="Spend · 30 days" tip="Judge models. Re-runs fold into one row but not out of the bill. The design reads this for today; the store keeps a 30-day sum.">
        <span className="font-mono text-lg font-semibold tabular-nums">{fmtUsd(brief.spend_30d_usd)}</span>
      </Fact>
      <Fact label="Awaiting you" tip="Rated memos from this objective with no decision yet. The Decision Inbox reads the same queue.">
        <span className="font-mono text-lg font-semibold tabular-nums text-warning">{brief.pending_memos}</span>
        <span className="text-dense-label text-muted-foreground"> {brief.pending_memos === 1 ? 'memo' : 'memos'}</span>
      </Fact>
    </div>
  )
}

/**
 * A policy change is waiting on this objective — the design's amber banner.
 *
 * It leads with the newest, because a queue of twenty arguments about the
 * same knob is still one decision, and says how many are behind it: "a patch
 * is waiting" and "twenty are" are different facts about the same machine.
 */
function PatchPending({ objectiveId }: { objectiveId: string }) {
  const drafts = useResearchDrafts({ kind: 'policy_suggestion', status: 'pending', limit: 200 })
  const patches = pendingPolicyPatches(drafts.data?.rows ?? [], objectiveId)
  if (patches.length === 0) return null
  const [first] = patches

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-warning/45 bg-warning/[0.06] px-3 py-2">
      <DenseTag variant="warning" size="cell">
        PATCH PENDING
      </DenseTag>
      <span className="font-mono text-dense-meta text-foreground/85">
        {first.lines.length > 0 ? first.lines[0] : 'no field changes in the suggestion'}
        {first.lines.length > 1 ? ` · +${first.lines.length - 1} more field${first.lines.length > 2 ? 's' : ''}` : ''}
      </span>
      {first.why ? (
        <span className="min-w-0 flex-1 truncate text-dense-meta text-muted-foreground" title={first.why}>
          {first.why}
        </span>
      ) : null}
      {patches.length > 1 ? (
        <span className="text-dense-caption text-muted-foreground">
          {patches.length} waiting on this objective
        </span>
      ) : null}
      <Link to="/research/loop/decisions" className="ml-auto text-dense-meta text-primary hover:underline">
        Decision Inbox →
      </Link>
    </div>
  )
}

function Fact({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0" title={tip}>
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
  onSave: (body: ObjectivePatchBody) => void
}) {
  const storedMode = isObjectiveMode(obj.mode) ? obj.mode : 'assisted'
  const storedSubject = obj.subject ?? ''
  const [title, setTitle] = useState(obj.title)
  const [description, setDescription] = useState(obj.description)
  const [schedule, setSchedule] = useState(obj.schedule)
  const [persona, setPersona] = useState(obj.persona)
  const [mode, setMode] = useState(storedMode)
  const [subject, setSubject] = useState(storedSubject)
  const subjectNext = subject.trim().toUpperCase()
  const dirty =
    title.trim() !== obj.title ||
    description.trim() !== obj.description ||
    schedule !== obj.schedule ||
    persona !== obj.persona ||
    mode !== storedMode ||
    subjectNext !== storedSubject
  const reset = () => {
    setTitle(obj.title)
    setDescription(obj.description)
    setSchedule(obj.schedule)
    setPersona(obj.persona)
    setMode(storedMode)
    setSubject(storedSubject)
  }

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
      {/* Rev .55: who works it, and — for a hand objective — on what. The
          subject is what the top bar loads into the carried symbol. */}
      <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
        <label className="block">
          <span className="text-dense-meta uppercase tracking-wide text-muted-foreground">Mode</span>
          <Select value={mode} onValueChange={(v) => isObjectiveMode(v) && setMode(v)}>
            <SelectTrigger className="mt-1 h-7 text-dense-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OBJECTIVE_MODES.map((m) => (
                <SelectItem key={m} value={m} className="text-dense-body">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-dense-label text-muted-foreground">{MODE_WHO[mode]}</span>
        </label>
        <label className="block">
          <span className="text-dense-meta uppercase tracking-wide text-muted-foreground">Subject</span>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={mode === 'hand' ? 'Symbol' : 'none'}
            maxLength={16}
            className="mt-1 h-7 font-mono text-dense-body uppercase"
            title="The symbol a hand objective carries from page to page. Leave empty to clear it."
          />
        </label>
      </div>
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
              ...(mode !== storedMode ? { mode } : {}),
              // The store clears the subject on an empty string.
              ...(subjectNext !== storedSubject ? { subject: subjectNext } : {}),
            })
          }
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {dirty ? (
          <Button type="button" size="sm" variant="ghost" className="h-7" onClick={reset}>
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
