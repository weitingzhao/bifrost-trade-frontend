/**
 * The loop (design Rev .100, Book, Vision §22.6). The sidebar's spine is
 * linear because it indexes places; the loop is movement, so it gets an
 * instrument: the Book lends beliefs to objectives, their runs settle and
 * the verdicts return; underneath, the day's traces distill into memory,
 * which shapes the personas and proposes the next objective. Every node is a
 * door; solid arcs exist here, dashed ones do not yet and say why.
 */
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionPanel } from '@/components/layout'
import { fetchObjectiveRuns } from '@/api/research/harness'
import { fetchJournalDay, fetchMemory } from '@/api/research/journal'
import type { Hypothesis } from '@/api/researchHypothesis'
import { useAutopilotStanding } from '@/hooks/useLoopHarness'
import { loopReading } from './bookLoopModel'
import { etTodayIso } from '@/lib/freshness'

const MUTE = 'var(--sk-mute, var(--muted-foreground))'
const BOOK = 'var(--equip-book)'
const OBJ = 'var(--sk-objective)'
const MEM = 'var(--color-unrealized)'

function Node({
  x,
  y,
  w,
  cap,
  value,
  ink,
  title,
  onClick,
}: {
  x: number
  y: number
  w: number
  cap: string
  value: string
  ink?: string
  title: string
  onClick: () => void
}) {
  return (
    <g
      role="link"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick()
      }}
      style={{ cursor: 'pointer' }}
    >
      <title>{title}</title>
      <rect
        x={x}
        y={y}
        width={w}
        height={44}
        rx={10}
        fill={ink ? `color-mix(in srgb, ${ink} 10%, transparent)` : 'color-mix(in srgb, var(--sk-ink) 5%, transparent)'}
        stroke={ink ? `color-mix(in srgb, ${ink} 45%, transparent)` : 'color-mix(in srgb, var(--sk-ink) 18%, transparent)'}
      />
      <text x={x + 12} y={y + 18} fontSize="10" fontWeight={600} letterSpacing=".08em" fill={ink ?? 'var(--sk-mute2)'}>
        {cap}
      </text>
      <text x={x + 12} y={y + 34} fontSize="12" fontWeight={700} fontFamily="var(--font-mono)" fill="var(--sk-ink)">
        {value}
      </text>
    </g>
  )
}

function Arc({ x1, x2, y, label, owed }: { x1: number; x2: number; y: number; label: string; owed?: string }) {
  return (
    <g>
      {owed ? <title>{owed}</title> : null}
      <line
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke={MUTE}
        strokeWidth={1.2}
        strokeDasharray={owed ? '4 3' : undefined}
        markerEnd="url(#bk-lp-a)"
      />
      <text x={(x1 + x2) / 2} y={y - 8} textAnchor="middle" fontSize="10" fill={MUTE}>
        {label}
      </text>
    </g>
  )
}

const n = (v: number | null) => (v == null ? '—' : String(v))

export function BookLoopInstrument({ hypotheses }: { hypotheses: readonly Hypothesis[] | null }) {
  const navigate = useNavigate()
  const today = etTodayIso()
  const standing = useAutopilotStanding()
  const runsQ = useQuery({
    queryKey: ['research-engine', 'objective-runs', 'book-loop'],
    queryFn: () => fetchObjectiveRuns({ limit: 100 }),
    staleTime: 60_000,
  })
  const dayQ = useQuery({ queryKey: ['research-engine', 'journal', 'day', today], queryFn: () => fetchJournalDay(today), staleTime: 60_000 })
  const memQ = useQuery({ queryKey: ['research-engine', 'journal', 'memory'], queryFn: fetchMemory, staleTime: 300_000 })
  const r = loopReading({
    hypotheses,
    objectives: standing.data?.objectives ?? null,
    runs: runsQ.data?.items ?? null,
    todayTraces: dayQ.data ? dayQ.data.traces.length : null,
    memory: memQ.data ?? null,
    today,
  })
  const go = (to: string) => () => navigate(to)

  return (
    <SectionPanel cap="The loop" title="two loops, one ledger" note="every arc lands somewhere — solid is built here, dashed is not yet (Vision §22.6)">
      <div className="overflow-x-auto px-2 pt-1.5 pb-2">
        <svg viewBox="0 0 940 208" className="block h-auto w-full min-w-[760px]" role="img" aria-label="The two loops: the Book lends beliefs to objectives, their runs settle and return verdicts; the day's traces distill into memory, which shapes the personas and proposes the next objective">
          <defs>
            <marker id="bk-lp-a" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0 L8 4 L0 8 z" fill={MUTE} />
            </marker>
            <marker id="bk-lp-am" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0 L8 4 L0 8 z" fill={MEM} />
            </marker>
          </defs>
          <path d="M 764 30 C 764 2, 84 2, 84 30" fill="none" stroke={MUTE} strokeWidth={1.2} markerEnd="url(#bk-lp-a)" />
          <text x="424" y="13" textAnchor="middle" fontSize="10" fill={MUTE}>
            verdicts return — strength · track record
          </text>
          <Arc x1={152} x2={230} y={52} label="borrow · not yet" owed={r.owed.borrow} />
          <Arc x1={388} x2={466} y={52} label="run" />
          <Arc x1={618} x2={696} y={52} label="settle" />
          <g>
            <line x1={310} y1={74} x2={310} y2={132} stroke={MUTE} strokeWidth={1.2} markerEnd="url(#bk-lp-a)" />
            <text x={318} y={106} fontSize="10" fill={MUTE}>
              traces
            </text>
          </g>
          <Arc x1={388} x2={466} y={156} label="distill · nightly" />
          <Arc x1={618} x2={696} y={156} label="shapes" />
          <g role="link" tabIndex={0} onClick={go('/research/loop/harness')} onKeyDown={(e) => { if (e.key === 'Enter') navigate('/research/loop/harness') }} style={{ cursor: 'pointer' }}>
            <title>Memory proposes the next objective — Proposed · from memory on the Pilot Console (§22.4). Opens the Console.</title>
            <path d="M 543 132 C 543 100, 384 104, 368 76" fill="none" stroke={MEM} strokeWidth={1.2} markerEnd="url(#bk-lp-am)" />
            <text x={482} y={96} fontSize="10" fill={MEM}>
              proposes · {n(r.proposes)}
            </text>
          </g>
          <line x1={832} y1={52} x2={846} y2={52} stroke={MUTE} strokeWidth={1.2} />
          <Node x={16} y={30} w={136} cap="THE BOOK" value={`${n(r.beliefs)} beliefs`} ink={BOOK} title="The Book — the inventory of belief: active hypotheses. Opens the Hypothesis board." onClick={go('/research/loop/hypotheses')} />
          <Node x={232} y={30} w={156} cap="OBJECTIVES" value={`${n(r.running)} running`} ink={OBJ} title="Objectives — units of will. Opens the Console roster." onClick={go('/research/loop/harness')} />
          <Node x={468} y={30} w={150} cap="SIX STATIONS" value={`${n(r.runsToday)} runs today`} title="The six stations — scan, nominate, judge, decide, settle, feed back. Opens the Console's runs." onClick={go('/research/loop/harness')} />
          <Node x={698} y={30} w={132} cap="SETTLED" value={r.settled ?? '—'} title="Settled — outcomes judged, right or wrong, across the objectives. Opens the Journal." onClick={go('/research/journal')} />
          <Node x={848} y={30} w={84} cap="THREAD" value="Discuss ⌗" title="Discuss in thread — every Decision Inbox card opens into a Copilot conversation anchored to it. Opens the Inbox." onClick={go('/research/loop/decisions')} />
          <Node x={232} y={134} w={156} cap="TRAIL" value={`${n(r.traces)} traces today`} title="The trail — notes, visits, fills, decisions, threads. Read by tonight's distill. Opens the Journal." onClick={go('/research/journal')} />
          <Node x={468} y={134} w={150} cap="MEMORY" value={r.memory ?? '—'} ink={MEM} title="Memory — what the distill has learned about how you trade. Opens the You page; Forget lives there." onClick={go('/research/agent-personas/you')} />
          <Node x={698} y={134} w={200} cap="SHAPES" value="Personas · Playbook" title="What memory shapes — persona weights, playbook rules, review criteria. Opens Personas." onClick={go('/research/agent-personas')} />
        </svg>
      </div>
    </SectionPanel>
  )
}
