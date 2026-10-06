/**
 * The Screen panel's nine stages and the Start-from presets, in the
 * prototype's order (`Research Stock Screen.dc.html` STAGES · PRESETS).
 *
 * Where this side cannot evaluate a condition across the universe, the chip
 * keeps its place and says which store is missing, measured on DEV
 * 2026-09-30:
 *
 *   Momentum tier  the prototype's "tier 1–5" is not in any store. SEPA's
 *                  momentum tier is ten signals, `momentum_score` = passed/10
 *                  on every evaluated name, so the stage reads "at least N of
 *                  10" with the ten signals as chips (`momentum-filter`).
 *   Structure      the mart's own eight signals (`tier-filter`). VCP, tight
 *                  closes, pocket pivot and RSL new high are not columns of
 *                  `mart_sepa_tier_structure`.
 *   Sentiment      not drawn by the design; the sentiment tier's six signals
 *                  (`tier-filter?tier=sentiment`), kept from the old screen.
 *   Quality        `fundamental-filter` answers nothing for these seven ids.
 *   Catalyst       the three earnings windows read Research's estimated next
 *                  print for every name (`/research/narrative/earnings/batch`,
 *                  research 0.193.0, TD-158; `stockScreenEarnings.ts`); a live
 *                  theme and "no event 30d" have no per-name store
 *                  (`/research/events/calendar` holds 8 rows); the four 8-K
 *                  conditions are live (`/research/narrative?days=7`).
 *   Options fit    IV rank from the Premium scan (691 underlyings); VRP is kept
 *                  as its 1-year percentile, not in points, so the chip says
 *                  so; open interest, spread and weeklies have no store.
 */
import { MOMENTUM_INDICATORS, SENTIMENT_INDICATORS, STRUCTURE_INDICATORS } from '@/constants/stockScreenerCatalog'
import { pineLibraryEntries, type PineLibraryEntry } from '@/api/research/pine'
import { NARRATIVE_CONDITIONS } from '@/lib/research/narrativeItems'
import { AGREE_BAR, type ScreenState, type Stage } from './stockScreenModel'
import { EARN_CHIP_TITLE } from './stockScreenEarnings'

const NO_THEME =
  'No per-name store for themes or other events: the event calendar holds 8 rows. Earnings windows are live (Research’s estimate).'
/**
 * Pine library scripts (research 0.173.0, W6; design Rev .158 B2): a chip
 * passes a name when the script's buy or sell plot fired on it within the
 * stage's window — 1, 5 or 10 sessions, the screen's own `pine.within`
 * (`/research/pine/signals`). Ids are `pine:<script>:<side>`. The stage is
 * drawn one row per script with a joined ↑ buy / ↓ sell pair; `pine.match`
 * reads the picked chips as Any or All.
 *
 * The chips are the library's active scripts (`usePineLibrary`), so a script
 * pasted in Backtest › Pine library joins the screen once it is saved; until
 * the library answers, the eight built-ins stand in.
 */
export function pineChipId(script: string, side: 'buy' | 'sell'): string {
  return `pine:${script}:${side}`
}

function pineStage(scripts: readonly PineLibraryEntry[]): Stage {
  return {
    id: 'pine',
    title: 'Pine signals',
    mode: 'per script · fired within the window',
    kind: 'any',
    missing: null,
    chips: scripts.flatMap((p) =>
      (['buy', 'sell'] as const).map((side) => ({
        id: pineChipId(p.id, side),
        label: `${p.label} ${side === 'buy' ? '↑' : '↓'}`,
        title: `${p.origin === 'bifrost' ? 'Pine library' : `Pine ${p.origin}`} script ${p.id}: its ${side} plot fired within the window`,
        fromSet: true,
        pine: { script: p.id, name: p.label, origin: p.origin, side },
      }))
    ),
  }
}

const NO_LIQUIDITY = 'No store carries open interest, spread or listed weeklies across the universe.'

export const STAGES: readonly Stage[] = [
  {
    id: 'agree',
    title: 'Model agreement',
    mode: 'at least N of the selected · each model’s own bar',
    kind: 'agree',
    max: 3,
    missing: null,
    chips: [
      { id: 'm_sepa', label: 'SEPA', title: AGREE_BAR.m_sepa },
      { id: 'm_radar', label: 'Radar', title: AGREE_BAR.m_radar },
      { id: 'm_prem', label: 'Premium', title: AGREE_BAR.m_prem },
    ],
  },
  {
    id: 'trend',
    title: 'Trend template',
    mode: 'at least N of 11 · SEPA technical eval',
    kind: 'min',
    max: 11,
    missing: null,
    chips: [
      { id: 'avg_volume_50_gt_threshold', label: 'Vol 50D > 100K' },
      { id: 'crs_ge_70', label: 'CRS ≥ 70' },
      { id: 'close_ge_low52_x_1_3', label: '≥ L52 × 1.3' },
      { id: 'close_ge_high52_x_0_75', label: '≥ H52 × 0.75' },
      { id: 'sma50_gt_sma150', label: '50 > 150' },
      { id: 'sma50_gt_sma200', label: '50 > 200' },
      { id: 'sma150_gt_sma200', label: '150 > 200' },
      { id: 'sma200_rising_1m', label: '200 rising' },
      { id: 'price_gt_sma50', label: 'P > 50' },
      { id: 'price_gt_sma150', label: 'P > 150' },
      { id: 'price_gt_sma200', label: 'P > 200' },
    ],
  },
  {
    id: 'growth',
    title: 'Growth',
    mode: 'at least N of 8 · SEPA fundamental eval',
    kind: 'min',
    max: 8,
    missing: null,
    chips: [
      { id: 'eps_q2q_ge_25pct', label: 'EPS QoQ ≥ 25%' },
      { id: 'rev_q2q_ge_25pct', label: 'Rev QoQ ≥ 25%' },
      { id: 'eps_acc_2q', label: 'EPS accel 2Q' },
      { id: 'rev_acc_2q', label: 'Rev accel 2Q' },
      { id: 'eps_3y_ge_15pct', label: 'EPS 3Y ≥ 15%' },
      { id: 'rev_3y_ge_15pct', label: 'Rev 3Y ≥ 15%' },
      { id: 'eps_acc_fy', label: 'EPS accel FY' },
      { id: 'rev_acc_fy', label: 'Rev accel FY' },
    ],
  },
  {
    id: 'momtier',
    title: 'Momentum tier',
    mode: 'at least N of 10 · SEPA factor, not Radar',
    kind: 'min',
    max: 10,
    missing: null,
    chips: MOMENTUM_INDICATORS.map(({ id, label }) => ({ id, label, fromSet: true })),
  },
  {
    id: 'radar',
    title: 'Radar grade',
    mode: 'any selected · Radar engine, latest session',
    kind: 'any',
    missing: null,
    chips: [
      { id: 'grade_aplus', label: 'A+' },
      { id: 'grade_a', label: 'A' },
      { id: 'grade_b', label: 'B' },
      { id: 'grade_c', label: 'C' },
      { id: 'grade_d', label: 'D' },
    ],
  },
  {
    id: 'structure',
    title: 'Structure',
    mode: 'any selected · structure tier',
    kind: 'any',
    missing: null,
    chips: STRUCTURE_INDICATORS.map(({ id, label }) => ({ id, label, fromSet: true })),
  },
  // Not in the prototype: the sentiment tier is a SEPA tier mart with every
  // name scored (5,322), and the old Stock screen carried it. Placed here as a
  // stage in the panel's own language (§15.6) and named to Design.
  {
    id: 'sentiment',
    title: 'Sentiment',
    mode: 'any selected · short-interest tier',
    kind: 'any',
    missing: null,
    chips: SENTIMENT_INDICATORS.map(({ id, label }) => ({ id, label, fromSet: true })),
  },
  {
    id: 'quality',
    title: 'Quality · balance · cash',
    mode: 'all selected',
    kind: 'all',
    missing:
      'The fundamental filter answers for the growth conditions and returns nothing for any of these seven, so no store evaluates them across the universe.',
    chips: [
      { id: 'gross_margin_ge_30pct', label: 'GM ≥ 30%' },
      { id: 'fcf_positive', label: 'FCF > 0' },
      { id: 'fcf_margin_ge_5pct', label: 'FCF margin ≥ 5%' },
      { id: 'debt_to_equity_le_1', label: 'D/E ≤ 1' },
      { id: 'roe_ge_15pct', label: 'ROE ≥ 15%' },
      { id: 'pe_le_60', label: 'P/E ≤ 60' },
      { id: 'net_margin_ge_5pct', label: 'Net margin ≥ 5%' },
    ],
  },
  {
    id: 'catalyst',
    title: 'Catalyst window',
    mode: 'any selected · Event Radar + SEC 8-K',
    kind: 'any',
    missing: null,
    chips: [
      { id: 'earn_gt_10d', label: 'Earnings > 10d', fromSet: true, title: EARN_CHIP_TITLE.earn_gt_10d },
      { id: 'earn_10_30d', label: 'Earnings 10–30d', fromSet: true, title: EARN_CHIP_TITLE.earn_10_30d },
      { id: 'earn_lt_10d', label: 'Earnings < 10d', fromSet: true, title: EARN_CHIP_TITLE.earn_lt_10d },
      { id: 'news_theme', label: 'In a live theme', missing: NO_THEME },
      { id: 'no_event_30d', label: 'No event 30d', missing: NO_THEME },
      ...NARRATIVE_CONDITIONS.map((c) => ({ id: c.id, label: c.label, narrative: c.desc, fromSet: true })),
    ],
  },
  pineStage(pineLibraryEntries(undefined)),
  {
    id: 'options',
    title: 'Options fit',
    mode: 'all selected · what a seller needs',
    kind: 'all',
    missing: null,
    chips: [
      { id: 'ivr_ge_40', label: 'IV rank ≥ 40', title: 'Premium scan · iv_rank_1y · names outside its 691 fail' },
      { id: 'ivr_ge_60', label: 'IV rank ≥ 60', title: 'Premium scan · iv_rank_1y · names outside its 691 fail' },
      {
        id: 'vrp_pct_ge_70',
        label: 'VRP pct ≥ 70',
        title: 'The scan keeps VRP as its 1-year percentile, not in points, so the design’s “VRP > 4pp” is read as the 70th percentile',
      },
      { id: 'oi_liquid', label: 'OI ≥ 5k · spread ≤ 5%', missing: NO_LIQUIDITY },
      { id: 'weeklies', label: 'Weekly expiries', missing: NO_LIQUIDITY },
    ],
  },
]

export const STAGE_OF = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<Stage['id'], Stage>

/** STAGES with the Pine stage's chips drawn from the library's active scripts. */
export function stagesWithPine(scripts: readonly PineLibraryEntry[]): readonly Stage[] {
  return STAGES.map((s) => (s.id === 'pine' ? pineStage(scripts) : s))
}

/** The first Pine script a screen selects, as the Symbol chart's `?signal=` — names open with its marks on. */
export function pineChartSignal(on: Readonly<Record<string, boolean>>): string | null {
  const id = Object.keys(on).find((k) => on[k] && k.startsWith('pine:'))
  return id ? `pine:${id.split(':')[1]}` : null
}

/**
 * Pine picks the screen holds whose script is not among the stage's chips —
 * switched off (or removed) in the Pine library since the screen was saved.
 * They are kept and shown as off, and evaluate nothing (Rev .160 receipt).
 */
export function pineOffPicks(stage: Pick<Stage, 'id' | 'chips'>, on: Readonly<Record<string, boolean>>): string[] {
  if (stage.id !== 'pine') return []
  const live = new Set(stage.chips.map((c) => c.id))
  return Object.keys(on)
    .filter((k) => on[k] && k.startsWith('pine:') && !live.has(k))
    .sort()
}

/** A chip nothing can evaluate — the whole stage missing, or the chip itself. */
export function chipMissing(stageId: Stage['id'], chipId: string): string | null {
  const st = STAGE_OF[stageId]
  return st.missing ?? st.chips.find((c) => c.id === chipId)?.missing ?? null
}

export interface StartPreset {
  id: string
  label: string
  k: string
  title: string
  screen: ScreenState
  /** Why this preset cannot be offered as the design writes it, or null. */
  missing: string | null
}

/** Presets are condition sets, not models (Rev .121 #1). */
export const START_PRESETS: readonly StartPreset[] = [
  {
    id: 'p-agree',
    label: '2 of 3 models',
    k: 'agreement',
    title: 'At least two of SEPA · Radar · Premium clear their own bar',
    screen: { on: {}, mins: { agree: 2 } },
    missing: null,
  },
  {
    id: 'p-shape',
    label: 'Setup shape',
    k: 'trend ≥ 9',
    title:
      'Trend template ≥ 9 of 11 and any structure contraction. The design names VCP, tight closes and BB squeeze; the structure tier carries BB squeeze and ATR contraction (read as VCP), and no tight-closes signal.',
    screen: { on: { vol_contracting: true, bb_squeeze: true }, mins: { trend: 9 } },
    missing: null,
  },
  {
    id: 'p-growth',
    label: 'Growth + cash',
    k: 'growth ≥ 5',
    title: 'Growth ≥ 5 of 8, gross margin ≥ 30% and FCF > 0',
    screen: { on: { gross_margin_ge_30pct: true, fcf_positive: true }, mins: { growth: 5 } },
    missing: 'Gross margin and FCF have no store across the universe, so this preset would run as growth alone.',
  },
  {
    id: 'p-event',
    label: 'Event window',
    k: '≤ 30d',
    title: 'Earnings inside 30 days, or in a live theme',
    screen: { on: { earn_lt_10d: true, earn_10_30d: true, news_theme: true }, mins: {} },
    missing: 'No per-name store for themes, so this preset runs on the earnings window alone.',
  },
  {
    id: 'p-seller',
    label: 'Premium seller',
    k: 'IV · no print',
    title: 'Rich IV, VRP, liquid options and no earnings inside 10 days',
    screen: { on: { ivr_ge_40: true, vrp_pct_ge_70: true, oi_liquid: true, earn_gt_10d: true }, mins: { trend: 7 } },
    missing: `${NO_LIQUIDITY} The earnings veto reads Research’s estimate; names without one fail it.`,
  },
]

/** The old screener's opening criteria, for `/research/screener` and `/research/explorer`. */
export const LEGACY_SCREEN: ScreenState = { on: {}, mins: { trend: 8 } }
