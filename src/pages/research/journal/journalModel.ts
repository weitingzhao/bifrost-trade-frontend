/**
 * The Journal's derivation — `/research/journal`.
 *
 * The design's sentence: *"history — every artifact, whoever wrote it, with
 * its branches and what it settled to. Append-only; nothing here is deleted."*
 *
 * There is no artifact endpoint. The prototype's tree is not a store on this
 * side; it is a join, and this file is the join. Measured on DEV 2026-09-21,
 * every edge below resolves:
 *
 *   run        `/research/objective-runs`        29 rows
 *   candidate  `source_ref.run_id` → run         36 / 36
 *   hypothesis `candidate.hypothesis_id`          9 / 9
 *              `origin_ref.candidate_id` → cand   9 of 16 that carry one
 *              (the other 7 name candidates older than the window)
 *   draft      `payload.run_id` → run · `payload.hypothesis_id` → hypothesis
 *              · `scope` → hypothesis                188 of 200 pending
 *   settlement `/research/candidate-outcome/rows`  114 rows, joined by
 *              `candidate_id`
 *
 * What the store does not hold is listed on the page, not hidden: there are no
 * screen versions, no threads, no forks, and no per-lens attribution of an
 * outcome. Those are marked rather than drawn empty — a reading with no data
 * keeps its row and names the missing half.
 */
import type { ObjectiveRun } from '@/api/research/harness'
import type { ResearchCandidate } from '@/api/research/candidates'
import type { Hypothesis } from '@/api/researchHypothesis'
import type { AiDraft } from '@/api/researchDrafts'
import type { CandidateOutcomeRow } from '@/api/research/candidateOutcome'
import { numericOrNull } from '@/utils/finite'

/**
 * The artifact kinds this side can actually produce. The prototype draws
 * eight; these are the eight, minus `screen` and `read` — neither has a store
 * — plus `batch`, `note` and `intent`, which the Inbox writes and the
 * prototype folds into `memo`.
 */
export type JournalNodeType =
  | 'run'
  | 'candidate'
  | 'hypothesis'
  | 'verdict'
  | 'decision'
  | 'patch'
  | 'batch'
  | 'digest'
  | 'note'
  | 'intent'
  | 'settlement'

/**
 * Who wrote it, in the design's three-way split.
 *
 * `loop` is the unattended machine and `copilot` is the machine you asked —
 * the same split the Research menu already makes between *Autopilot ·
 * unattended* and *Copilot · on request*, so the Journal is not inventing an
 * axis. `hand` is the Owner.
 *
 * The mapping is a table rather than a guess, and the raw author string is
 * printed in the provenance panel beside it, so a writer this table has not
 * learned about is visible on the page before it is visible here.
 */
export type JournalOperator = 'hand' | 'loop' | 'copilot'

export interface JournalNode {
  id: string
  type: JournalNodeType
  operator: JournalOperator
  /** What the store itself calls the author. Shown, never interpreted away. */
  operatorRaw: string
  parentId: string | null
  /** Set by {@link buildJournalTrees}; 0 at a root. */
  depth: number
  title: string
  summary: string
  /** What this artifact changed, when the artifact is a change. */
  diff: string
  state: string
  /** ISO instant, or a date for a day-level artifact. */
  at: string
  /** `YYYY-MM-DD`, the day this artifact belongs to. */
  day: string
  provenance: ReadonlyArray<readonly [string, string]>
  /** The page that already shows this artifact, when one does. */
  to: string | null
  toLabel: string
}

const TYPE_LABEL: Record<JournalNodeType, string> = {
  run: 'run',
  candidate: 'candidate',
  hypothesis: 'hypothesis',
  verdict: 'verdict',
  decision: 'decision',
  patch: 'patch',
  batch: 'batch',
  digest: 'digest',
  note: 'note',
  intent: 'intent',
  settlement: 'settlement',
}

export function journalTypeLabel(t: JournalNodeType): string {
  return TYPE_LABEL[t]
}

/** The draft kinds the Journal knows how to type. */
const DRAFT_TYPE: Record<string, JournalNodeType> = {
  eod_verdict: 'verdict',
  decision_draft: 'decision',
  policy_suggestion: 'patch',
  candidate_batch: 'batch',
  daily_digest: 'digest',
  morning_brief: 'digest',
  playbook_note: 'note',
  playbook_rule: 'note',
  order_intent: 'intent',
  hypothesis_draft: 'hypothesis',
  hypothesis_suggestion: 'hypothesis',
}

/**
 * Pages that write a hypothesis when *you* click promote. `copilot-loop` and
 * `candidate_batch_approve` are the machine's own two, and everything else
 * `origin_page` carries is a page of this app — which means a person stood
 * in front of it.
 */
const MACHINE_ORIGIN: Record<string, JournalOperator> = {
  'copilot-loop': 'copilot',
  candidate_batch_approve: 'loop',
  harness: 'loop',
}

function dayOf(iso: string | null | undefined): string {
  return typeof iso === 'string' && iso.length >= 10 ? iso.slice(0, 10) : ''
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null
}

/** A draft's parent, in the order the store makes it available. */
export function draftParentId(d: Pick<AiDraft, 'payload' | 'scope'>): string | null {
  const p = (d.payload ?? {}) as Record<string, unknown>
  return str(p.hypothesis_id) ?? str(p.candidate_id) ?? str(p.run_id) ?? str(d.scope)
}

/** A hypothesis's birth candidate, when it was promoted from one. */
export function hypothesisCandidateId(h: Pick<Hypothesis, 'origin_ref'>): string | null {
  const ref = h.origin_ref
  if (!ref || typeof ref !== 'object') return null
  return str((ref as Record<string, unknown>).candidate_id)
}

/**
 * One policy against another, as the paths that differ.
 *
 * This is the only real diff in the store: a `policy_suggestion` carries both
 * `current_policy` and `suggestion`, so the change it proposes can be stated
 * rather than described. Every other artifact records what it *is*, not what
 * it changed — which is why the Journal's diff column is mostly empty, and
 * says so.
 */
export interface PolicyChange {
  path: string
  from: string
  to: string
}

const NOTHING = '—'

function leaves(v: unknown, prefix: string, out: Map<string, string>): void {
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
      leaves(child, prefix ? `${prefix}.${k}` : k, out)
    }
    return
  }
  out.set(prefix, Array.isArray(v) ? `[${v.join(', ')}]` : v === null ? 'null' : String(v))
}

export function policyChanges(current: unknown, suggested: unknown): PolicyChange[] {
  const a = new Map<string, string>()
  const b = new Map<string, string>()
  leaves(current, '', a)
  leaves(suggested, '', b)
  const out: PolicyChange[] = []
  for (const [path, to] of b) {
    const from = a.get(path)
    if (from === to) continue
    out.push({ path, from: from ?? NOTHING, to })
  }
  return out.sort((x, y) => x.path.localeCompare(y.path))
}

/** `+1.4%` / `−0.2%`, the sign carried as a glyph rather than a colour alone. */
export function journalPct(v: number | null): string {
  if (v == null) return NOTHING
  const pct = v * 100
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : ''
  return `${sign}${Math.abs(pct).toFixed(2)}%`
}

export interface JournalInput {
  runs: readonly ObjectiveRun[]
  candidates: readonly ResearchCandidate[]
  hypotheses: readonly Hypothesis[]
  drafts: readonly AiDraft[]
  outcomes: readonly CandidateOutcomeRow[]
}

function runNode(r: ObjectiveRun): JournalNode {
  const outputs = (r.outputs ?? {}) as Record<string, unknown>
  const plan = (r.plan_json ?? {}) as Record<string, unknown>
  const proposed = Array.isArray(outputs.candidate_ids) ? outputs.candidate_ids.length : 0
  const drafted = Array.isArray(outputs.draft_ids) ? outputs.draft_ids.length : 0
  const model = str(plan.llm_model) ?? str(plan.llm_provider)
  return {
    id: r.id,
    type: 'run',
    operator: 'loop',
    operatorRaw: str(plan.generated_by) ?? 'harness',
    parentId: null,
    depth: 0,
    title: `Objective run · ${r.objective_id}`,
    summary: `${proposed} proposed · ${drafted} drafted`,
    diff: NOTHING,
    state: r.status,
    at: r.started_at ?? '',
    day: dayOf(r.started_at),
    provenance: [
      ['operator', str(plan.generated_by) ?? 'harness'],
      ['objective', r.objective_id],
      ['persona', str(plan.persona) ?? NOTHING],
      ['model', model ?? NOTHING],
      ['started', r.started_at ?? NOTHING],
      ['finished', r.finished_at ?? 'still running'],
      ['parent', NOTHING],
      ['thread', 'not recorded'],
    ],
    to: `/research/loop/runs/${encodeURIComponent(r.id)}`,
    toLabel: 'Run pipeline →',
  }
}

function candidateNode(c: ResearchCandidate, sketch: string[]): JournalNode {
  const ref = (c.source_ref ?? {}) as Record<string, unknown>
  const runId = str(ref.run_id)
  const operator: JournalOperator = c.source === 'copilot' ? 'copilot' : 'loop'
  return {
    id: c.id,
    type: 'candidate',
    operator,
    operatorRaw: c.source,
    parentId: runId,
    depth: 0,
    title: `${c.symbol} — nominated`,
    summary: sketch.length ? sketch.join(' · ') : 'no sketch recorded',
    diff: c.score == null ? NOTHING : `score ${Number(c.score).toFixed(2)}`,
    state: c.status,
    at: c.created_at ?? c.trade_date,
    day: dayOf(c.created_at) || c.trade_date,
    provenance: [
      ['operator', c.source],
      ['symbol', c.symbol],
      ['trade_date', c.trade_date],
      ['run', runId ?? NOTHING],
      ['objective', str(ref.objective_id) ?? NOTHING],
      ['ttl', c.ttl_at ?? NOTHING],
      ['parent', runId ?? NOTHING],
      ['thread', 'not recorded'],
    ],
    to: '/research/loop/candidates',
    toLabel: 'Candidate Pool →',
  }
}

function hypothesisNode(h: Hypothesis): JournalNode {
  const page = h.origin_page ?? ''
  const operator: JournalOperator = MACHINE_ORIGIN[page] ?? (page ? 'hand' : 'loop')
  return {
    id: h.id,
    type: 'hypothesis',
    operator,
    operatorRaw: page || 'unrecorded',
    parentId: hypothesisCandidateId(h),
    depth: 0,
    title: h.title,
    summary: h.thesis.slice(0, 240),
    diff: NOTHING,
    state: h.status,
    at: h.created_at,
    day: dayOf(h.created_at),
    provenance: [
      ['operator', page || 'unrecorded'],
      ['symbols', h.symbols.join(', ') || NOTHING],
      ['tags', h.tags.join(', ') || NOTHING],
      ['backtests', h.linked_backtest_ids.length ? String(h.linked_backtest_ids.length) : NOTHING],
      ['created', h.created_at],
      ['resolution', h.resolution_json ? 'recorded' : 'none yet'],
      ['parent', hypothesisCandidateId(h) ?? NOTHING],
      ['thread', 'not recorded'],
    ],
    to: '/research/loop/hypotheses',
    toLabel: 'Hypothesis Board →',
  }
}

const DRAFT_STATE: Record<string, string> = {
  pending: 'in Inbox · awaiting you',
  approved: 'approved',
  dismissed: 'dismissed',
  expired: 'expired',
}

function draftNode(d: AiDraft): JournalNode {
  const p = (d.payload ?? {}) as Record<string, unknown>
  const type = DRAFT_TYPE[d.kind] ?? 'note'
  const changes = type === 'patch' ? policyChanges(p.current_policy, p.suggestion) : []
  const title =
    str(p.hypothesis_title) ??
    str(p.title) ??
    `${journalTypeLabel(type)} · ${d.kind.replace(/_/g, ' ')}`
  const summary =
    str(p.rationale) ??
    str(p.description) ??
    str(p.advisory) ??
    str(p.note_md) ??
    str(p.verdict) ??
    NOTHING
  return {
    id: d.id,
    type,
    operator: 'loop',
    operatorRaw: d.generated_by,
    parentId: draftParentId(d),
    depth: 0,
    title,
    summary: summary.slice(0, 240),
    diff: changes.length
      ? `${changes[0].path} ${changes[0].from} → ${changes[0].to}${changes.length > 1 ? ` · +${changes.length - 1}` : ''}`
      : NOTHING,
    state: DRAFT_STATE[d.status] ?? d.status,
    at: d.created_at,
    day: dayOf(d.created_at),
    provenance: [
      ['operator', d.generated_by],
      ['kind', d.kind],
      ['scope', d.scope],
      ['run', str(p.run_id) ?? NOTHING],
      ['created', d.created_at],
      ['expires', d.expires_at ?? NOTHING],
      ['parent', draftParentId(d) ?? NOTHING],
      ['thread', 'not recorded'],
    ],
    to: d.status === 'pending' ? '/research/loop/decisions' : null,
    toLabel: 'Decision Inbox →',
  }
}

function settlementNode(o: CandidateOutcomeRow): JournalNode {
  const excess = numericOrNull(o.excess_return)
  const fwd = numericOrNull(o.forward_return)
  const bench = numericOrNull(o.benchmark_return)
  const tradeDate = o.trade_date ?? ''
  // `hit` is nullable, and a null one is not a miss — it is an outcome the
  // rule has not judged yet. Folding it into `wrong` would turn a silence
  // into a verdict against the candidate.
  const verdict = o.hit == null ? 'unjudged' : o.hit ? 'right' : 'wrong'
  return {
    id: `settlement ${o.candidate_id} @${o.horizon_days}d`,
    type: 'settlement',
    operator: 'loop',
    operatorRaw: o.source ?? 'unrecorded',
    parentId: o.candidate_id,
    depth: 0,
    title: `${o.symbol} settled at ${o.horizon_days}d — ${verdict}`,
    summary: `${journalPct(fwd)} against ${o.benchmark_symbol ?? 'benchmark'} ${journalPct(bench)} · excess ${journalPct(excess)}`,
    diff: journalPct(excess),
    state: `settled · ${verdict}`,
    at: o.exit_date ?? tradeDate,
    day: dayOf(o.exit_date) || tradeDate,
    provenance: [
      ['operator', o.source ?? 'unrecorded'],
      ['candidate', o.candidate_id],
      ['horizon', `${o.horizon_days}d`],
      ['entry', `${tradeDate || NOTHING} · ${o.entry_close ?? NOTHING}`],
      ['exit', `${o.exit_date ?? NOTHING} · ${o.exit_close ?? NOTHING}`],
      ['benchmark', o.benchmark_symbol ?? NOTHING],
      ['parent', o.candidate_id],
      ['attribution', 'not recorded — no lens carries the outcome'],
    ],
    to: '/research/loop/candidates',
    toLabel: 'Candidate Pool →',
  }
}

/**
 * Every artifact, flat, with its parent named. Ordering is oldest first, so a
 * parent is read before the branch it grew.
 */
export function journalNodes(
  input: JournalInput,
  sketchOf: (c: ResearchCandidate) => string[],
): JournalNode[] {
  const nodes: JournalNode[] = [
    ...input.runs.map(runNode),
    ...input.candidates.map((c) => candidateNode(c, sketchOf(c))),
    ...input.hypotheses.map(hypothesisNode),
    ...input.drafts.map(draftNode),
    ...input.outcomes.map(settlementNode),
  ]
  return nodes.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.id.localeCompare(b.id)))
}

export interface JournalTree {
  root: JournalNode
  /** The root and everything under it, depth-first, each carrying its depth. */
  nodes: JournalNode[]
}

/**
 * The flat list, hung into trees.
 *
 * A node whose parent is not in view becomes a root of its own rather than
 * disappearing — the prototype synthesises a placeholder parent instead, but a
 * parent nobody wrote is a fact invented on screen. An orphan here says what
 * it is: its provenance still names the parent it could not reach.
 */
export function buildJournalTrees(nodes: readonly JournalNode[]): JournalTree[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const children = new Map<string, JournalNode[]>()
  const roots: JournalNode[] = []
  for (const n of nodes) {
    const parent = n.parentId != null ? byId.get(n.parentId) : undefined
    if (parent == null || parent.id === n.id) {
      roots.push(n)
      continue
    }
    const list = children.get(parent.id)
    if (list) list.push(n)
    else children.set(parent.id, [n])
  }
  const walk = (n: JournalNode, depth: number, out: JournalNode[], seen: Set<string>): void => {
    if (seen.has(n.id)) return
    seen.add(n.id)
    out.push({ ...n, depth })
    for (const c of children.get(n.id) ?? []) walk(c, depth + 1, out, seen)
  }
  return roots.map((root) => {
    const out: JournalNode[] = []
    walk(root, 0, out, new Set())
    return { root: out[0], nodes: out }
  })
}

/** Days that hold at least one artifact, newest first. */
export function journalDays(nodes: readonly JournalNode[]): string[] {
  return [...new Set(nodes.map((n) => n.day).filter(Boolean))].sort().reverse()
}

/**
 * Which day the page opens on.
 *
 * A `?sel=` deep link brings its own: every page's way in here is "Journal →"
 * on one artifact, and landing on today with a fortnight-old artifact in the
 * right panel and no tree around it answers the wrong question.
 *
 * Otherwise it is the newest day that holds a **run**, not the newest day of
 * any kind and not today. A draft can expire on a Sunday; a run is the
 * machine having worked, and opening on a day with no tree in it says the
 * loop is broken when it is only the weekend.
 */
export function journalDefaultDay(
  nodes: readonly JournalNode[],
  selectedId?: string | null,
): string {
  if (selectedId) {
    const sel = nodes.find((n) => n.id === selectedId)
    if (sel?.day) return sel.day
  }
  const runDays = new Set(nodes.filter((n) => n.type === 'run').map((n) => n.day))
  const days = journalDays(nodes)
  return days.find((d) => runDays.has(d)) ?? days[0] ?? ''
}

export interface JournalCount {
  label: string
  /** Null when the store cannot answer — the row stays and says why. */
  value: number | null
  detail: string
}

/**
 * The header's five readings.
 *
 * Three of the design's five count forks: *branches*, *merged*, and
 * *considered, not merged*. Nothing in this store records a fork — no
 * artifact says "I am that one with a parameter changed" — so those three
 * carry no number and name what is missing instead of reading zero. A zero
 * would say the loop tried nothing; the truth is that nobody writes it down.
 */
export function journalCounts(
  dayNodes: readonly JournalNode[],
  settledToday: readonly JournalNode[],
): JournalCount[] {
  const by = (op: JournalOperator) => dayNodes.filter((n) => n.operator === op).length
  const inbox = dayNodes.filter((n) => n.state.startsWith('in Inbox')).length
  const right = settledToday.filter((n) => n.state.endsWith('right')).length
  const wrong = settledToday.filter((n) => n.state.endsWith('wrong')).length
  const unjudged = settledToday.length - right - wrong
  return [
    {
      label: 'artifacts',
      value: dayNodes.length,
      detail: `loop ${by('loop')} · copilot ${by('copilot')} · hand ${by('hand')}`,
    },
    {
      label: 'waiting on you',
      value: inbox,
      detail: 'drafts in the Decision Inbox',
    },
    {
      label: 'settled',
      value: settledToday.length,
      detail: `${right} right · ${wrong} wrong${unjudged ? ` · ${unjudged} unjudged` : ''}`,
    },
    {
      label: 'branches',
      value: null,
      detail: 'no fork is recorded anywhere in the store',
    },
    {
      label: 'considered, not merged',
      value: null,
      detail: 'needs the same fork record',
    },
  ]
}

export interface JournalDayTree extends JournalTree {
  /**
   * Nodes shown only to connect the day's artifacts to the root they grew
   * from. They belong to an earlier day and the page dims them.
   */
  contextIds: ReadonlySet<string>
}

/**
 * The trees a day is actually about.
 *
 * The prototype assumes a day's work forms trees rooted that day. The store
 * does not oblige: an end-of-day verdict written tonight hangs under a
 * hypothesis born a fortnight ago, and a settlement lands days after the
 * candidate it judges. Cutting the tree at the day's own nodes leaves a flat
 * list of orphans — which is what this page drew first — and rooting only at
 * the day's roots hides most of what the day wrote.
 *
 * So the day selects the artifacts and the lineage comes along: every node
 * from the day, plus the ancestors needed to reach the root. The ancestors
 * are named as context rather than passed off as the day's work.
 */
export function journalDayTrees(
  trees: readonly JournalTree[],
  day: string,
  operator: JournalOperator | 'all',
): JournalDayTree[] {
  const out: JournalDayTree[] = []
  for (const tree of trees) {
    const byId = new Map(tree.nodes.map((n) => [n.id, n]))
    const keep = new Set<string>()
    const hits = new Set<string>()
    for (const n of tree.nodes) {
      if (n.day !== day) continue
      if (operator !== 'all' && n.operator !== operator) continue
      hits.add(n.id)
      let cur: JournalNode | undefined = n
      while (cur && !keep.has(cur.id)) {
        keep.add(cur.id)
        cur = cur.parentId != null ? byId.get(cur.parentId) : undefined
      }
    }
    if (hits.size === 0) continue
    const nodes = tree.nodes.filter((n) => keep.has(n.id))
    out.push({
      root: nodes[0],
      nodes,
      contextIds: new Set([...keep].filter((id) => !hits.has(id))),
    })
  }
  // Chronological by the day's first entry in each tree, so the page reads
  // the way the day happened: the run that opened it leads, and what was
  // written against it in the evening follows.
  const firstHit = (t: JournalDayTree): string =>
    t.nodes.filter((n) => !t.contextIds.has(n.id)).reduce((min, n) => (n.at < min ? n.at : min), '\uffff')
  return out.sort((a, b) => firstHit(a).localeCompare(firstHit(b)))
}
