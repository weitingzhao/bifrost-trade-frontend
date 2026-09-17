/**
 * Every route this app renders, in one table.
 *
 * The header used to carry a 61-line map of pathname → title, and it was the
 * only thing in the app that knew a page had a name. Anything else that needs
 * to name a route — a breadcrumb, a command palette, a recent-pages list — had
 * to either duplicate that map or invent its own. This is that map, promoted to
 * the shared place, and widened by the one thing a title alone cannot say:
 * where the page sits.
 *
 * `label` is the page's own name — the leaf. `crumbs` are its ancestors,
 * outermost first, and never repeat the label. So the header can render
 * `System / Runtime / API Health` from one entry, where before it rendered
 * the hand-punctuated string `Settings · API Health`.
 *
 * Redirect-only paths are in here too, each carrying where it goes. They render
 * for one frame before the `<Navigate>` fires, and naming them keeps that frame
 * from flashing the fallback. `router.tsx` builds its redirect rows from them,
 * and the Omnibar searches them so a retired name still finds the page.
 */
import { matchPath } from 'react-router-dom'
import type { DesignTag } from '@/lib/design/tag'

export interface RouteEntry {
  /** Absolute path, exactly as `router.tsx` resolves it. May carry `:params`. */
  path: string
  /** The page's own name. */
  label: string
  /** Ancestors, outermost first. Omitted for top-level pages. */
  crumbs?: readonly string[]
  /**
   * The page reads `?symbol=`. Set from what the code actually does — a page
   * that only receives symbol-carrying links is not scoped; a page that reads
   * the param and narrows itself is.
   */
  symbolScope?: boolean
  /**
   * Unit of analysis, which is not the same question as where the data comes
   * from: `underlying` is one answer per symbol, `contract` is an answer per
   * strike x expiry. The sidebar marks the row `stk` or `opt` from this.
   */
  scope?: 'underlying' | 'contract'
  /**
   * The path only redirects, and this is where to.
   *
   * The target lives here rather than in `router.tsx` because it was in both:
   * 43 hand-written `<Navigate>` rows against 43 `redirect` rows, kept in step
   * by hand (`Docs Gaps.dc.html` F5). The router derives its rows from this
   * now, so a rename is one edit and the two cannot drift.
   *
   * The row keeps its own `label` and `crumbs`: they name what the path used
   * to be, which is both what the breadcrumb shows during the frame before the
   * redirect fires, and what the Omnibar searches so an old name still finds
   * the page (F5's `aliases`, kept on the old name so the name survives).
   *
   * May carry a query or hash — `/system/coverage?view=option`. Never another
   * redirect: `routeRegistry.test.ts` fails a two-hop.
   */
  redirect?: string
  /**
   * Where this page stands against `design/trade`.
   *
   * Written only for the exceptions: a page the design dissolves elsewhere
   * (`moving`), one it has no home for (`staging`), and one already walked
   * (`aligned`). Everything else is `pending` by derivation — see
   * `src/lib/design/adoption.ts`, and `/docs/design-adoption` for the readout.
   */
  design?: DesignTag
}

// Market is a fold inside Research, not a group of its own — see `navConfig.ts`.
const MARKET = ['Research', 'Market'] as const
const PORTFOLIO = ['Portfolio'] as const
const TRADE = ['Trade'] as const
const RISK = ['Risk'] as const
const RESEARCH = ['Research'] as const
const AUTOPILOT = ['Research', 'Autopilot'] as const
const COPILOT = ['Research', 'Copilot'] as const
const DISCOVER = ['Research', 'Discover'] as const
const ANALYZE = ['Research', 'Analyze'] as const
const VALIDATE = ['Research', 'Validate'] as const
const DATA = ['Research', 'Data'] as const
const STRATEGY = ['Strategy'] as const
// One group, three folds. `/settings` and `/operations` were two names for one
// thing — the machine under the desk — and Settings additionally ran a second
// navigation shell of its own. Both are `/system/*` now; the old paths redirect.
const SYSTEM_DATA = ['System', 'Data'] as const
const SYSTEM_RUNTIME = ['System', 'Runtime'] as const
const SYSTEM_CONFIG = ['System', 'Configuration'] as const
const DOCS = ['System', 'Reference'] as const

export const ROUTES: readonly RouteEntry[] = [
  // ── Research · home and seats ──────────────────────────────────────────
  // The design has Overview and the seat homes but no group root, and answered
  // the open question on 2026-09-15: `/research` is Overview. It forwards
  // rather than rendering a landing of its own, so the group has one root and
  // one page behind it.
  { path: '/research', label: 'Research', redirect: '/research/overview' },
  { path: '/research/overview', label: 'Overview', crumbs: RESEARCH },
  { path: '/research/workbench', label: 'Workbench', crumbs: RESEARCH },

  // ── Research · Autopilot ───────────────────────────────────────────────
  { path: '/research/loop/harness', label: 'Autopilot', crumbs: RESEARCH },
  {
    path: '/research/loop/decisions',
    label: 'Decision Inbox',
    crumbs: AUTOPILOT,
    design: {
      state: 'aligned',
      rev: '2026-09-15.5',
      note: 'Walked 2026-09-13 against Research Autopilot Decisions.dc.html (OLD) and the design response of that day; digest actions, kind colour and the approval strip changed 2026-09-14. Owner signed off on STG 2026-09-15. Re-stamped on Rev 2026-09-15.5 (no construction change to the page).',
    },
  },
  { path: '/research/loop/hypotheses', label: 'Hypothesis Board', crumbs: AUTOPILOT },
  { path: '/research/loop/candidates', label: 'Candidate Pool', crumbs: AUTOPILOT },
  { path: '/research/loop/objectives/:objectiveId', label: 'Objective', crumbs: AUTOPILOT },
  { path: '/research/loop/runs/:runId', label: 'Loop Run', crumbs: AUTOPILOT },

  // ── Research · Copilot (a seat-free fold since 2026-09-14 — §11.0) ─────
  // The menu row and crumbs read Research › Copilot › Desk; the page's own
  // title stays "Copilot Desk" (Design ②: the two are compatible).
  {
    path: '/research/copilot',
    label: 'Desk',
    crumbs: COPILOT,
    design: {
      state: 'aligned',
      rev: '2026-09-15.5',
      note: 'Walked 2026-09-13 against Research Copilot.dc.html (REDO), six steps built; Threads Origin / Symbol / Writes / Cost and Ran today next tick restored 2026-09-14. Owner 2026-09-15: three tiles stay dissolved (Design ⑫); Desk is dark-only (R8). Owner signed off on STG 2026-09-15 after L1/L2.',
    },
  },
  // In the design registry since 2026-09-14 (Owner kept it — a morning agent's
  // written product, filed under the Copilot fold); its state derives from the
  // snapshot now, no tag needed.
  { path: '/research/daily-brief', label: 'Daily Brief', crumbs: COPILOT, symbolScope: true },
  {
    path: '/research/copilot/trading',
    label: 'Trading Copilot',
    crumbs: COPILOT,
    design: {
      state: 'aligned',
      rev: '2026-09-15.5',
      note: 'Walked 2026-09-15 against Research Copilot.dc.html (The book / all starters). The page is the prompt catalogue; the dock The book group uses the same TRADE_QUESTIONS (C2-c). Owner signed off on STG 2026-09-15 after L1/L2.',
    },
  },
  {
    path: '/research/agent-personas',
    label: 'Agent Personas',
    crumbs: COPILOT,
    design: {
      state: 'aligned',
      rev: '2026-09-15.5',
      note: 'Walked 2026-09-15 against Research Copilot.dc.html (Personas) plus C2-b Tools/Cannot. Origin sentence and default chip rewritten 2026-09-15 (G2): answers go through triage first; the chip is a page default until then; this page does not pick the live stream. Owner signed off on STG 2026-09-15 after L1/L2.',
    },
  },

  // ── Research · Workbench · Discover ────────────────────────────────────
  { path: '/research/explorer', label: 'Stock Explorer', crumbs: DISCOVER, scope: 'underlying' },
  { path: '/research/scan', label: 'Option Scan', crumbs: DISCOVER, scope: 'contract' },
  {
    path: '/research/momentum-radar',
    label: 'Momentum Radar',
    crumbs: DISCOVER,
    design: { state: 'moving', note: 'Stock Explorer — a tab on it, page retires (Docs Gaps B4)' },
  },
  {
    path: '/research/sepa-daily-core',
    label: 'SEPA Daily Core',
    crumbs: DISCOVER,
    design: { state: 'moving', note: 'Stock Explorer — a tab on it, page retires (Docs Gaps B4)' },
  },

  // ── Research · Workbench · Analyze ─────────────────────────────────────
  // One name, every face. The six pages this replaced are `?tab=` on it.
  {
    path: '/research/symbol',
    label: 'Symbol',
    crumbs: ANALYZE,
    symbolScope: true,
    scope: 'underlying',
    // rev is the package's own label at the walk; the design did not bump it
    // for the 2026-09-13 and 2026-09-14 rounds.
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: 'Walked 2026-09-14 against Research Symbol.dc.html (REDO); my legs, since-you-looked, Plan this and the Structure panel built. Owner signed off on STG 2026-09-15. Re-stamped on Rev 2026-09-15.5 (no construction change to the page). Re-stamped on Rev 2026-09-17.1 (§14.7 colours only: green / red direction, unrealized orange, applied in e05dce2); Owner re-signed after the colour look 2026-09-17.',
    },
  },

  // ── Research · Workbench · Validate ────────────────────────────────────
  { path: '/research/signal-decay', label: 'Signal Decay', crumbs: VALIDATE },
  { path: '/research/signal-decay/:symbol', label: 'Signal Decay', crumbs: VALIDATE },
  {
    path: '/research/backtest',
    label: 'Backtest',
    crumbs: VALIDATE,
    symbolScope: true,
    design: {
      state: 'moving',
      note: 'Lab — Docs Index marks it LAB: "handed to lab (2026-09-12.3), the Trade original is deleted". Lab is not built here, so it stays until it is; absent from Trade is not retired',
    },
  },

  // ── Research · Workbench · Data ────────────────────────────────────────
  { path: '/research/lens-coverage', label: 'Lens Coverage', crumbs: DATA },
  { path: '/research/signal-health', label: 'Signal Health', crumbs: DATA },
  { path: '/research/watchlist', label: 'Stock Watchlist', crumbs: DATA },
  {
    path: '/research/stock-screener',
    label: 'Stock Screener',
    crumbs: DATA,
    design: {
      state: 'staging',
      note: "The design's Discover › Screener has Stocks (= our Explorer) and Contracts; /research/screener there is the screener home, which is our Option Screener. Same paths, different meanings — needs untangling",
    },
  },
  // The design's Discover › Screener has Stocks and Contracts under it, and
  // this page is Contracts (Design 2026-09-15). `/research/screener` is the
  // design's screener home, which the app has not built, so the page moves off
  // that path rather than squatting on it.
  { path: '/research/contract-screener', label: 'Option Screener', crumbs: DISCOVER },
  { path: '/research/greeks', label: 'Contract Greeks', crumbs: DATA, scope: 'contract' },

  // ── Research · Market ──────────────────────────────────────────────────
  { path: '/market/live', label: 'Live', crumbs: MARKET },
  { path: '/research/event-radar', label: 'Event Radar', crumbs: MARKET },

  // ── Portfolio ──────────────────────────────────────────────────────────
  {
    path: '/portfolio/performance',
    label: 'Performance',
    crumbs: PORTFOLIO,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: 'Walked 2026-09-17 against Portfolio Performance.dc.html at that page rev, rendered side by side with the app on local DEV (:5173). Built: header with four Derivations (Options mode, Equity growth, Day cell · R/U/N, On the fly) on the shared derivation block; filter strip with a scope note (active days, trades, capital base); Reading as layer chips that switch the curve plus Net cash flow shown as excluded, and the eleven range-level metrics in one panel (Design F1); Return basis marked designed · not wired, with balance rows not recorded, both return methods not computed, and the formula Return on capital base uses today; Shape as panels — equity growth with the legend under the curve and a Fixed income range total, the options path bridge with §14.4 contract tokens; the calendar with one slot beside it, Summary by class for the month or the clicked day’s records with previous / next / close; Audit as a word-and-code table where a day row opens its records; On the fly as a collapsible panel. Production kept (diverged: production richer, intentional): the chart’s hover read-out and % unit, 3 Years range, the bridge’s resize handle, Stocks / FI / Cash-like calendar layers and their records, the Open inventory drill, On the fly per-sec-type realized / unrealized strip with a Date column and account, exec id and time in the row title. Defects fixed on the way: Win rate printed a fraction as a percent and divided by every fill; Realized read a field the API does not send (Reading and On the fly); Open option dates and contract names off §14.4. §14.6: Audit 820 and Records 720 hold at their floors; the bridge fills table rises from 560 to 640. No Month range and no AsofTag yet. Audit and On the fly re-aligned the same day (panels fill the row, prototype inks and line heights). Owner signed off the build 2026-09-17 on local DEV (:5173) at this rev; Rev 2026-09-17.1 (§14.7: green / red direction, unrealized orange) was applied the same day (e05dce2) and the Owner re-signed after the colour look.',
    },
  },
  {
    path: '/portfolio/positions',
    label: 'Positions',
    crumbs: PORTFOLIO,
    symbolScope: true,
    design: {
      state: 'reviewing',
      rev: '2026-09-17.1',
      note: 'Walked 2026-09-17 against Portfolio Positions.dc.html at page rev 2026-09-17.1, rendered side by side with the app on local DEV (:5173). Built in five passes: the page card, PageHeader with the FETCHED marker (judged by monitor, the Accounts IB clock, not a second one), the position count and what Ask Copilot carries; the scope strip as a panel (Scope caption, account toggles, symbol and expiry, TIGHT %, copy link, off-track holdings, N in scope) — shared with Backing & Model, so both pages moved; Book / Pressure points (folds) / Lines tier headings, each band two panels side by side from 920px of content. Book: the cockpit as a panel with the firing checks as chips (amber for risk, grey for data quality, each with its landing word) and the quiet ones behind a count, four gauge rows (segments green, amber from 3/4) whose How opens under its own line, and demand / supply as two cells; margin by account with the bar green to the 75% line and amber past it; the Backing pool as Design F3\'s summary (variant=summary) with the ring left on Backing & Model. Pressure points: the short-leg panel with the leg count, credit range and pricing in its header, a 250px plot with half-filled dots, and a selection card carrying the leg\'s own numbers; Room to add as a panel, pressure after amber from 50%. Lines: one panel whose header is the toolbar; the strategies table in the prototype\'s two-line heads and plain inks at the 940 floor with no clipped cell; Options and Coverage subtables captioned and framed (1240 each, above the design\'s 1160); Contracts and Expiries without their own headings. The slot beside the grid carries the three faces — Contract (the existing contract detail), Risk profile (moved out of the expanded row, with the way to the instance sheet), Ledger (all five writes named, on the picked fill). Production kept (diverged: production richer, intentional): the instance sheet and stock inspector as drawers, the Options subtable\'s fourteen columns and per-fill actions, the risk map\'s y ticks, size legend, month band and unpriced list, the derivation trees behind margin and Room to add, three lines views with their filters. Deliberate contract calls: strategy names uncoloured and symbols sky mono (§14.4) where the prototype paints them lime and soft; naked cover and ITM counts amber, never red (§14.7); contract names carry strike and right and every expiry reads DDMMMYY. Not built: the prototype\'s variable trees behind the four gauges (the How keeps production\'s lines and rows), the Risk Margin / Risk Portfolio / Risk Stress links (those pages do not exist yet), and the five ledger writes still open their existing forms rather than living inside the face. Owner to look before aligned.',
    },
  },
  {
    path: '/portfolio/pnl-explain',
    label: 'P&L Explain',
    crumbs: PORTFOLIO,
    design: {
      state: 'reviewing',
      rev: '2026-09-17.1',
      note: 'Walked 2026-09-17 against Portfolio PnL Explain.dc.html at page rev 2026-09-17.1, on local DEV (:5173). Built from nothing — the app had no P&L Explain page. The design writes it as two phases and this build keeps the line exactly where the design draws it. Data readiness was measured on DEV first and the finding is that the page\'s central identity cannot be evaluated: Day P&L = \u0394 + \u0393 + vega + \u03b8 + Unexplained, where Unexplained is *defined* as the difference — taking it needs the four attributions, the four need a per-day snapshot of positions, marks and vendor Greeks, and nothing stores one. So the difference is not taken, and the tie-out band says so with an amber \u26a0 the difference is not taken rather than printing a residual the page cannot stand behind. Built live: the header with Performance\'s own range vocabulary (the same four ranges, so the citation is literally the same window) and the range in DDMMMYY; the tie-out band quoting Performance\'s figure for the window (realized plus unrealized over the four asset classes it keeps apart, \u00a714.2 — this page quotes it, it does not build a second one) beside three grey readings and what the leads do add up to; and the Leads band, which is what the design\'s Unexplained band can honestly be today — every leak the book can name on its own, each with the page that settles it: rows the canonical source has and the performance book never took in, per underlying, priced rows only carrying an amount because a zero-price row is a combo wrapper and not cash (\u2192 Trade Ledger); cash that moved in the window by the type Transfer & Pay classifies it as, with deposits and withdrawals left out because returns are ruled net of external cash flow (\u00a714.5) and carrying no symbol at all, which the row says (\u2192 Transfer & Pay); and short legs carrying no mark, a count and never an amount (\u2192 Positions). Amber past 5% of the window\'s own P&L, green inside tolerance, grey where there is no reading. Marked, not dropped: the Attribution band keeps the design\'s shape — the five component rows and the per-underlying table over the names that actually carry legs, with their real leg counts — with every figure a dash, a NO SNAPSHOT quality tag and \u26a0 needs the daily snapshot on the panel edge, never by dimming text below the contrast floor; Judgment or luck keeps the sentence that is the whole point of it and states that it needs both the snapshot and a store of hypotheses, neither of which exists, pointing at Outcome for the reading that does. These are two of the four \u00a714.6 markers that must never be silently dropped. Not built: the Hypothesis Board link (that page does not exist), and the Today / WTD / MTD windows — the app has no daily snapshot, so a sub-range narrower than Performance\'s own would read from marks that are only current. Owner to look before aligned.',
    },
  },
  {
    path: '/portfolio/backing',
    label: 'Backing & Model',
    crumbs: PORTFOLIO,
    symbolScope: true,
    design: {
      state: 'reviewing',
      rev: '2026-09-17.1',
      note: 'Walked 2026-09-17 against Portfolio Backing.dc.html at page rev 2026-09-17.1, rendered side by side with the app on local DEV (:5173). Built in four passes: the page card, PageHeader with the FETCHED marker and the position count, and a tier heading over each of the five bands (Verdict / Book against the base / Room to add / Obligations and base / Model) — the scope strip, cockpit, margin rows, Room to add and the pool are the components Positions already moved. Verdict is one panel: pool, used, the 85% house gate, the space under it, the two-house-lines note, and Model basis folded under them — the seven assumptions with the two the page does not compute on a grey lamp. The pool keeps its ring and reads its three roles as the prototype draws them. Obligations and base is one panel behind a Focus bar: a symbol clicked in either table is held in both, counted on each side, and everything else dims rather than being filtered away. The Model band takes the page\'s panel with the Hypothetical tag, which account it is for, the account control and Refresh in its header; account stress opens by default, says it is spot only under a grey lamp, and draws each scenario as a bar over its table. The slot beside the page carries the two faces: Model detail (CAR, its legs and its own stress, out of the table\'s fourth level) and Symbol (what is held behind the focused symbol, and the three ways on). Production kept (diverged: production richer, intentional): the stock inspector drawer, the obligations table\'s per-column sorts and its cash bars, the base holdings\' three role groups in one table, the model\'s IV shock column and its methodology blocks. Deliberate contract calls: naked calls, undefined risk and ITM counts are amber, never red (§14.7); unknown stays grey. Not built: the prototype\'s Cited elsewhere panel (its consumers — Risk Portfolio Exposure — do not exist yet), the Sort chips in the obligations header (the app sorts from the column heads, which is where the reader looks), and the one-day reprice link to Risk Stress. Owner to look before aligned.',
    },
  },
  {
    path: '/portfolio/outcome',
    label: 'Outcome',
    crumbs: PORTFOLIO,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: 'Walked 2026-09-17 against Portfolio Outcome.dc.html at page rev 2026-09-17.1, on local DEV (:5173). Built from nothing — the app had no Outcome page. Data readiness was measured on DEV first: the book stores no closed_at, so a finished idea is one whose option legs net to zero, and realised is the Trade Ledger\'s own signed cash flow summed over that instance\'s fills (§14.2 — this page quotes it, it does not recompute it). Built: the page card, PageHeader with a Since segment, an account segment built from the closed rows themselves and a closed count with its realised total; three tier headings (Where the ideas came from / Plan vs actual / The chain). Where the ideas came from is one panel cut by Source — Watchlist, Chosen by hand, No opportunity, read off the opportunity\'s scope_type — with n, hit rate, realised, average, worst and a sample lamp, over a floor that prints a count instead of a rate under ten closes. Plan vs actual is two panels: How they ended, with the exits the fills can tell apart (expired or written off, closed early, assigned, source did not say) each on a bar, and Did it do what the plan said, which stays dashes behind an amber needs plan storage tag. The chain is the closed-instance table (instance violet, symbol underlying in sky, Source → rule, closed DDMMMYY, days, realised, plan, exit tag), a row click tracing that idea through Idea → Plan → Fills → Close beside a Gaps panel that counts where the chain breaks. Two readings the design asks for have no data behind them on this side and say so rather than showing a zero: the screener lens that found an idea (and the backtest run that argued for it) never reaches a trade instance, and Trade Plans stores no entry, target or stop — so the Lens chip is grey and disabled and plan-vs-actual keeps its ⚠ marker (§14.6, one of the four that must never be dropped silently). Not built: the design\'s structure and play cuts, which are Review Playbook Stats\' win rate — two pages computing one rate would disagree eventually, and that page does not exist yet. A defect found on the way and fixed first: ledgerOptionExecutionCashFlowSigned netted the commission against the premium before the sign flip, so a buy\'s commission read as a discount. Three more found in the side-by-side and fixed before sign-off: the Symbol column printed the whole OCC string instead of the underlying; the group\'s Worst started from zero, so a group with no losing close read a zero it never had; and the chain\'s attribution came from the instances endpoint, which answers per account and returns nothing for the whole book — the fills carry their own opportunity, which is what it reads now. Owner signed off 2026-09-17 on local DEV (:5173) at this rev.',
    },
  },
  // ── Risk ───────────────────────────────────────────────────────────────
  {
    path: '/risk/portfolio',
    label: 'Portfolio Exposure',
    crumbs: RISK,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: 'Walked 2026-09-17 against Risk Portfolio.dc.html at page rev 2026-09-17.1, on local DEV (:5173). First page outside the Portfolio group, and the first built under the Owner\'s 2026-09-17 ruling (option b): this page does what Backing & Model does not \u2014 \u03b2-weighting, correlation and the Greeks rolled to the whole book \u2014 while per-underlying capital at risk, the payoff model and its own stress stay Backing\'s subject and are cited, never redrawn. Four sources, none of them re-derived here (\u00a714.2): \u03b2 and the correlation matrix are Research\'s (RS2, computed on read, every reading carrying the n it rests on and an as_of that is the last bar, not today); \u0394$ is the model service\'s own figure, summed across the accounts in scope; \u0393 / vega / \u0398 are the vendor legs the Positions page already prices. Built: the book totals strip (net liq, \u03b2-weighted \u0394$ with what it means per +1% SPY, \u0393, vega, \u0398, and Backing used cited from Backing\'s own judgment with its 85% gate); Net Greeks by underlying at the 1060 floor with both \u03b2 windows, share of the book\'s risk taken on absolute exposure so a short name is a slice too, and a concentration note past 35%; One bet or many, with the correlation matrix and effective independent positions (1 / \u03a3 w\u1d62w\u2c7c\u03c1\u1d62\u2c7c over \u03b2-\u0394 weights); Stress as the account-level spot axis the model service reports; By expiry, where \u0393 and \u0398 sit. Everything unreadable says so: a name the vendor could not price is counted and left out of the sums rather than added as a zero (7 of 19 on DEV read no_spot); a \u03b2 window Research could not fill reads no reading, never 1.0; a correlation pair it could not fill is dropped from the ENP rather than taken as uncorrelated, and the count of dropped pairs is printed. Marked, not dropped: the design\'s SPY \u00d7 vol stress matrix is a spot axis only, tagged \u26a0 no vol axis \u2014 the model service reports iv_stress_available: false. Not built: the named clusters (naming one needs a sector or theme per symbol, which nothing stores \u2014 correlation says how much is one bet without naming it), the gate-hit point (Backing\'s to compute, cited and never interpolated between two bars), and the Events link from By expiry (that page does not exist). Owner signed off 2026-09-17 on local DEV (:5173) at this rev.',
    },
  },
  {
    path: '/portfolio/accounts',
    label: 'Accounts',
    crumbs: PORTFOLIO,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: 'Walked 2026-09-16 against Portfolio Accounts.dc.html at that rev, on DEV data (FETCHED clocks, seven broker tiles, a dormant row). Built: two clocks that never merge Pull with Rec; IB three-state colour (teal FETCHED, grey DISCONNECTED, red DAEMON DOWN); the five-row account×source freshness table plus Ingest with Widen default off; What the broker says as seven tiles and one table instead of tabs; How it is composed as Category / Asset mix / By symbol in one panel; Holdings following the selected account with Price as of on the stock table; the right inspector as Symbol (existing stock drawer) plus Categories (CRUD, tag, delete confirm). Dormant stays visible and does not alarm. Review fixes before sign-off: the idle account reads not in use with no Cushion reading; Data from reads in ET with the date token; every figure whole at each table floor; CategoriesModal, AccountSummaryCard and OverviewDashboard removed. Owner signed off 2026-09-16 on local DEV (:5173). Re-stamped on Rev 2026-09-16.11: the design moved the role word of the idle account to not in use and the Data from string to ET with the date token, both already built that way; Owner re-signed 2026-09-16. Re-stamped on Rev 2026-09-17.1 (§14.7 colours only: green / red direction, unrealized orange, applied in e05dce2); Owner re-signed after the colour look 2026-09-17.',
    },
  },
  {
    path: '/portfolio/ledger',
    label: 'Trade Ledger',
    crumbs: PORTFOLIO,
    symbolScope: true,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: 'Walked 2026-09-16–17 against Portfolio Ledger.dc.html at that page rev (package 2026-09-16.14 @ Rev 2026-09-16.11; the page stamp did not move), on local DEV (:5173). Built: PageHeader with history · no polling; a five-tile health band from live counts (Closed P&L, Executions by source, Commissions on charged book rows, Unlinked with Options-only default, Canonical vs book); seven-dimension filters keyed on trade_date; Attribution (Strategy · Instance) and Instruments (Options · Stocks · Fixed income · Cash-like · Combos · All) chips, empty chips grey and clickable; four views and five tables pinned to the §14.6 floors; Summary months from the group\'s last trade_date; right inspector Explain · Reconcile · Links · Journal plus the existing stock Symbol drawer; Links as the option↔stock face (three columns, grey empty not a zero slippage, ±7-day candidates, remove kept with confirm); Journal Close a gap and Expired worthless with idle→confirm→done (R25) and no trade_date field (F9). Booking: ExchTrade unmarked, BOOK · expired / BOOK · assigned / BOOK / not reported by this source. Four production defects fixed first (edit wall-clock, expired-close side and net qty, opposite-leg error, stock unrealized copy). Not this round: Assignment writes (POST has no transaction_type); turning the shared edit / instance-link / delete dialogs into inspector faces (D:74, wait for Positions); Since default stays 1 month, not the prototype quarter. Visual pass 2026-09-17 after the Owner said it still looked like the old page, rendered side by side with the prototype: Which question as one panel with labelled chip rows and per-view Scope / Instance / State / Layout; Strategy and Instance as flat group rows in one panel (opening a row shows the tables beneath at once); Options with one header row and Details inside the panel; the contract token SYM DDMMMYY strike+C/P and Open option expiry in DDMMMYY (§14.4); every table measured at its floor with all rows expanded, 0 clipped and 0 spills (§14.6). Kept as built: ExchTrade Booking unmarked; the symbol ink stays the ledger sky while the site token question is open. Owner signed off 2026-09-17 on local DEV (:5173). Re-stamped on Rev 2026-09-17.1 (§14.7 colours only: green / red direction, unrealized orange, applied in e05dce2); Owner re-signed after the colour look 2026-09-17.',
    },
  },
  {
    path: '/portfolio/transfer',
    label: 'Transfer & Pay',
    crumbs: PORTFOLIO,
    design: {
      state: 'aligned',
      rev: '2026-09-17.1',
      note: 'Walked 2026-09-16 against Portfolio Transfer.dc.html at that rev, on DEV data (116 rows, 77 inside the default last-365 window). Built: the four bands — header with the "A record, not an instrument" bubble and a fetch time; What I am looking at with a count on every account, type and kind chip and the classification rules printed; 7-column detail with DDMMMYY dates, month separators carrying each month\'s events and net, and cancellations in the two states the data has; Summary by period saying it ignores the type filter on purpose; Downstream stating both that returns are ruled net of these flows and that nothing subtracts them yet. Two production defects fixed alongside: the date column read a string ts as unusable and showed 116 em dashes, and the period-over-period rate divided by the current period (Total 2026 +1628.2% → +106.5%). Review fix before sign-off: Description given the width the other columns were holding. Owner signed off 2026-09-16 on local DEV (:5173). Re-stamped on Rev 2026-09-17.1 (§14.7 colours only: green / red direction, unrealized orange, applied in e05dce2); Owner re-signed after the colour look 2026-09-17.',
    },
  },

  // ── Trade ──────────────────────────────────────────────────────────────
  {
    path: '/trade/playbook',
    label: 'Playbook',
    crumbs: TRADE,
  },
  {
    path: '/trade/plans',
    label: 'Plans',
    crumbs: TRADE,
    symbolScope: true,
    design: {
      state: 'reviewing',
      rev: '2026-09-15.5',
      note: 'Built against Trade Plans.dc.html on the new strategy_plan table (core 0.22.0): status filter, plan table, plan card with exit rules, Plan a trade form, Plan this posts a draft. Not built: Import from Inbox and Create order intent (D10), Cash / margin and Pressure after (no per-plan margin service). Owner to look before aligned.',
    },
  },

  // ── Strategy ───────────────────────────────────────────────────────────
  {
    path: '/strategy/instances',
    label: 'Instances',
    crumbs: STRATEGY,
    symbolScope: true,
    design: {
      state: 'moving',
      note: 'Trade › Rules — the Instances column of the lineage chain; its running-state summary also lands on the Desk status strip',
    },
  },
  {
    path: '/strategy/instances/:instanceId',
    label: 'Instances',
    crumbs: STRATEGY,
    symbolScope: true,
  },
  {
    path: '/strategy/win-rate',
    label: 'Win Rate',
    crumbs: STRATEGY,
    design: {
      state: 'moving',
      note: 'Review › Playbook stats — merges in as a grouping switch (by playbook rule / by structure), not a row beside it',
    },
  },
  {
    path: '/strategy/allocations',
    label: 'Allocations',
    crumbs: STRATEGY,
    design: { state: 'moving', note: 'Trade › Rules — the Allocations · gates column' },
  },
  {
    path: '/strategy/opportunities',
    label: 'Opportunity',
    crumbs: STRATEGY,
    design: { state: 'moving', note: 'Trade › Rules — the Opportunities column' },
  },
  {
    path: '/strategy/structures',
    label: 'Structure',
    crumbs: STRATEGY,
    design: { state: 'moving', note: 'Trade › Rules — the Structures column' },
  },
  {
    path: '/strategy/option-category',
    label: 'Option Category',
    crumbs: STRATEGY,
    design: {
      state: 'moving',
      note: 'Trade › Rules — no route of its own: the filter on the Structures column plus one field in the Structure edit sheet',
    },
  },
  {
    path: '/strategy/gates',
    label: 'Gates',
    crumbs: STRATEGY,
    design: {
      state: 'moving',
      note: 'Trade › Rules — shares the Allocations column; a gate is never read apart from the allocation that applies it',
    },
  },

  // ── System ─────────────────────────────────────────────────────────────
  // Design Rev 2026-09-15.13 collapsed these nine into `/system/status` plus
  // `/settings` (the Owner's OLTP/OLAP/Ops ruling): this console answers the
  // trader's three questions — can I trade, can I see, did the data land —
  // while diagnosis and operation belong to the Ops Console the sidebar footer
  // already links. The pages stay until that split is built here; each says
  // where the design sends it, so none of them sits in "to ask" without an
  // answer.
  {
    path: '/system/coverage',
    label: 'Coverage',
    crumbs: SYSTEM_DATA,
    design: {
      state: 'staging',
      note: 'Removed by design Rev 2026-09-15.13. Ingest and coverage detail is Ops Console work; this console keeps only the nightly-data lamp on /system/status.',
    },
  },
  {
    path: '/system/feed',
    label: 'Feed',
    crumbs: SYSTEM_DATA,
    design: {
      state: 'staging',
      note: 'Removed by design Rev 2026-09-15.13. Feed diagnosis moves to the Ops Console; the trade-facing half is the market-data row on /system/status.',
    },
  },
  {
    path: '/system/data-readiness',
    label: 'Data Readiness',
    crumbs: SYSTEM_DATA,
    design: {
      state: 'staging',
      note: 'Removed by design Rev 2026-09-15.13. "Did the data land" is answered by Signal Health and the nightly-data row on /system/status.',
    },
  },
  {
    path: '/system/topology',
    label: 'Topology',
    crumbs: SYSTEM_RUNTIME,
    design: {
      state: 'staging',
      note: 'Removed by design Rev 2026-09-15.13 — cluster topology is Ops Console material, not a trading question.',
    },
  },
  {
    path: '/system/daemon',
    label: 'Daemon',
    crumbs: SYSTEM_RUNTIME,
    design: {
      state: 'staging',
      note: 'Removed by design Rev 2026-09-15.13. "Can I trade" survives as the trading row on /system/status; the daemon detail is Ops.',
    },
  },
  {
    path: '/system/api',
    label: 'API Health',
    crumbs: SYSTEM_RUNTIME,
    design: {
      state: 'staging',
      note: 'Removed by design Rev 2026-09-15.13 — API latency is diagnosis, and diagnosis is the Ops Console.',
    },
  },
  {
    path: '/system/socket',
    label: 'Socket',
    crumbs: SYSTEM_RUNTIME,
    design: {
      state: 'staging',
      note: 'Removed by design Rev 2026-09-15.13 — socket state is Ops Console material; the trader sees the market-data lamp instead.',
    },
  },
  {
    path: '/system/platform',
    label: 'Platform',
    crumbs: SYSTEM_RUNTIME,
    design: {
      state: 'staging',
      note: 'Removed by design Rev 2026-09-15.13 — plugin scheduling belongs to the Ops Console.',
    },
  },
  {
    path: '/system/ib',
    label: 'IB Connection',
    crumbs: SYSTEM_CONFIG,
    design: {
      state: 'staging',
      note: 'Absorbed by design Rev 2026-09-15.13 into `/settings` (IB user, client id, account) — trader-owned configuration, not a system view.',
    },
  },

  // ── System · Reference ─────────────────────────────────────────────────
  { path: '/docs/design-adoption', label: 'Design Adoption', crumbs: DOCS },
  { path: '/docs/research-blueprint', label: 'Research Blueprint', crumbs: DOCS },
  { path: '/docs/research-calibration', label: 'Research Calibration', crumbs: DOCS },
  { path: '/docs/tech-stack', label: 'Tech Stack', crumbs: DOCS },
  { path: '/docs/ui-design-system', label: 'UI Design System', crumbs: DOCS },

  // ── Redirect-only paths ────────────────────────────────────────────────
  // They render for one frame before `<Navigate>` fires. Named so that frame
  // shows where you are going rather than the fallback.
  {
    path: '/market/watchlist',
    label: 'Stock Watchlist',
    crumbs: DATA,
    redirect: '/research/watchlist',
  },
  {
    path: '/research/sepa',
    label: 'Stock Screener',
    crumbs: DATA,
    redirect: '/research/stock-screener',
  },
  // Went to `/settings/data-readiness`, which is itself a redirect — two hops
  // and two history entries. Points at the page now; the test forbids the shape.
  {
    path: '/research/stock-data',
    label: 'Data Readiness',
    crumbs: SYSTEM_DATA,
    redirect: '/system/data-readiness',
  },
  {
    path: '/research/option-scan',
    label: 'Option Scan',
    crumbs: DISCOVER,
    redirect: '/research/scan',
  },
  // The Option Screener's own path until 2026-09-15. It stays a redirect so
  // saved links keep working, and it is left free for the design's screener
  // home — which is a different prototype, and unbuilt.
  {
    path: '/research/screener',
    label: 'Option Screener',
    crumbs: DATA,
    redirect: '/research/contract-screener',
  },
  { path: '/research/risk', label: 'Daemon', crumbs: SYSTEM_RUNTIME, redirect: '/system/daemon' },
  { path: '/research/iv-radar', label: 'IV Radar', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/vrp-lab', label: 'VRP Lab', crumbs: ANALYZE, redirect: '/research/symbol' },
  {
    path: '/research/vol-surface-lab',
    label: 'Vol Surface Lab',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/research/gex-intraday',
    label: 'GEX Intraday',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/research/opex-cycle-lab',
    label: 'OpEx Cycle Lab',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/research/analysis-model',
    label: 'Analysis Model',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/research/forecast-sessions',
    label: 'Forecast Sessions',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/research/intraday-playbook',
    label: 'Intraday Playbook',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/research/order-sentiment',
    label: 'Order Sentiment',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  // The six Analyze pages the Symbol merge retired. They carry the name they
  // were retired under, not the name they resolve to: that is what someone
  // types into the Omnibar looking for them, and the destination's own name is
  // one frame away regardless.
  { path: '/research/dossier', label: 'Dossier', crumbs: ANALYZE, redirect: '/research/symbol' },
  {
    path: '/research/vol-regime',
    label: 'Vol Regime',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/research/dealer-levels',
    label: 'Dealer Levels',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  { path: '/research/scenario', label: 'Scenario', crumbs: ANALYZE, redirect: '/research/symbol' },
  { path: '/research/flow', label: 'Flow', crumbs: ANALYZE, redirect: '/research/symbol' },
  {
    path: '/research/discovery',
    label: 'Option Discovery',
    crumbs: ANALYZE,
    redirect: '/research/symbol',
  },
  {
    path: '/portfolio/trade-history',
    label: 'Trade Ledger',
    crumbs: PORTFOLIO,
    redirect: '/portfolio/ledger',
  },
  {
    path: '/portfolio/copilot',
    label: 'Trading Copilot',
    crumbs: COPILOT,
    redirect: '/research/copilot/trading',
  },
  {
    path: '/research/playbook',
    label: 'My Trading System',
    crumbs: COPILOT,
    redirect: '/trade/playbook',
  },
  {
    path: '/portfolio/model-analysis',
    label: 'Backing & Model',
    crumbs: PORTFOLIO,
    redirect: '/portfolio/backing#model',
  },
  { path: '/portfolio/risk', label: 'Daemon', crumbs: SYSTEM_RUNTIME, redirect: '/system/daemon' },
  // The `/settings/*` and `/operations/*` names, kept working. Bookmarks and
  // anything that linked them predate the rename and must not 404.
  { path: '/settings', label: 'Coverage', crumbs: SYSTEM_DATA, redirect: '/system/coverage' },
  {
    path: '/settings/coverage',
    label: 'Coverage',
    crumbs: SYSTEM_DATA,
    redirect: '/system/coverage',
  },
  { path: '/settings/feed', label: 'Feed', crumbs: SYSTEM_DATA, redirect: '/system/feed' },
  {
    path: '/settings/data-readiness',
    label: 'Data Readiness',
    crumbs: SYSTEM_DATA,
    redirect: '/system/data-readiness',
  },
  { path: '/settings/ib', label: 'IB Connection', crumbs: SYSTEM_CONFIG, redirect: '/system/ib' },
  { path: '/settings/api', label: 'API Health', crumbs: SYSTEM_RUNTIME, redirect: '/system/api' },
  { path: '/settings/socket', label: 'Socket', crumbs: SYSTEM_RUNTIME, redirect: '/system/socket' },
  { path: '/settings/daemon', label: 'Daemon', crumbs: SYSTEM_RUNTIME, redirect: '/system/daemon' },
  {
    path: '/operations/daemon',
    label: 'Daemon',
    crumbs: SYSTEM_RUNTIME,
    redirect: '/system/daemon',
  },
  {
    path: '/operations/platform',
    label: 'Platform',
    crumbs: SYSTEM_RUNTIME,
    redirect: '/system/platform',
  },
  { path: '/settings/subscribe', label: 'Feed', crumbs: SYSTEM_DATA, redirect: '/system/feed' },
  { path: '/settings/feed/ib', label: 'Feed', crumbs: SYSTEM_DATA, redirect: '/system/feed' },
  {
    path: '/settings/coverage/overview',
    label: 'Coverage',
    crumbs: SYSTEM_DATA,
    redirect: '/system/coverage?view=watchlist',
  },
  {
    path: '/settings/coverage/overview-detail',
    label: 'Coverage',
    crumbs: SYSTEM_DATA,
    redirect: '/system/coverage?view=watchlist',
  },
  {
    path: '/settings/coverage/option',
    label: 'Coverage',
    crumbs: SYSTEM_DATA,
    redirect: '/system/coverage?view=option',
  },
  {
    path: '/settings/coverage/stock-ib',
    label: 'Coverage',
    crumbs: SYSTEM_DATA,
    redirect: '/system/coverage?view=stock',
  },
  {
    path: '/settings/daemon-app',
    label: 'Daemon',
    crumbs: SYSTEM_RUNTIME,
    redirect: '/system/daemon',
  },
  { path: '/settings/tech-stack', label: 'Tech Stack', crumbs: DOCS, redirect: '/docs/tech-stack' },
  {
    path: '/settings/ui-design-system',
    label: 'UI Design System',
    crumbs: DOCS,
    redirect: '/docs/ui-design-system',
  },
]

/** Everywhere you can actually go — what the Omnibar and any page list offer. */
export const PAGE_ROUTES: readonly RouteEntry[] = ROUTES.filter((r) => !r.redirect)

/** The old names, each with the path it now resolves to. `router.tsx` builds its rows from this. */
export const REDIRECT_ROUTES: readonly (RouteEntry & { redirect: string })[] = ROUTES.filter(
  (r): r is RouteEntry & { redirect: string } => typeof r.redirect === 'string'
)

/**
 * The old names a page answers to.
 *
 * `Docs Gaps.dc.html` F5 asks for `aliases` so that typing a retired name in
 * the Omnibar still finds the page. Rather than a second list to keep in step,
 * this inverts the redirect table: a redirect row already says "this old name
 * means that page", which is the same fact read the other way.
 *
 * Keyed by the destination with its query and hash stripped, because that is
 * the page — `/system/coverage?view=option` and `/system/coverage` are one
 * destination with two openings.
 */
const ALIASES: ReadonlyMap<string, readonly RouteEntry[]> = REDIRECT_ROUTES.reduce((map, entry) => {
  const page = entry.redirect.split(/[?#]/)[0]
  map.set(page, [...(map.get(page) ?? []), entry])
  return map
}, new Map<string, RouteEntry[]>())

export function aliasesFor(pathname: string): readonly RouteEntry[] {
  return ALIASES.get(pathname) ?? []
}

/**
 * Shown when a pathname matches nothing — a 404, or a route added without an
 * entry. Not a redirect: it has nowhere to send you. `'*'` is what keeps it out
 * of the Omnibar and the recent-pages trail.
 */
export const FALLBACK_ROUTE: RouteEntry = { path: '*', label: 'Bifrost Trade' }

const STATIC_ROUTES = new Map(ROUTES.filter((r) => !r.path.includes(':')).map((r) => [r.path, r]))
const DYNAMIC_ROUTES = ROUTES.filter((r) => r.path.includes(':'))

/**
 * The entry for a pathname, or the fallback.
 *
 * Static paths are a map lookup; only the handful carrying `:params` are
 * matched, and those are matched with the router's own matcher so the registry
 * cannot drift from how `router.tsx` resolves them.
 */
export function routeFor(pathname: string): RouteEntry {
  const exact = STATIC_ROUTES.get(pathname)
  if (exact) return exact
  for (const entry of DYNAMIC_ROUTES) {
    if (matchPath(entry.path, pathname)) return entry
  }
  return FALLBACK_ROUTE
}

/**
 * Whether a pathname belongs to the System tree rather than the business tree.
 *
 * The sidebar swaps its whole tree here instead of carrying System as a ninth
 * business group. The two are read at different times and for different
 * reasons — one is the desk, the other is the machine under it — and a reader
 * inside System is not scanning for a position. What it must NOT do is what
 * the old `SettingsLayout` did: grow a second navigation shell that also
 * dropped the breadcrumb, the Omnibar, the symbol chip and the Inbox.
 */
export function isSystemRoute(pathname: string): boolean {
  return pathname.startsWith('/system/') || pathname.startsWith('/docs/')
}
