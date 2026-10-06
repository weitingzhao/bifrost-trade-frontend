/**
 * Stock screen — one page for picking stocks (design Rev .121–.130,
 * `Research Stock Screen.dc.html`). A model ranks, a screen cuts, and each
 * works alone or with the other.
 *
 * Everything here is pure: one row per name, joined from the three model
 * stores and the SEPA evaluation table, and the screen evaluated over those
 * rows in the browser — the prototype's own shape (`ROWS` × `STAGES`).
 *
 * ## What the stores hold, measured on DEV 2026-09-30
 *
 *   SEPA     `/analytics/sepa/screener-wide` — 3,745 evaluated names, every
 *            one with its composite and all 19 condition booleans. The model
 *            route (`/research/sepa/model/daily`) caps at its top 1,000; the
 *            wide read re-applies the same dbt cuts to all of them
 *            (`sepaScreenModel`), so SEPA rates the whole evaluated universe.
 *            The composite reconciles 3,745 / 3,745 as
 *            .35·trend/11 + .30·growth/8 + .20·momentum + .15·options, with
 *            the options tier at the mart's 0.5 where it is unscored
 *            (`mart_sepa_composite_score`: coalesce(…, 0.5)).
 *   Radar    `/research/momentum/radar?trade_date=<latest>&grade=<g>` — 677
 *            graded names on 2026-09-29 (A+ 0 · A 1 · B 88 · C 491 · D 97).
 *   Premium  `/research/scan` in two pages (limit 500 + offset) — all 691
 *            underlyings of the option universe, not the design's 500.
 *
 * Bars are each model's own (Rev .122): SEPA path SETUP / PIVOT · Radar A+ / A
 * · Premium composite ≥ 70 at the server's neutral preset. Nothing is blended.
 */
import type { SepaWideRow } from '@/api/research/sepaScreenerWide'
import type { MomentumScore } from '@/api/researchEngine'
import type { VolRow } from '@/lib/research/volRatingsModel'
import { gradeOf, pathOf, stageOf } from '@/utils/sepaScreenModel'

// ─── Models ────────────────────────────────────────────────────────────────

export type ModelKey = 'sepa' | 'radar' | 'premium'
export type RankModel = ModelKey | 'none'
export const MODEL_KEYS: readonly ModelKey[] = ['sepa', 'radar', 'premium']

export type AgreeId = 'm_sepa' | 'm_radar' | 'm_prem'
export const AGREE_OF: Record<ModelKey, AgreeId> = { sepa: 'm_sepa', radar: 'm_radar', premium: 'm_prem' }
export const AGREE_IDS: readonly AgreeId[] = ['m_sepa', 'm_radar', 'm_prem']

export const MODEL_LABEL: Record<RankModel, string> = {
  sepa: 'SEPA',
  radar: 'Radar',
  premium: 'Premium',
  none: 'None',
}

/** Each model's own bar, in the words the cards and titles use. */
export const AGREE_BAR: Record<AgreeId, string> = {
  m_sepa: 'SEPA path SETUP or PIVOT',
  m_radar: 'Radar grade A+ or A',
  m_prem: 'Premium composite ≥ 70 (neutral preset)',
}

export const PREMIUM_BAR = 70

/** SEPA's four lenses, in the store's own names and the design's reading order. */
export const SEPA_LENSES = [
  { key: 'trend', label: 'Trend /11' },
  { key: 'growth', label: 'Growth /8' },
  { key: 'mom', label: 'Momentum tier' },
  { key: 'opt', label: 'Options tier' },
] as const
export type SepaLensKey = (typeof SEPA_LENSES)[number]['key']

/** The server's weights (`factors_json.weights`), and three stated leanings. */
export const SEPA_PRESETS = [
  { id: 'model', label: 'Model', note: 'the weights the server scored with', weights: { trend: 35, growth: 30, mom: 20, opt: 15 } },
  { id: 'trend', label: 'Trend', note: 'Trend-led — price structure over the statements', weights: { trend: 45, growth: 20, mom: 25, opt: 10 } },
  { id: 'quality', label: 'Quality', note: 'Quality-led — the statements over the tape', weights: { trend: 25, growth: 45, mom: 15, opt: 15 } },
  { id: 'even', label: 'Even', note: 'four equal quarters, a baseline to compare against', weights: { trend: 25, growth: 25, mom: 25, opt: 25 } },
] as const

/** The options tier the mart substitutes when a name has no options structure. */
export const OPTIONS_TIER_DEFAULT = 50

export interface SepaRead {
  /** Server composite, 0–100. */
  comp: number
  grade: string
  path: string
  stage: string
  trendN: number
  growthN: number
  /** Momentum-tier signals passed, 0–10. */
  momN: number
  /** Lens scores 0–100; `opt` null when the name has no options tier. */
  lens: Record<SepaLensKey, number | null>
}

export interface RadarRead {
  score: number
  grade: string
  path: string
  date: string
  row: MomentumScore
}

export interface NameRow {
  sym: string
  company: string | null
  sepa: SepaRead | null
  radar: RadarRead | null
  prem: VolRow | null
  /** The 19 SEPA evaluation booleans by mart column; missing = not evaluated. */
  cond: Record<string, boolean | null>
}

export function sepaReadOf(w: SepaWideRow): SepaRead {
  const c = w.composite_score
  const optRaw = w.structure_score
  const momN = w.momentum_score == null ? 0 : Math.round(w.momentum_score * 10)
  return {
    comp: c * 100,
    grade: gradeOf(c),
    path: pathOf(c, w.tech_pass_count),
    stage: stageOf(c, w.tech_pass_count),
    trendN: w.tech_pass_count,
    growthN: w.fund_pass_count,
    momN,
    lens: {
      trend: (w.tech_pass_count / 11) * 100,
      growth: (w.fund_pass_count / 8) * 100,
      mom: momN * 10,
      opt: optRaw == null ? null : optRaw * 100,
    },
  }
}

/** Join the stores into one row per name. A name any store knows is in the pool. */
export function joinNames(
  wide: readonly SepaWideRow[],
  radar: readonly MomentumScore[],
  prem: readonly VolRow[],
): NameRow[] {
  const by = new Map<string, NameRow>()
  const at = (sym: string): NameRow => {
    let r = by.get(sym)
    if (!r) {
      r = { sym, company: null, sepa: null, radar: null, prem: null, cond: {} }
      by.set(sym, r)
    }
    return r
  }
  for (const w of wide) {
    const r = at(w.symbol.toUpperCase())
    r.company = w.company_name
    r.sepa = sepaReadOf(w)
    r.cond = w.conditions
  }
  for (const m of radar) {
    const sym = (m.symbol ?? '').toUpperCase()
    if (!sym) continue
    at(sym).radar = { score: m.score, grade: m.grade, path: m.path, date: m.trade_date, row: m }
  }
  for (const p of prem) at(p.symbol).prem = p
  return [...by.values()]
}

export function covered(r: NameRow, id: AgreeId): boolean {
  return id === 'm_sepa' ? r.sepa != null : id === 'm_radar' ? r.radar != null : r.prem != null
}

export function clears(r: NameRow, id: AgreeId): boolean {
  if (id === 'm_sepa') return r.sepa != null && (r.sepa.path === 'SETUP' || r.sepa.path === 'PIVOT')
  if (id === 'm_radar') return r.radar != null && (r.radar.grade === 'A+' || r.radar.grade === 'A')
  return r.prem?.serverScore != null && r.prem.serverScore >= PREMIUM_BAR
}

export function barsCleared(r: NameRow): number {
  return AGREE_IDS.filter((id) => clears(r, id)).length
}

/** SEPA composite at your weights. The options tier falls back as the mart's does. */
export function sepaScoreAt(s: SepaRead, w: Record<string, number>): number {
  let sum = 0
  let applied = 0
  for (const { key } of SEPA_LENSES) {
    const wt = w[key] ?? 0
    if (wt <= 0) continue
    sum += (s.lens[key] ?? OPTIONS_TIER_DEFAULT) * wt
    applied += wt
  }
  return applied > 0 ? sum / applied : 0
}

export interface ScorePart {
  key: string
  label: string
  raw: string
  /** Lens score 0–100, for the bar. */
  value: number | null
  weight: number
  /** Composite points: value × weight share. */
  points: number | null
  note?: string
}

export function sepaParts(s: SepaRead, w: Record<string, number>): ScorePart[] {
  const applied = SEPA_LENSES.reduce((a, { key }) => a + Math.max(0, w[key] ?? 0), 0)
  const raw: Record<SepaLensKey, string> = {
    trend: `${s.trendN}/11`,
    growth: `${s.growthN}/8`,
    mom: `${s.momN}/10`,
    opt: s.lens.opt == null ? '—' : s.lens.opt.toFixed(0),
  }
  return SEPA_LENSES.map(({ key, label }) => {
    const weight = w[key] ?? 0
    const value = s.lens[key] ?? OPTIONS_TIER_DEFAULT
    return {
      key,
      label,
      raw: raw[key],
      value,
      weight,
      points: weight > 0 && applied > 0 ? (value * weight) / applied : null,
      note: key === 'opt' && s.lens.opt == null ? 'No options tier: the mart scores it 50.' : undefined,
    }
  })
}

// ─── The screen ────────────────────────────────────────────────────────────

export type StageId =
  | 'agree'
  | 'trend'
  | 'growth'
  | 'momtier'
  | 'radar'
  | 'structure'
  | 'sentiment'
  | 'quality'
  | 'catalyst'
  | 'pine'
  | 'options'

export type StageKind = 'agree' | 'min' | 'any' | 'all'

export interface StageChip {
  id: string
  label: string
  /** Why nothing counts this chip, when the rest of its stage is live. */
  missing?: string
  /** An SEC 8-K condition: dashed, never enters a model. */
  narrative?: string
  /** Chip membership comes from a server set, not from the row. */
  fromSet?: boolean
  title?: string
  /** A Pine stage chip: the script and side it reads (drawn per script, Rev .158 B2). */
  pine?: { script: string; name: string; origin: string; side: 'buy' | 'sell' }
}

export interface Stage {
  id: StageId
  title: string
  mode: string
  kind: StageKind
  /** The min stepper's ceiling, when the stage has one. */
  max?: number
  chips: readonly StageChip[]
  /** Why the whole stage cannot be evaluated, or null. */
  missing: string | null
}

/** The Pine stage's own window and match (Rev .158 B2): saved with the screen and its versions. */
export type PineWithin = 1 | 5 | 10
export interface PineStageSettings {
  within: PineWithin
  match: 'any' | 'all'
}
export const PINE_DEFAULT: PineStageSettings = { within: 5, match: 'any' }

export interface ScreenState {
  on: Record<string, boolean>
  mins: Record<string, number>
  /** Absent on screens made before Rev .158 — read as PINE_DEFAULT. */
  pine?: PineStageSettings
}

export function pineOf(s: Pick<ScreenState, 'pine'>): PineStageSettings {
  const p = s.pine
  return {
    within: p?.within === 1 || p?.within === 10 ? p.within : 5,
    match: p?.match === 'all' ? 'all' : 'any',
  }
}

export const EMPTY_SCREEN: ScreenState = { on: {}, mins: {} }

/** Does a name hold one chip? `sets` carries the server-evaluated chips. */
export type Probe = (r: NameRow, chipId: string) => boolean

export function rowProbe(sets: ReadonlyMap<string, ReadonlySet<string>>): Probe {
  return (r, id) => {
    if (id in r.cond) return r.cond[id] === true
    switch (id) {
      case 'm_sepa':
      case 'm_radar':
      case 'm_prem':
        return clears(r, id)
      case 'grade_aplus':
        return r.radar?.grade === 'A+'
      case 'grade_a':
        return r.radar?.grade === 'A'
      case 'grade_b':
        return r.radar?.grade === 'B'
      case 'grade_c':
        return r.radar?.grade === 'C'
      case 'grade_d':
        return r.radar?.grade === 'D'
      case 'ivr_ge_40':
        return (r.prem?.raw.ivRank ?? -1) >= 40
      case 'ivr_ge_60':
        return (r.prem?.raw.ivRank ?? -1) >= 60
      case 'vrp_pct_ge_70':
        return (r.prem?.raw.vrp ?? -1) >= 70
      default:
        return sets.get(id)?.has(r.sym) ?? false
    }
  }
}

/**
 * Does a name carry a reading for a row-evaluated chip — true or false, as
 * against not evaluated (Rev .157: a chip no name in range has a reading for
 * is `missing`, not zero)? Server-set chips (`fromSet`) answer membership for
 * every name, so they always read.
 */
export function rowHasReading(r: NameRow, chip: Pick<StageChip, 'id' | 'fromSet'>): boolean {
  if (chip.fromSet) return true
  const id = chip.id
  switch (id) {
    case 'm_sepa':
      return r.sepa != null
    case 'm_radar':
    case 'grade_aplus':
    case 'grade_a':
    case 'grade_b':
    case 'grade_c':
    case 'grade_d':
      return r.radar != null
    case 'm_prem':
      return r.prem != null
    case 'ivr_ge_40':
    case 'ivr_ge_60':
      return r.prem?.raw.ivRank != null
    case 'vrp_pct_ge_70':
      return r.prem?.raw.vrp != null
    default:
      return r.cond[id] != null
  }
}

/** How many of a min stage's conditions a name holds. */
function minCount(stage: Stage, r: NameRow, probe: Probe): number {
  if (stage.id === 'trend') return r.sepa?.trendN ?? 0
  if (stage.id === 'growth') return r.sepa?.growthN ?? 0
  if (stage.id === 'momtier') return r.sepa?.momN ?? 0
  return stage.chips.filter((c) => probe(r, c.id)).length
}

export function stageActive(stage: Stage, s: ScreenState): boolean {
  return stage.chips.some((c) => s.on[c.id]) || ((stage.kind === 'min' || stage.kind === 'agree') && (s.mins[stage.id] ?? 0) > 0)
}

/** The prototype's `passes`, one stage at a time. */
export function passesStage(r: NameRow, stage: Stage, s: ScreenState, probe: Probe): boolean {
  const sel = stage.chips.filter((c) => s.on[c.id]).map((c) => c.id)
  const need = s.mins[stage.id] ?? 0
  if (stage.kind === 'agree') {
    if (!sel.length && !need) return true
    const pick = sel.length ? sel : stage.chips.map((c) => c.id)
    const hits = pick.filter((id) => probe(r, id)).length
    return hits >= (need ? Math.min(need, pick.length) : pick.length)
  }
  if (stage.kind === 'min') {
    if (need > 0 && minCount(stage, r, probe) < need) return false
    return sel.every((id) => probe(r, id))
  }
  if (!sel.length) return true
  const all = stage.kind === 'all' || (stage.id === 'pine' && pineOf(s).match === 'all')
  return all ? sel.every((id) => probe(r, id)) : sel.some((id) => probe(r, id))
}

export function passesAll(
  r: NameRow,
  stages: readonly Stage[],
  s: ScreenState,
  probe: Probe,
  skip?: StageId,
): boolean {
  for (const st of stages) {
    if (st.id === skip) continue
    if (!passesStage(r, st, s, probe)) return false
  }
  return true
}

export interface StageCount {
  before: number
  after: number
}

/**
 * The funnel down the Screen panel: a running intersection, in stage order.
 * `cuts[i]` is what stage i removed from the names that reached it — the set a
 * stage's −N lists (Rev .131).
 */
export function runStages(
  pool: readonly NameRow[],
  stages: readonly Stage[],
  s: ScreenState,
  probe: Probe,
): { counts: StageCount[]; cuts: NameRow[][]; survivors: NameRow[] } {
  let cur = pool.slice()
  const counts: StageCount[] = []
  const cuts: NameRow[][] = []
  for (const st of stages) {
    const before = cur.length
    const kept: NameRow[] = []
    const cut: NameRow[] = []
    for (const r of cur) (passesStage(r, st, s, probe) ? kept : cut).push(r)
    cur = kept
    cuts.push(cut)
    counts.push({ before, after: cur.length })
  }
  return { counts, cuts, survivors: cur }
}

/** Conditions on, as Clear N counts them: every chip plus every min above 0. */
export function conditionCount(s: ScreenState): number {
  return Object.values(s.on).filter(Boolean).length + Object.values(s.mins).filter((n) => n > 0).length
}

// ─── Match rate, funnels, lineage ──────────────────────────────────────────

export interface MatchCell {
  id: AgreeId | 'all3'
  k: number
  of: number
  covered: number
}

/** Of the names that pass every other condition, how many clear each bar. */
export function matchRate(base: readonly NameRow[]): MatchCell[] {
  const of = base.length
  const cells: MatchCell[] = AGREE_IDS.map((id) => ({
    id,
    k: base.filter((r) => clears(r, id)).length,
    of,
    covered: base.filter((r) => covered(r, id)).length,
  }))
  cells.push({ id: 'all3', k: base.filter((r) => barsCleared(r) === 3).length, of, covered: of })
  return cells
}

export interface Axis {
  title: string
  nodes: readonly string[]
  of: (r: NameRow) => number
  /** Node indexes that meet the model's bar. */
  clear: readonly number[]
  /** The last node is "not rated by this model". */
  hasNa: boolean
}

const SEPA_NODES = ['PIVOT', 'SETUP', 'WATCH', 'AVOID', 'not rated'] as const
const RADAR_NODES = ['A+', 'A', 'B', 'C', 'D', 'not rated'] as const

export const AXES: readonly Axis[] = [
  {
    title: 'SEPA',
    nodes: SEPA_NODES,
    of: (r) => (r.sepa ? Math.max(0, SEPA_NODES.indexOf(r.sepa.path as (typeof SEPA_NODES)[number])) : 4),
    clear: [0, 1],
    hasNa: true,
  },
  {
    title: 'Radar',
    nodes: RADAR_NODES,
    of: (r) => {
      if (!r.radar) return 5
      const i = RADAR_NODES.indexOf(r.radar.grade as (typeof RADAR_NODES)[number])
      return i < 0 ? 4 : i
    },
    clear: [0, 1],
    hasNa: true,
  },
  {
    title: 'Premium',
    nodes: ['≥ 70', '50–69', '< 50', 'not rated'],
    of: (r) => {
      const v = r.prem?.serverScore
      return v == null ? 3 : v >= PREMIUM_BAR ? 0 : v >= 50 ? 1 : 2
    },
    clear: [0],
    hasNa: true,
  },
  {
    title: 'Bars cleared',
    nodes: ['3 of 3', '2 of 3', '1 of 3', '0 of 3'],
    of: (r) => 3 - barsCleared(r),
    clear: [0],
    hasNa: false,
  },
]

/** Platform reach per model, for the cards and funnels (measured, not typed). */
export interface Reach {
  universe: number
  rated: number
}

export interface FunnelStep {
  label: string
  set: NameRow[]
}

export interface Funnel {
  key: ModelKey | 'all3'
  title: string
  steps: FunnelStep[]
}

export function funnelsOf(pool: readonly NameRow[], base: readonly NameRow[]): Funnel[] {
  const out: Funnel[] = MODEL_KEYS.map((m) => {
    const id = AGREE_OF[m]
    return {
      key: m,
      title: MODEL_LABEL[m],
      steps: [
        { label: 'Universe', set: pool.slice() },
        { label: 'Pass other conditions', set: base.slice() },
        { label: 'Covered', set: base.filter((r) => covered(r, id)) },
        { label: 'Clear the bar', set: base.filter((r) => clears(r, id)) },
      ],
    }
  })
  const atLeast = (n: number) => base.filter((r) => barsCleared(r) >= n)
  out.push({
    key: 'all3',
    title: 'All three',
    steps: [
      { label: 'Pass other conditions', set: base.slice() },
      { label: 'Rated by ≥ 1', set: base.filter((r) => AGREE_IDS.some((id) => covered(r, id))) },
      { label: 'Clear ≥ 1 bar', set: atLeast(1) },
      { label: 'Clear ≥ 2 bars', set: atLeast(2) },
      { label: 'Clear all 3', set: atLeast(3) },
    ],
  })
  return out
}

/** Lineage focus: a node picked per axis; a name must pass through every one. */
export type LineageFocus = Partial<Record<number, number>>

export function inFocus(r: NameRow, focus: LineageFocus): boolean {
  return Object.entries(focus).every(([a, n]) => AXES[Number(a)].of(r) === n)
}

/** Visible axes: the cards picked in the Model agreement stage, else all three; Bars cleared always. */
export function visibleAxes(s: ScreenState): number[] {
  const picked = AGREE_IDS.map((id, i) => (s.on[id] ? i : -1)).filter((i) => i >= 0)
  return (picked.length ? picked : [0, 1, 2]).concat([3])
}

/** Drop focus held on an axis no longer drawn (Rev .130 #2). */
export function focusOnVisible(focus: LineageFocus, visible: readonly number[]): LineageFocus {
  const out: LineageFocus = {}
  for (const [a, n] of Object.entries(focus)) if (visible.includes(Number(a)) && n != null) out[Number(a)] = n
  return out
}

export interface RibbonGroup {
  /** Node index per drawn axis (Screen first = 0), then the agreement level. */
  key: number[]
  rows: NameRow[]
}

/** One group per identical path through the drawn axes, keyed so colour survives a hidden Bars axis. */
export function ribbonGroups(set: readonly NameRow[], visible: readonly number[]): RibbonGroup[] {
  const gm = new Map<string, RibbonGroup>()
  for (const r of set) {
    const key = [0, ...visible.map((a) => AXES[a].of(r)), AXES[3].of(r)]
    const k = key.join('-')
    let g = gm.get(k)
    if (!g) {
      g = { key, rows: [] }
      gm.set(k, g)
    }
    g.rows.push(r)
  }
  return [...gm.values()]
}

// ─── Versions ──────────────────────────────────────────────────────────────

export interface ScreenVersion {
  v: number
  parent: number
  screen: ScreenState
  universe: string
  syms: string[]
  why: string
  at: string
}

export function versionDiff(cur: ScreenVersion, parent: ScreenVersion | null): string {
  if (!parent) return 'root'
  const was = new Set(parent.syms)
  const now = new Set(cur.syms)
  const added = cur.syms.filter((x) => !was.has(x))
  const dropped = parent.syms.filter((x) => !now.has(x))
  if (!added.length && !dropped.length) return `vs v${parent.v} · same set`
  const list = (xs: string[], sign: string) =>
    xs.length ? sign + xs.slice(0, 3).join(` ${sign}`) + (xs.length > 3 ? ` ${sign}${xs.length - 3}` : '') : ''
  return `vs v${parent.v} · ${[list(added, '+'), list(dropped, '−')].filter(Boolean).join('  ')}`
}

// ─── Hovering a stage (Rev .131) ───────────────────────────────────────────

/**
 * What hovering a Screen stage shows on the lineage. The ribbons are drawn on
 * the names that pass every stage but Model agreement, so only that stage can
 * cut inside the drawing; for any other stage the note says it already cut
 * its names before the lineage, and a pass-through stage says it cuts nothing.
 */
export function stageHover(
  index: number,
  stage: Stage,
  base: readonly NameRow[],
  screen: ScreenState,
  probe: Probe,
  cutBefore: number,
): { keep: ((r: NameRow) => boolean) | null; note: string } {
  const head = `stage ${index + 1} ${stage.title}`
  if (!stageActive(stage, screen)) return { keep: null, note: `${head} · pass-through, cuts nothing` }
  const keep = (r: NameRow) => passesStage(r, stage, screen, probe)
  const inside = base.filter((r) => !keep(r)).length
  if (inside) return { keep, note: `${head} · cuts ${inside} of these ${base.length} (faded)` }
  return { keep: null, note: `${head} · cut ${cutBefore} before the lineage; none of these ${base.length} fail it` }
}
