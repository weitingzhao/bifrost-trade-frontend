/**
 * The Research layer page — `/research/overview`, walked against
 * `Research Overview.dc.html` (Rev 2026-09-22.2).
 *
 * **Two faces since §5a.9.** The Pipeline fold merged into this layer, and it
 * could because the design's FILES table always mapped `/research/overview`
 * and `/research/workbench` to one prototype: the census was a face of this
 * page, not a page of its own. The menu row went; the reading did not. `The
 * loop` is what this layer *is*, `Pipeline census` is what its stations
 * *produced*, and the second route still lands straight on the second face.
 *
 * A face is not a place (§12.2), so this is a segment control and not a tab
 * row in the tree — and the route drives it rather than a `?face=` param,
 * because `/research/workbench` is the deep link the design keeps.
 *
 * The design rewrote this page from a seat chooser into the module's own
 * standing: one dial, three operators, six stations, one book. The seat
 * cards went with the seat selector (the rail follows the route since
 * 2026-09-14, so a chooser chose nothing). What the stores cannot say yet
 * stays grey and says why — see `OverviewPanels`.
 */
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
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
import { PipelineCensusFace } from '@/pages/research/seats/PipelineCensusFace'
import { SegmentControl } from '@/components/data-display'
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
import { LoopCircuit, type MachineChip } from './LoopCircuit'
import {
  candidatesBook,
  DIAL_LEVELS,
  loopCards,
  dialLevelFromTrust,
  earnRow,
  hypothesesBook,
  isToday,
  watchlistBook,
} from './overviewModel'

/**
 * The two routes of one page.
 *
 * `/research/workbench` is the menu-less alias the design keeps for the census
 * face — it lights the Research layer row, not a row of its own.
 */
const OVERVIEW_PATH = '/research/overview'
const CENSUS_PATH = '/research/workbench'

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
  // The design's timestamps: `13:30Z`, and the header's `2026-09-18 · 13:42Z`.
  const zTime = (iso: string | null | undefined) => (iso ? `${iso.slice(11, 16)}Z` : '')
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
    // The design leads with the memo's own headline; the standing carries the
    // last memo per objective, so when it is this run's, the row speaks it.
    const memo = (standingQ.data?.objectives ?? [])
      .map((o) => o.last_memo)
      .find((m) => m != null && m.run_id === latestRun.id)
    const waiting = /await|pending/i.test(latestRun.status)
    const funnel = memo
      ? `${(memo.considered ?? reach?.considered)?.toLocaleString('en-US') ?? '—'} → ${reach?.proposed ?? '—'} → ${memo.actionable} actionable · ${memo.split} split · ${memo.blocked} blocked.`
      : reach
        ? `${reach.considered.toLocaleString('en-US')} → ${reach.proposed} proposed this run.`
        : 'No funnel recorded for this run.'
    today.push({
      op: 'loop',
      title: memo ? `memo · ${memo.headline}` : `${objTitle} · ${latestRun.status.replace(/_/g, ' ')}`,
      titleTip: `${objTitle} · ${latestRun.id}`,
      when: zTime(latestRun.started_at),
      sub: waiting ? `${funnel} Awaiting your call in the Inbox.` : funnel,
      tone: waiting ? 'wait' : 'quiet',
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
      tone: 'wait',
      actions: [{ label: 'Decision Inbox →', to: '/research/loop/decisions' }],
    })
  }
  // A hand verdict is its own row form (the design's «You · verdict on …»);
  // everything else stays a hypothesis row, its run id trimmed to the hover.
  const verdictsToday = hypsToday.filter((h) => h.tags?.includes('hand-verdict'))
  const plainHypsToday = hypsToday.filter((h) => !h.tags?.includes('hand-verdict'))
  for (const h of verdictsToday.slice(0, 2)) {
    const ref = (h.origin_ref ?? {}) as { stance?: string; cites?: string[] }
    const sym = h.symbols?.[0]
    today.push({
      op: 'hand',
      title: `You · verdict${sym ? ` on ${sym}` : ''}${ref.stance ? ` · ${ref.stance}` : ''}${ref.cites?.length ? ` · cites ${ref.cites.join(', ')}` : ''}`,
      when: zTime(h.created_at),
      sub: `“${h.thesis}” Open, settles in 20d into the same record as the judges.`,
      tone: 'quiet',
      actions: sym ? [{ label: 'Symbol →', to: withSymbolParam(SYMBOL_PATH, sym) }] : [],
    })
  }
  for (const h of plainHypsToday.slice(0, 2)) {
    const op = operatorOf(h.origin_page)
    const title = h.title.replace(/\s*\(run_[a-z0-9]+\)\s*$/i, '')
    today.push({
      op,
      title: `${op === 'hand' ? 'You' : op === 'loop' ? 'The loop' : 'The Copilot'} · hypothesis · ${title}`,
      titleTip: title === h.title ? undefined : h.title,
      when: zTime(h.created_at),
      sub: h.origin_page ? `Born on ${h.origin_page}. Settles by the outcome rule at its horizon.` : 'Settles by the outcome rule at its horizon.',
      tone: op === 'copilot' ? 'new' : 'quiet',
      actions: [{ label: 'Hypothesis Board →', to: '/research/loop/hypotheses' }],
    })
  }
  const brief = copilotQ.data?.brief
  if (brief && isToday(brief.created_at, nowIso)) {
    today.push({
      op: 'copilot',
      title: `Daily Brief · ${brief.headline}`,
      when: zTime(brief.created_at),
      sub: 'The morning agent’s brief for today.',
      tone: 'new',
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

  // ── The machines ───────────────────────────────────────────────────────
  // The band inside the circuit: the objectives running laps on it. The
  // design draws five states; this store keeps two (`active` / `archived`,
  // `OBJECTIVE_STATUSES`), so the chip prints the one the row actually
  // carries rather than a state the server cannot mean.
  const machines: MachineChip[] = (objectivesQ.data?.items ?? []).map((o) => ({
    id: o.id,
    name: o.title,
    state: o.status,
    meta: o.schedule,
    tip: `${o.persona || 'objective'} · ${o.schedule}`,
    tone: o.status === 'active' ? 'bg-success' : 'bg-muted-foreground/50',
  }))

  const { pathname } = useLocation()
  const navigate = useNavigate()
  const face = pathname === CENSUS_PATH ? 'census' : 'loop'

  return (
    <PageShell padding="default" className="min-w-0 space-y-3">
      <PageHeader
        title="Research"
        description={DESCRIPTION}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* The design's two-segment switch. The face is the route, so it
                is bookmarkable, it is what the sidebar's alias lights, and a
                link written to the census still lands on the census. */}
            <SegmentControl
              size="xs"
              ariaLabel="Research face"
              value={face}
              onChange={(v) => navigate(v === 'census' ? CENSUS_PATH : OVERVIEW_PATH)}
              options={[
                { value: 'loop', label: 'The loop', title: 'What this layer is: the circuit, the dial, today.' },
                { value: 'census', label: 'Pipeline census', title: 'What its stations produced — every store on one scale.' },
              ]}
            />
            <Link
              to="/docs/research-blueprint"
              className="inline-flex items-center gap-1.5 border px-2.5 py-1 text-dense-meta text-muted-foreground hover:text-foreground mat-btn"
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

      {face === 'census' ? <PipelineCensusFace /> : null}

      {face === 'loop' ? <LoopFace
        stations={stations}
        machines={machines}
        dialCells={dialCells}
        dialCurrent={current}
        earn={earn}
        today={today}
        nowIso={nowIso}
        health={health}
        stationsFootnote={stationsFootnote}
        bookRows={bookRows}
        cards={cards}
      /> : null}
    </PageShell>
  )
}

/** The layer's own face: what it is, rather than what it produced. */
function LoopFace(props: {
  stations: StationRow[]
  machines: React.ComponentProps<typeof LoopCircuit>['machines']
  dialCells: DialCell[]
  dialCurrent: string
  earn: React.ComponentProps<typeof DialStrip>['earn']
  today: TodayItem[]
  nowIso: string
  health: HealthCell[]
  stationsFootnote: string
  bookRows: React.ComponentProps<typeof BookPanel>['rows']
  cards: OpCardData[]
}) {
  const {
    stations, machines, dialCells, dialCurrent, earn, today, nowIso, health, stationsFootnote, bookRows, cards,
  } = props
  return (
    <>
      {/* The design's order, and the order is the argument: the loop first —
          what this layer is — then how much of it passes without you, then
          what came out today and whether the engines behind it are up. */}
      <LoopCircuit cards={loopCards(stations)} machines={machines} />
      <DialStrip cells={dialCells} earn={earn} current={dialCurrent} />

      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
        <TodayFeed items={today} asOf={`${nowIso.slice(0, 10)} · ${nowIso.slice(11, 16)}Z`} />
        <HealthPanel cells={health} />
      </div>

      {/* ── Beyond Rev 2026-09-20.23, kept until the Owner rules ───────────
          The prototype's Overview has four sections and these are not among
          them. None is dropped here: «设计里没有 ≠ 该删». Where each looks to
          have gone, for that ruling:
            · Operator cards → the stations now carry `h · l · c` themselves,
              and the machines band carries the loop's standing. What has no
              home in the new shape is the Copilot's own row.
            · The Book → `/research/book` is its own page, and aligned.
            · The circuit strip → is the loop learning; the prototype has
              never had a panel for it, on this page or another. */}
      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
        <StationsTable rows={stations} footnote={stationsFootnote} />
        <BookPanel rows={bookRows} />
      </div>
      <OperatorCards cards={cards} />
      <LoopOverviewStrip />
    </>
  )
}
