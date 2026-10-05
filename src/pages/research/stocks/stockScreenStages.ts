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
 *   Catalyst       no earnings window or theme is served across the universe
 *                  (`/research/events/calendar` holds 8 rows); the four 8-K
 *                  conditions are live (`/research/narrative?days=7`).
 *   Options fit    IV rank from the Premium scan (691 underlyings); VRP is kept
 *                  as its 1-year percentile, not in points, so the chip says
 *                  so; open interest, spread and weeklies have no store.
 */
import { MOMENTUM_INDICATORS, SENTIMENT_INDICATORS, STRUCTURE_INDICATORS } from '@/constants/stockScreenerCatalog'
import { PINE_BUILTINS } from '@/api/research/pine'
import { NARRATIVE_CONDITIONS } from '@/lib/research/narrativeItems'
import { AGREE_BAR, type ScreenState, type Stage } from './stockScreenModel'

const NO_CALENDAR =
  'No earnings window or theme is served across the universe: the event calendar holds 8 rows and earnings dates are read one symbol at a time.'
/**
 * Pine library scripts (research 0.173.0, W6): a chip passes a name when the
 * script's buy or sell plot fired on it in the last PINE_WITHIN_SESSIONS
 * sessions (`/research/pine/signals`). Ids are `pine:<script>:<side>`.
 */
export const PINE_WITHIN_SESSIONS = 5
export const PINE_SCREEN_SCRIPTS = PINE_BUILTINS
export function pineChipId(script: string, side: 'buy' | 'sell'): string {
  return `pine:${script}:${side}`
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
      { id: 'earn_gt_10d', label: 'Earnings > 10d', missing: NO_CALENDAR },
      { id: 'earn_10_30d', label: 'Earnings 10–30d', missing: NO_CALENDAR },
      { id: 'earn_lt_10d', label: 'Earnings < 10d', missing: NO_CALENDAR },
      { id: 'news_theme', label: 'In a live theme', missing: NO_CALENDAR },
      { id: 'no_event_30d', label: 'No event 30d', missing: NO_CALENDAR },
      ...NARRATIVE_CONDITIONS.map((c) => ({ id: c.id, label: c.label, narrative: c.desc, fromSet: true })),
    ],
  },
  {
    id: 'pine',
    title: 'Pine signals',
    mode: `any selected · fired in the last ${PINE_WITHIN_SESSIONS} sessions`,
    kind: 'any',
    missing: null,
    chips: PINE_SCREEN_SCRIPTS.flatMap((p) =>
      (['buy', 'sell'] as const).map((side) => ({
        id: pineChipId(p.id, side),
        label: `${p.label} ${side === 'buy' ? '↑' : '↓'}`,
        title: `Pine library script ${p.id}: its ${side} plot fired in the last ${PINE_WITHIN_SESSIONS} sessions`,
        fromSet: true,
      }))
    ),
  },
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
    missing: NO_CALENDAR,
  },
  {
    id: 'p-seller',
    label: 'Premium seller',
    k: 'IV · no print',
    title: 'Rich IV, VRP, liquid options and no earnings inside 10 days',
    screen: { on: { ivr_ge_40: true, vrp_pct_ge_70: true, oi_liquid: true, earn_gt_10d: true }, mins: { trend: 7 } },
    missing: `${NO_LIQUIDITY} The earnings veto has no date to read either.`,
  },
]

/** The old screener's opening criteria, for `/research/screener` and `/research/explorer`. */
export const LEGACY_SCREEN: ScreenState = { on: {}, mins: { trend: 8 } }
