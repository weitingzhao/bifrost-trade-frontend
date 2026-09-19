/**
 * Research overview — `/research/overview`, walked against
 * `Research Overview.dc.html` (Rev 2026-09-18.2).
 *
 * The design rewrote this page from a seat chooser into the module's own
 * standing: one dial, three operators, six stations, one book. The seat
 * cards went with the seat selector (the rail follows the route since
 * 2026-09-14, so a chooser chose nothing). What the stores cannot say yet
 * stays grey and says why — see `OverviewPanels`.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Inbox } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { fetchObjectiveRuns } from '@/api/research/harness'
import { fetchOrchestrationStatus } from '@/api/research/orchestration'
import { useCandidates } from '@/hooks/useCandidates'
import { useCopilotStanding } from '@/hooks/useCopilotStanding'
import { useHypothesisList } from '@/hooks/useHypotheses'
import { useActiveObjectives, useAutopilotStanding, useLoopTrust } from '@/hooks/useLoopHarness'
import { useResearchDrafts } from '@/hooks/useResearchDrafts'
import { useWatchlist } from '@/hooks/useWatchlist'
import { fmtIsoTs } from '@/lib/format'
import { funnelReach, parseHarnessTrace } from '@/lib/harness/harnessTrace'
import { loopPipelinePath } from '@/lib/harness/loopCopilotPrefill'
import { operatorOf, sourceOperatorOf } from '@/lib/research/operatorOf'
import { objectiveLeash } from '@/pages/research/loop/leash'
import { LoopOverviewStrip } from '@/pages/research/home/LoopOverviewStrip'
import {
  BookPanel,
  DialStrip,
  HealthPanel,
  OperatorCards,
  StationsTable,
  TodayFeed,
  type DialCell,
  type HealthCell,
  type OpCardData,
  type StationRow,
  type TodayItem,
} from './OverviewPanels'
import {
  candidatesBook,
  DIAL_LEVELS,
  dialLevelFromTrust,
  earnRow,
  hypothesesBook,
  isToday,
  watchlistBook,
} from './overviewModel'

const DESCRIPTION =
  'One pipeline — scan · nominate · judge · decide · settle · feed back — driven by three operators ' +
  'who write the same artifacts: your hand, the loop, the Copilot. How much passes without you is ' +
  'one dial. Advisory only, D10 BLOCKED at every level.'

/** `research_stock_signal_schedule` reads as machine ID; the panel wants the engine's name. */
function scheduleName(name: string): string {
  return name
    .replace(/^(research|bifrost)[_-]/, '')
    .replace(/[_-](schedule|job)$/, '')
    .replace(/[_-]+/g, ' ')
}

function nextRunText(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const hours = Math.round((d.getTime() - Date.now()) / 3_600_000)
  const when = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
  return hours > 0 && hours < 48 ? `${when}Z · in ${hours}h` : `${when}Z`
}

export default function ResearchOverviewPage() {
  const trustQ = useLoopTrust()
  const standingQ = useAutopilotStanding()
  const objectivesQ = useActiveObjectives()
  const copilotQ = useCopilotStanding()
  const patchesQ = useResearchDrafts({ kind: 'policy_suggestion' })
  const hypsQ = useHypothesisList({ include_retired: true, limit: 100 })
  const candsQ = useCandidates({ status: 'open' })
  const watchQ = useWatchlist()
  const runsQ = useQuery({
    queryKey: ['research', 'objective-runs', 'overview'],
    queryFn: () => fetchObjectiveRuns({ limit: 10 }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
  const orchQ = useQuery({
    queryKey: ['research', 'orchestration', 'overview'],
    queryFn: fetchOrchestrationStatus,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const nowIso = new Date().toISOString()
  const trustL0 = Boolean(trustQ.data?.matrix_l0 ?? trustQ.data?.l0)
  const current = dialLevelFromTrust(trustQ.isSuccess ? trustL0 : undefined)
  const leashRows = objectiveLeash(objectivesQ.data?.items ?? [], standingQ.data?.objectives ?? [])
  const earn = earnRow(leashRows)

  // The dial is a display this round: there is no stored level to set, so the
  // strip reads the level off the trust grant and says so. The control — with
  // its gate — arrives with the autonomy store (plan W4).
  const dialCells: DialCell[] = DIAL_LEVELS.map((d) => {
    if (d.level === current) {
      return { ...d, state: 'current', tone: 'current', tip: 'The level the runtime is at, read from the Trust grant — the leash accepts research drafts only while Trust grants L0.' }
    }
    if (d.level === 'L0' || d.level === 'L1') {
      return { ...d, state: 'follows Trust', tone: 'quiet', tip: 'L0 and L1 follow the Trust grant today. A stored dial — set here, read by the Console and the Inbox — lands with its store (W4).' }
    }
    if (d.level === 'L2') {
      const cleared = earn != null && earn.settled >= earn.need && earn.hit != null && earn.hit >= earn.floor
      return {
        ...d,
        state: cleared ? 'record clears · no control yet' : 'not yet earned',
        tone: 'warn',
        tip: 'Earned by record, never set: a settled hit rate over the floor on enough outcomes under L1. No mechanism grants it yet — the gate arrives with the dial store (W4).',
      }
    }
    return { ...d, state: 'locked', tone: 'quiet', tip: 'L3 stays locked until L2-era patches are themselves settled and verified. Orders never pass at any level (D10).' }
  })

  // ── Operator cards ─────────────────────────────────────────────────────
  const pendingPatches = patchesQ.data?.rows.length ?? 0
  const cards: OpCardData[] = [
    {
      op: 'hand',
      label: 'Workbench',
      role: 'you at the stations',
      home: { label: 'Pipeline →', to: '/research/workbench' },
      cells: [
        { k: 'verdicts today', v: '—', tone: 'muted', tip: 'Hand verdicts — the same artifact a judge writes. No verdict store exists yet; it lands in W2 and your calls start counting then.' },
        { k: 'record · 20d', v: '—', tone: 'muted', tip: 'Your settled hit rate, scored by the same rule as the judges. Starts accruing when the verdict store lands (W2).' },
        { k: 'screens', v: '—', tone: 'muted', tip: 'Screener artifacts with a version chain — every criteria change a Fork. The lineage lands with the Screener rebuild (W3).' },
      ],
      note: 'Your judgments will enter the same record as the judges’. Where you and the loop disagree is the most useful row on the Personas page.',
    },
    {
      op: 'loop',
      label: 'Autopilot',
      role: 'runs unattended',
      home: { label: 'Console →', to: '/research/loop/harness' },
      cells: [
        {
          k: 'next run',
          v: nextRunText(standingQ.data?.next_run_at),
          sub: `${objectivesQ.data?.items.length ?? 0} objective${(objectivesQ.data?.items.length ?? 0) === 1 ? '' : 's'}`,
          tip: 'The nearest scheduled objective.',
        },
        {
          k: 'awaiting you',
          v: String(standingQ.data?.pending_memos ?? '—'),
          sub: 'calls · Inbox reads the same queue',
          tone: (standingQ.data?.pending_memos ?? 0) > 0 ? 'warn' : 'default',
          tip: 'Rated memos with no decision yet.',
        },
        {
          k: 'trust',
          v: standingQ.data?.trust.matrix_level ?? (trustL0 ? 'L0' : '—'),
          sub: trustL0 ? 'leash may accept' : 'nothing auto-approved',
          tone: trustL0 ? 'good' : 'warn',
          tip: 'The cluster matrix grant. The design shows what the leash accepted on its own today; that count is not exposed yet, so the grant that governs it stands here.',
        },
      ],
      note: trustL0
        ? 'Trust L0 · the leash may accept research drafts on its own. Policy patches it proposes from settled runs wait in the Inbox.'
        : 'Trust below L0 — the loop still runs, judges and rates; every draft waits for you.',
    },
    {
      op: 'copilot',
      label: 'Copilot',
      role: 'on request · ⌘J',
      home: { label: 'Daily Brief →', to: '/research/daily-brief' },
      cells: [
        {
          k: 'threads',
          v: String(copilotQ.data?.sessions.today ?? '—'),
          sub: 'today',
          tip: 'Conversations today. Anchoring them to artifacts lands with the dock rebuild (W3).',
        },
        { k: 'forks', v: '—', tone: 'muted', tip: 'What-if branches opened from threads. No branch store exists yet — Fork lands with the verbs (W3).' },
        {
          k: 'distilled',
          v: String(pendingPatches),
          sub: '→ policy · in Inbox',
          tone: pendingPatches > 0 ? 'warn' : 'muted',
          tip: 'Policy suggestions pending in the Inbox — the only write path chat has.',
        },
      ],
      note: 'Every write it proposes goes through the Inbox. Citing artifacts sentence by sentence arrives with the anchored dock (W3).',
    },
  ]

  // ── Six stations, today ────────────────────────────────────────────────
  const runsToday = (runsQ.data?.items ?? []).filter((r) => isToday(r.started_at, nowIso))
  const candsToday = (candsQ.data?.items ?? []).filter((r) => isToday(r.trade_date, nowIso))
  const candOps = { hand: 0, loop: 0, copilot: 0 }
  for (const r of candsToday) candOps[sourceOperatorOf(r.source)] += 1
  const hypsToday = (hypsQ.data?.rows ?? []).filter((h) => isToday(h.created_at, nowIso))
  const hypOps = { hand: 0, loop: 0, copilot: 0 }
  for (const h of hypsToday) hypOps[operatorOf(h.origin_page)] += 1
  const dash = (n: number) => (n > 0 ? String(n) : '—')
  const stations: StationRow[] = [
    {
      name: 'Scan', produces: 'screen',
      h: '—', hTip: 'Hand screens get a version chain in W3; nothing counts them yet.',
      l: dash(runsToday.length), lTip: 'Loop runs started today — each opens with a scan of its universe.',
      c: '—', cTip: 'Copilot what-if screens land with Fork (W3).',
    },
    {
      name: 'Nominate', produces: 'nomination',
      h: dash(candOps.hand), hTip: 'Candidates you added today (source YOU / a screen).',
      l: dash(candOps.loop), lTip: 'Candidates the curator proposed today.',
      c: dash(candOps.copilot), cTip: 'Candidates from chat writes today.',
    },
    {
      name: 'Judge', produces: 'verdict · memo',
      h: '—', hTip: 'Hand verdicts land with the verdict store (W2).',
      l: '—', lTip: 'Judge verdicts are not persisted yet — they live inside run traces until the verdict store lands (W2).',
      c: '—', cTip: 'Challenge verdicts land with the verbs (W3).',
    },
    {
      name: 'Decide', produces: 'decision → hypothesis',
      h: dash(hypOps.hand), hTip: 'Hypotheses you opened today.',
      l: dash(hypOps.loop), lTip: 'Hypotheses opened from loop batches today (leash or your approval).',
      c: dash(hypOps.copilot), cTip: 'Hypotheses distilled from chat today.',
    },
    {
      name: 'Settle', produces: 'settlement',
      h: '—', l: '—', c: '—',
      lTip: 'Settlements run server-side (outcome engine, EOD resolution); a per-day feed lands with the settle endpoint (W4).',
    },
    {
      name: 'Feed back', produces: 'patch',
      h: '—',
      l: dash(pendingPatches), lTip: 'Policy suggestions pending in the Inbox. Which operator drafted each lands with provenance (W2).',
      c: '—',
    },
  ]
  const stationsFootnote =
    'A dash is a station nothing counted today — in the hand and Copilot columns mostly because the ' +
    'store that would count it is not built yet (verdicts W2 · screens and forks W3 · settlements W4). ' +
    'Feed back counts patches waiting in the Inbox.'

  // ── The Book ───────────────────────────────────────────────────────────
  const bookRows = [
    { label: 'Hypotheses', to: '/research/loop/hypotheses', ...hypothesesBook(hypsQ.data?.rows ?? []) },
    { label: 'Candidates', to: '/research/loop/candidates', ...candidatesBook(candsQ.data?.items ?? [], nowIso) },
    { label: 'Watchlist', to: '/research/watchlist', ...watchlistBook(watchQ.data?.items.length ?? 0) },
  ]

  // ── Today feed ─────────────────────────────────────────────────────────
  const today: TodayItem[] = []
  const latestRun = runsToday[0]
  if (latestRun) {
    const objTitle = objectivesQ.data?.items.find((o) => o.id === latestRun.objective_id)?.title ?? latestRun.objective_id
    const reach = funnelReach(parseHarnessTrace(latestRun.trace_json))
    today.push({
      op: 'loop',
      title: `${objTitle} · ${latestRun.status.replace(/_/g, ' ')}`,
      when: latestRun.started_at ? fmtIsoTs(latestRun.started_at) : '',
      sub: reach ? `${reach.considered.toLocaleString('en-US')} → ${reach.proposed} proposed this run.` : 'No funnel recorded for this run.',
      actions: [
        { label: 'Decision Inbox →', to: '/research/loop/decisions' },
        { label: 'Pipeline →', to: loopPipelinePath(latestRun.id) },
      ],
    })
  }
  if (pendingPatches > 0) {
    today.push({
      op: 'copilot',
      title: `policy suggestion${pendingPatches === 1 ? '' : 's'} · ${pendingPatches} awaiting you`,
      when: '',
      sub: 'Proposed changes to an objective policy. Nothing applies until you approve it in the Inbox.',
      actions: [{ label: 'Decision Inbox →', to: '/research/loop/decisions' }],
    })
  }
  for (const h of hypsToday.slice(0, 2)) {
    const op = operatorOf(h.origin_page)
    today.push({
      op,
      title: `${op === 'hand' ? 'You' : op === 'loop' ? 'The loop' : 'The Copilot'} · hypothesis · ${h.title}`,
      when: h.created_at ? fmtIsoTs(h.created_at) : '',
      sub: h.origin_page ? `Born on ${h.origin_page}. Settles by the outcome rule at its horizon.` : 'Settles by the outcome rule at its horizon.',
      actions: [{ label: 'Hypothesis Board →', to: '/research/loop/hypotheses' }],
    })
  }
  const brief = copilotQ.data?.brief
  if (brief && isToday(brief.created_at, nowIso)) {
    today.push({
      op: 'copilot',
      title: `Daily Brief · ${brief.headline}`,
      when: brief.created_at ? fmtIsoTs(brief.created_at) : '',
      sub: 'The morning agent’s brief for today.',
      actions: [{ label: 'Daily Brief →', to: '/research/daily-brief' }],
    })
  }

  // ── Health ─────────────────────────────────────────────────────────────
  const health: HealthCell[] = (orchQ.data?.schedules ?? []).slice(0, 4).map((s) => ({
    k: scheduleName(s.name),
    v: `${s.status.toLowerCase()}${s.last_run_status ? ` · last ${s.last_run_status.toLowerCase()}` : ''}`,
    lamp: s.status === 'RUNNING' ? (s.last_run_status === 'FAILURE' ? 'yellow' : 'green') : 'gray',
    tip: s.last_run_ended_at ? `Last run ended ${fmtIsoTs(s.last_run_ended_at)}` : 'Never ran.',
  }))

  const inboxN = standingQ.data?.pending_drafts ?? standingQ.data?.pending_memos ?? 0

  return (
    <PageShell padding="default" className="min-w-0 space-y-3">
      <PageHeader
        title="Research"
        description={DESCRIPTION}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/docs/research-blueprint"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1 text-dense-meta text-muted-foreground hover:border-primary/40 hover:text-foreground"
              title="What Research should be — the target the code is calibrated against. The design's own strategic text (Research Vision) ships in the design package."
            >
              <BookOpen className="size-3.5" aria-hidden />
              Blueprint
            </Link>
            <Link
              to="/research/loop/decisions"
              className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 px-2.5 py-1 text-dense-meta text-warning hover:bg-warning/10"
            >
              <Inbox className="size-3.5" aria-hidden />
              Inbox · {inboxN} waiting
            </Link>
          </div>
        }
      />

      <DialStrip cells={dialCells} earn={earn} />
      <OperatorCards cards={cards} />

      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
        <StationsTable rows={stations} footnote={stationsFootnote} />
        <BookPanel rows={bookRows} />
      </div>

      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
        <TodayFeed items={today} asOf={fmtIsoTs(nowIso)} />
        <HealthPanel cells={health} />
      </div>

      {/* Kept beyond the design: the circuit — is the loop learning — has no
          panel in the prototype, and losing it would lose the one view that
          catches a starving segment. Its destination is for the Owner to call. */}
      <LoopOverviewStrip />
    </PageShell>
  )
}
