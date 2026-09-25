/**
 * The Options & Quant kit — what it specifies, and where this app answers it today.
 *
 * `Docs Options Kit.dc.html` is a sample page for `Dense UI Options Kit Spec.md`,
 * and the spec opens with the fact that decides how this page is built:
 *
 * > **Status: spec settled, not scheduled** — not a current construction item.
 * > `@bifrost/ui` is 0.4.11; the §5 migration list and §6 rollout (0.5.0,
 * > finance/quant/trading/layout groups) have not started.
 *
 * Measured 2026-09-23: that is still true. `@bifrost/ui` is 0.4.11 and has no
 * `finance/`, `quant/` or `trading/` directory. So a gallery that rendered
 * `PnlValue` or `GreekCell` would be rendering nothing — the components do not
 * exist, on either side.
 *
 * What does exist is the other half of the spec's own §5 table: **all eight**
 * of the trade-frontend sources it lists are real files in this repo. So the
 * honest page is a join, not a gallery of promises — each primitive shows the
 * thing this app renders today beside the signature the kit will give it, and
 * the ones with nothing behind them say so rather than being drawn empty.
 *
 * `here.path` is asserted to exist by `kitInventory.test.ts`. A page claiming
 * "this is already built, here" is worth exactly as much as its ability to
 * notice when that stops being true.
 */

/** The four directories §2 of the spec adds to `@bifrost/ui`. */
export type KitGroup = 'finance' | 'quant' | 'trading' | 'layout'

export const KIT_GROUP_LABEL: Record<KitGroup, string> = {
  finance: 'finance · the numbers on an option',
  quant: 'quant · reading a sample',
  trading: 'trading · intent, never execution',
  layout: 'layout · the line under the header',
}

/**
 * The installed version lives in `@/lib/design/uiVersion` (the UI Design
 * System page reads it too) and is pinned by the test. The kit's directories
 * are still absent, so the standing above holds.
 */
export { UI_VERSION_NOW } from '@/lib/design/uiVersion'
export const UI_VERSION_TARGET = '0.5.0'

export interface KitPrimitive {
  name: string
  group: KitGroup
  /** Where §2 of the spec files it inside `@bifrost/ui`. */
  kitPath: string
  /** The signature from the sample page's own code-map. */
  signature: string
  note: string
  /**
   * What answers this in the app today, or `null` when nothing does.
   *
   * `path` is a real file in this repo; `what` names the export, because the
   * kit's contribution is often a *name*, not a capability — `GreekCell`'s
   * accent rule is already `greeksDeltaCellClass`, character for character.
   */
  here: { path: string; what: string } | null
}

export const KIT_PRIMITIVES: readonly KitPrimitive[] = [
  // ── finance ────────────────────────────────────────────────────────────
  {
    name: 'PnlValue',
    group: 'finance',
    kitPath: 'src/finance/PnlValue.tsx',
    signature:
      'PnlValue({ value: number | null, pct?: number | null, kind?: "realised" | "unrealised", size?: "cell" | "kpi", digits?: 0 | 2 })',
    note: 'Absorbs three things that are separate here. null → "—" muted, never 0; a zero is muted too.',
    here: { path: 'src/components/data-display/PnlDisplay.tsx', what: 'PnlCell · InlinePnl' },
  },
  {
    name: 'PctDelta',
    group: 'finance',
    kitPath: 'src/finance/PctDelta.tsx',
    signature: 'PctDelta({ value: number | null, digits?: 1 | 2 })',
    note: 'Sign explicit, mono, direction colour, no arrow glyphs. The formatting half is already shared.',
    here: { path: 'src/lib/format.ts', what: 'fmtPctSigned' },
  },
  {
    name: 'GreekCell',
    group: 'finance',
    kitPath: 'src/finance/GreekCell.tsx',
    signature:
      'GreekCell({ greek: "delta" | "gamma" | "theta" | "vega" | "rho", value: number | null, highlightAtm?: boolean })',
    note: 'Only |Δ| ∈ [0.4, 0.6] takes the accent — which is already this app\'s rule, to the digit. What the kit adds is a component instead of a class.',
    here: {
      path: 'src/pages/research/analyze/greeks/greeksUi.ts',
      what: 'greeksDeltaCellClass',
    },
  },
  {
    name: 'IvRankStrip',
    group: 'finance',
    kitPath: 'src/finance/IvRankStrip.tsx',
    signature:
      'IvRankStrip({ rank: number | null, label?: "rich" | "mid" | "cheap", secondary?: { rank, label } })',
    note: 'The spec\u2019s \u00a75 moves this up as-is, and \u00a71 says the rail is grey with a lime marker. This app\u2019s component is neither: its rail is a three-band green / amber / red, which is the very rule \u00a71 retires. Moving it unchanged would carry that rule into @bifrost/ui.',
    here: { path: 'src/components/charts/IvRankStrip.tsx', what: 'IvRankStrip' },
  },
  {
    name: 'DteCell',
    group: 'finance',
    kitPath: 'src/finance/DteCell.tsx',
    signature: 'DteCell({ expiry: string | Date, asOf?: Date, dangerBelow?: 3, warnBelow?: 10 })',
    note: 'A DenseTag whose variant comes from thresholds held as props, so the Plans page and the chain may disagree on purpose. DTE is plain text everywhere here.',
    here: null,
  },
  {
    name: 'ContractLabel · parseOcc',
    group: 'finance',
    kitPath: 'src/finance/ContractLabel.tsx + src/finance/occ.ts',
    signature:
      'ContractLabel({ occ, format?: "full" | "compact", showDte?, asOf? }) · parseOcc(occ): { underlying, expiry, strike, right }',
    note: 'The parser is a pure module so a table can sort on strike or expiry. Underlying lime, contract sky, never truncated.',
    here: null,
  },
  {
    name: 'LegStack',
    group: 'finance',
    kitPath: 'src/finance/LegStack.tsx',
    signature:
      'LegStack({ legs: Array<{ side, qty, occ?, symbol?, price }>, multiplier?: 100, net?: { label, value } })',
    note: 'The ticket view Plans, Desk cards, the strike-ladder builder and Instance detail would all share. Its net line is a PnlValue.',
    here: null,
  },
  {
    name: 'moneynessRowClass',
    group: 'finance',
    kitPath: 'src/finance/moneyness.ts',
    signature:
      'moneynessRowClass(strike, spot, right: "C" | "P", atmBand?: 0.005): "itm" | "atm" | "otm"',
    note: 'Classes on a DenseTableRow, not a component. ATM is a 1px lime inset rule, ITM bg-secondary, OTM nothing — never text colour.',
    here: null,
  },

  // ── quant ──────────────────────────────────────────────────────────────
  {
    name: 'StatGrid',
    group: 'quant',
    kitPath: 'src/quant/StatGrid.tsx',
    signature:
      'StatGrid({ stats: Array<{ label, value, note?, tone? }>, n: number, minEvents?: 5, thinBelow?: 30 })',
    note: 'Owns the ConfidenceTag, and below minEvents forces every tone to muted so no caller can colour a two-event win rate.',
    here: { path: 'src/components/research/BacktestRunResultCard.tsx', what: 'SummaryTile' },
  },
  {
    name: 'ConfidenceTag',
    group: 'quant',
    kitPath: 'src/quant/ConfidenceTag.tsx',
    signature:
      'ConfidenceTag({ n: number, minEvents?: 5, thinBelow?: 30, unit?: "events" | "trades" | "days" })',
    note: 'Mandatory beside any rate, with the count inside the label. Nothing in this app currently makes that mandatory.',
    here: null,
  },
  {
    name: 'HitRateBar',
    group: 'quant',
    kitPath: 'src/quant/HitRateBar.tsx',
    signature: 'HitRateBar({ wins: number, losses: number, neutral?: number, height?: 6 | 8 })',
    note: 'Direction colours on the segments, because they are signed outcomes; grey below minEvents.',
    here: null,
  },
  {
    name: 'EquityCurve · DrawdownBand',
    group: 'quant',
    kitPath: 'src/quant/EquityCurve.tsx',
    signature:
      'EquityCurve({ series: number[], benchmark?: number[], height?: 96, showDrawdown?: boolean })',
    note: 'Cumulative P&L with includeZero on, through linearScale; empty or failed goes to DataStateBlock and never returns null.',
    here: null,
  },
  {
    name: 'WalkForwardTimeline',
    group: 'quant',
    kitPath: 'src/quant/WalkForwardTimeline.tsx',
    signature:
      'WalkForwardTimeline({ windows: Array<{ is_start, is_end, oos_start, oos_end, oos_return, oos_sharpe }>, valueKey? })',
    note: 'Maps one to one onto engines/backtest/walk_forward.Window.to_dict(). Grey IS bars, direction-coloured OOS bars.',
    here: null,
  },
  {
    name: 'Sparkline',
    group: 'quant',
    kitPath: 'src/quant/Sparkline.tsx',
    signature:
      'Sparkline({ values: number[], kind?: "line" | "bars", width?: 100, height?: 20, lastPoint?: boolean })',
    note: 'Bars are signed against a fixed zero baseline; a line has no baseline. Moves out of trade-frontend as-is.',
    here: { path: 'src/components/charts/DenseSparkline.tsx', what: 'DenseSparkline' },
  },
  {
    name: 'Histogram',
    group: 'quant',
    kitPath: 'src/quant/Histogram.tsx',
    signature:
      'Histogram({ values: number[], bins?: 12, domain?: [number, number], markers?: { zero?, median? } })',
    note: 'Two greys split at zero, grey zero rule, lime median. Direction colour is deliberately absent — a distribution is not a P/L.',
    here: null,
  },

  // ── trading ────────────────────────────────────────────────────────────
  {
    name: 'OrderStateTag · orderState',
    group: 'trading',
    kitPath: 'src/trading/OrderStateTag.tsx + src/trading/orderState.ts',
    signature:
      'type OrderState = "draft" | "blocked" | "intended" | "placed_by_hand" | "filled" | "linked" | "orphan" | "expired" · OrderStateTag({ state: OrderState })',
    note: 'A closed union, so TypeScript refuses "working" or "submitted" — broker states stay in the Live pane\'s own type. This app\'s plan status is a different set; see the vocabulary panel.',
    here: { path: 'src/lib/schemas/strategyPlan.ts', what: 'status · effective_status' },
  },
  {
    name: 'SideTag',
    group: 'trading',
    kitPath: 'src/trading/SideTag.tsx',
    signature: 'SideTag({ side: "BTO" | "STO" | "BTC" | "STC" | "BUY" | "SELL" | "HOLD" })',
    note: 'Sell filled, buy outlined, and explicitly no direction colour. The four-letter vocabulary appears nowhere in this app.',
    here: null,
  },
  {
    name: 'FillProgress',
    group: 'trading',
    kitPath: 'src/trading/FillProgress.tsx',
    signature:
      'FillProgress({ filled: number, total: number, avgPrice?: number | null, label?: ReactNode })',
    note: 'A lime bar, and the one accent in its row.',
    here: null,
  },
  {
    name: 'RiskGauge',
    group: 'trading',
    kitPath: 'src/trading/RiskGauge.tsx',
    signature:
      'RiskGauge({ committedPct: number, intendedPct?: number, ceilingPct: number, caption?: {…} })',
    note: 'Solid, hatched sky, red rule. Fed by the Plans cash-margin maths, with already-intended positions counted before drafts.',
    here: null,
  },
  {
    name: 'AccountChip',
    group: 'trading',
    kitPath: 'src/trading/AccountChip.tsx',
    signature: 'AccountChip({ account: string, size?: "cell" | "pill" })',
    note: 'A neutral mono chip, replacing the purple category pill some pages reach for to say HOST or SEC.',
    here: null,
  },

  // ── layout ─────────────────────────────────────────────────────────────
  {
    name: 'ContextBar',
    group: 'layout',
    kitPath: 'src/layout/ContextBar.tsx',
    signature:
      'ContextBar({ symbol?: { value, scope: "scope" | "held", note? }, asOf?, quality?: { flag, judgedBy: "Ops", href }, account?, freshness?: { lamp, text }, children? })',
    note: 'One line under PageHeader. The symbol chip is the Shell v2 chip — scope solid, held at 55%. Replaces the research bar and the per-page account segments.',
    here: { path: 'src/components/research/ResearchContextBar.tsx', what: 'ResearchContextBar' },
  },
] as const

// ─── The six colour channels (§1) ──────────────────────────────────────────

export interface ChannelSwatch {
  token: string
  /** A live CSS custom property, or `null` when the kit has yet to land one. */
  varName: string | null
  /** The literal, for a swatch with no variable to read. */
  color?: string
}

export interface ColourChannel {
  id: string
  name: string
  swatches: readonly ChannelSwatch[]
  on: string
  never: string
}

export const COLOUR_CHANNELS: readonly ColourChannel[] = [
  {
    id: 'direction',
    name: 'Direction',
    swatches: [
      { token: '--color-profit · green', varName: '--color-profit' },
      { token: '--color-loss · red', varName: '--color-loss' },
      { token: '--color-unrealized · orange', varName: '--color-unrealized' },
    ],
    on: 'Numbers only: P/L, % change, OOS return, signed bars.',
    never:
      'Tags, borders, backgrounds, side labels. Loss red and lamp red are split by form, not shade — lamp colours sit on dots and tags, direction colours on signed mono numbers (contract §14.7). Unrealized takes the whole column in orange, both signs, plus an UNREALIZED mark.',
  },
  {
    id: 'state',
    name: 'State',
    swatches: [
      { token: 'lamp-green', varName: null, color: '#16a34a' },
      { token: 'lamp-yellow', varName: null, color: '#ca8a04' },
      { token: 'lamp-red', varName: null, color: '#dc2626' },
      { token: 'lamp-gray', varName: null, color: '#64748b' },
    ],
    on: 'StatusLamp, DenseTag variants, DTE, order state, sample confidence.',
    never: 'Raw emerald or amber classes. Unknown goes grey, never red — red is reserved for a fault.',
  },
  {
    id: 'accent',
    name: 'Accent',
    swatches: [{ token: '--primary', varName: '--primary' }],
    on: 'One per view: the selected route, the primary button, an ATM Δ, a last point, fill progress, an IV marker.',
    never: 'A second element in the same view.',
  },
  {
    id: 'entity',
    name: 'Entity',
    swatches: [
      { token: 'entity-symbol · lime', varName: '--color-entity-symbol' },
      { token: 'entity-option · sky', varName: '--color-entity-option' },
    ],
    on: 'Identity columns: a stock symbol, an option contract.',
    never: 'Category tags. A contract string is never an Option-Category tag.',
  },
  {
    id: 'iv-level',
    name: 'IV level',
    swatches: [
      { token: 'rail · secondary', varName: '--secondary' },
      { token: 'marker · lime', varName: '--primary' },
    ],
    on: 'The IvRankStrip rail. The words rich / mid / cheap carry the reading.',
    never:
      'Green for cheap or amber for rich — that is the old greeksIvCellClass rule, which the kit retires.',
  },
  {
    id: 'moneyness',
    name: 'Moneyness',
    swatches: [
      { token: 'ITM · bg-secondary', varName: '--secondary' },
      { token: 'ATM · 1px lime rule', varName: '--primary' },
      { token: 'OTM · page ground', varName: '--background' },
    ],
    on: 'Rows: the strike ladder, chain quotes, leg tables.',
    never: 'Text colour. The strike number stays ink.',
  },
] as const

// ─── Rule 1: a rate without its sample size is not a reading ───────────────

export type ConfidenceLevel = 'noise' | 'thin' | 'usable'

export interface ConfidenceReading {
  level: ConfidenceLevel
  /** DenseTag variant. */
  variant: 'danger' | 'warning' | 'success'
  label: string
  note: string
  /** Below `minEvents` no rate is coloured and no Sharpe is shown (§4 rule 1). */
  colours: boolean
}

export const MIN_EVENTS = 5
export const THIN_BELOW = 30

export function confidenceReading(
  n: number,
  unit = 'events',
  minEvents: number = MIN_EVENTS,
  thinBelow: number = THIN_BELOW,
): ConfidenceReading {
  if (n < minEvents) {
    return {
      level: 'noise',
      variant: 'danger',
      label: `${n} ${unit} · noise`,
      note: `Below ${minEvents} ${unit} no rate is shown in colour and Sharpe is withheld.`,
      colours: false,
    }
  }
  if (n < thinBelow) {
    return {
      level: 'thin',
      variant: 'warning',
      label: `${n} ${unit} · thin`,
      note: 'Rates are coloured, but the tag travels with every export of this grid.',
      colours: true,
    }
  }
  return {
    level: 'usable',
    variant: 'success',
    label: `${n} ${unit} · usable`,
    note: `At least ${thinBelow} ${unit}. Still one strategy and one event definition, not a portfolio.`,
    colours: true,
  }
}

// ─── What the page can say about itself ────────────────────────────────────

export interface KitStanding {
  total: number
  /** Primitives this app already renders under another name. */
  here: number
  /** Primitives with nothing behind them on either side. */
  owed: number
  byGroup: { group: KitGroup; label: string; total: number; here: number }[]
}

export function kitStanding(
  primitives: readonly KitPrimitive[] = KIT_PRIMITIVES,
): KitStanding {
  const groups: KitGroup[] = ['finance', 'quant', 'trading', 'layout']
  const here = primitives.filter(p => p.here != null).length
  return {
    total: primitives.length,
    here,
    owed: primitives.length - here,
    byGroup: groups.map(group => {
      const rows = primitives.filter(p => p.group === group)
      return {
        group,
        label: KIT_GROUP_LABEL[group],
        total: rows.length,
        here: rows.filter(p => p.here != null).length,
      }
    }),
  }
}

/**
 * The order vocabulary, both sides.
 *
 * The kit's union is the app's plus four and minus one, which is the whole
 * migration in one line: `blocked`, `placed_by_hand`, `linked` and `orphan`
 * are states this app cannot currently record, and `cancelled` is one the kit
 * has no word for.
 */
export const KIT_ORDER_STATES = [
  { state: 'draft', variant: 'neutral', who: 'you, in Plans' },
  { state: 'blocked', variant: 'warning', who: 'the cash / margin check' },
  { state: 'intended', variant: 'info', who: 'you confirmed the intent' },
  { state: 'placed_by_hand', variant: 'info', who: 'you, in TWS' },
  { state: 'filled', variant: 'success', who: 'the Flex import' },
  { state: 'linked', variant: 'success', who: 'fill ↔ plan ↔ instance' },
  { state: 'orphan', variant: 'neutral', who: 'a fill with no plan' },
  { state: 'expired', variant: 'neutral', who: 'the intent lapsed' },
] as const

/** Measured from `src/lib/schemas/strategyPlan.ts` — pinned by the test. */
export const APP_PLAN_STATES = [
  'draft',
  'intended',
  'expired',
  'filled',
  'cancelled',
] as const

export function orderVocabularyGap(): { onlyKit: string[]; onlyApp: string[] } {
  const kit = new Set<string>(KIT_ORDER_STATES.map(s => s.state))
  const app = new Set<string>(APP_PLAN_STATES)
  return {
    onlyKit: [...kit].filter(s => !app.has(s)),
    onlyApp: [...app].filter(s => !kit.has(s)),
  }
}
