/**
 * GENERATED — do not edit. `node scripts/design-nav-snapshot.mjs`.
 *
 * The design's route table (`design/trade/shell-registry.js`), frozen so the
 * adoption tracker has a design side to compute against and the app builds
 * without the design package present.
 *
 * Derived, not typed: 92 routes, 88 with a designed page,
 * 4 resolving to the stub. One route per line, so a
 * diff on this file reads as the design's menu change.
 */

export interface DesignRoute {
  path: string
  label: string
  crumbs: readonly string[]
  /** False when the route resolves to `_Shell Stub` — the design's own backlog. */
  designed: boolean
  /** The prototype file, or the stub. */
  file: string
  /**
   * The design round the prototype belongs to, from Docs Index.dc.html.
   * NEW is this round's work; OLD is an early round a later contract may have
   * overtaken (including Docs Index OLDC, 「早期轮次 · 部分被契约覆盖」);
   * LAB means the design handed the page to Lab — for a page the app
   * has, that is a move, not a target; null when the route has no prototype.
   */
  round: 'NEW' | 'OLD' | 'REDO' | 'LAB' | null
  /**
   * The Rev of this page's last substantive design change, from the registry's
   * 5th element. Null on stub rows. A walked page goes stale only when its own
   * rev moves — the global Rev moves whenever any page does.
   */
  rev: string | null
  /** In the design's sidebar. A route can exist and be reachable only by link. */
  inNav: boolean
  /** Top-level group in the design's tree, when it has a row. */
  group: string | null
}

/**
 * A reading page and the method page that is its back.
 *
 * The design dissolved Lab on 2026-09-20: the four mirror pages are not
 * siblings of their readings, they are the same subject shown open. Same
 * path root, same endpoint, so the switch belongs to the page and not to the
 * tree — and this table is read from the registry rather than typed, because
 * a hand-kept copy of a pairing is exactly the thing that drifts.
 */
export interface DesignFace {
  reading: string
  method: string
}

export const DESIGN_FACES: readonly DesignFace[] = [
  {"reading":"/research/ratings/stocks","method":"/research/lab/today"},
  {"reading":"/research/screener","method":"/research/lab/screener"},
  {"reading":"/research/symbol","method":"/research/lab/symbol"},
  {"reading":"/research/history","method":"/research/lab/history"},
]

/**
 * Routes that read the objective scope today — the Lens lights its token only
 * for these.
 */
export const DESIGN_OBJ_WIRED: readonly string[] = [
  "/research/loop/candidates",
  "/research/loop/harness",
  "/research/loop/hypotheses",
  "/review/objectives",
]

/**
 * Routes ruled to read it, wired or not. A route here but not in
 * `DESIGN_OBJ_WIRED` is the honest third state: held, not wired yet.
 */
export const DESIGN_OBJ_TARGET: readonly string[] = [
  "/portfolio/outcome",
  "/portfolio/positions",
  "/research/journal",
  "/research/loop/candidates",
  "/research/loop/decisions",
  "/research/loop/harness",
  "/research/loop/hypotheses",
  "/research/loop/runs",
  "/research/watchlist",
  "/review",
  "/review/fit",
  "/review/objectives",
  "/review/playbook-stats",
  "/trade/desk",
  "/trade/plans",
]

/** The same three-state honesty for the symbol scope: ruled reach, wired or not. */
export const DESIGN_SYM_TARGET: readonly string[] = [
  "/portfolio/outcome",
  "/research/journal",
  "/research/loop/candidates",
  "/research/loop/hypotheses",
  "/research/watchlist",
  "/trade/desk",
  "/trade/fills",
]

export const DESIGN_REV = "2026-09-20.11"

export const DESIGN_ROUTES: readonly DesignRoute[] = [
  {"path":"/home","label":"Today","crumbs":[],"designed":true,"file":"Home Today.dc.html","round":"NEW","rev":"2026-09-17.1","inNav":true,"group":"Home"},
  {"path":"/research/events","label":"Events","crumbs":["Research","Market"],"designed":true,"file":"Research Events.dc.html","round":"NEW","rev":"2026-09-12.1","inNav":true,"group":"Research"},
  {"path":"/market/live","label":"Live","crumbs":["Research","Market"],"designed":true,"file":"Market Live.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Research"},
  {"path":"/risk/portfolio","label":"Portfolio Exposure","crumbs":["Risk"],"designed":true,"file":"Risk Portfolio.dc.html","round":"NEW","rev":"2026-09-17.1","inNav":true,"group":"Risk"},
  {"path":"/portfolio/pnl-explain","label":"P&L Explain","crumbs":["Portfolio","Performance"],"designed":true,"file":"Portfolio PnL Explain.dc.html","round":"NEW","rev":"2026-09-17.1","inNav":true,"group":"Portfolio"},
  {"path":"/trade/expiration","label":"Expiration","crumbs":["Trade","Desk"],"designed":true,"file":"Trade Expiration.dc.html","round":"NEW","rev":"2026-09-17.1","inNav":true,"group":"Trade"},
  {"path":"/research/overview","label":"Overview","crumbs":["Research"],"designed":true,"file":"Research Overview.dc.html","round":"OLD","rev":"2026-09-18.2","inNav":true,"group":"Research"},
  {"path":"/research/workbench","label":"Pipeline","crumbs":["Research"],"designed":true,"file":"Research Overview.dc.html","round":"OLD","rev":"2026-09-19.2","inNav":true,"group":"Research"},
  {"path":"/research/ratings","label":"Vol ratings","crumbs":["Research","Pipeline","Discover"],"designed":true,"file":"Research Scan.dc.html","round":"OLD","rev":"2026-09-20.10","inNav":false,"group":null},
  {"path":"/research/ratings/stocks","label":"Stock ratings","crumbs":["Research","Pipeline","Discover"],"designed":true,"file":"Research Ratings Stocks.dc.html","round":"OLD","rev":"2026-09-20.10","inNav":true,"group":"Research"},
  {"path":"/research/scan","label":"Vol ratings","crumbs":["Research","Pipeline","Discover"],"designed":true,"file":"Research Scan.dc.html","round":"OLD","rev":"2026-09-20.10","inNav":true,"group":"Research"},
  {"path":"/research/screener","label":"Stock screen","crumbs":["Research","Pipeline","Discover"],"designed":true,"file":"Research Screener.dc.html","round":"OLD","rev":"2026-09-20.10","inNav":true,"group":"Research"},
  {"path":"/research/explorer","label":"Stock screen","crumbs":["Research","Pipeline","Discover"],"designed":true,"file":"Research Screener.dc.html","round":"OLD","rev":"2026-09-20.10","inNav":false,"group":null},
  {"path":"/research/contract-screener","label":"Option screen","crumbs":["Research","Pipeline","Discover"],"designed":true,"file":"Research Contract Screener.dc.html","round":"OLD","rev":"2026-09-20.10","inNav":true,"group":"Research"},
  {"path":"/research/event-radar","label":"Alerts","crumbs":["Research","Market"],"designed":true,"file":"Research Event Radar.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Research"},
  {"path":"/research/symbol","label":"Symbol","crumbs":["Research","Pipeline","Analyze"],"designed":true,"file":"Research Symbol.dc.html","round":"REDO","rev":"2026-09-18.2","inNav":true,"group":"Research"},
  {"path":"/research/vol-regime","label":"Vol Regime","crumbs":["Research","Pipeline","Analyze"],"designed":true,"file":"Research Symbol.dc.html","round":"REDO","rev":"2026-09-17.1","inNav":false,"group":null},
  {"path":"/research/dealer-levels","label":"Dealer Levels","crumbs":["Research","Pipeline","Analyze"],"designed":true,"file":"Research Symbol.dc.html","round":"REDO","rev":"2026-09-17.1","inNav":false,"group":null},
  {"path":"/research/scenario","label":"Scenario","crumbs":["Research","Pipeline","Analyze"],"designed":true,"file":"Research Symbol.dc.html","round":"REDO","rev":"2026-09-17.1","inNav":false,"group":null},
  {"path":"/research/flow","label":"Flow","crumbs":["Research","Pipeline","Analyze"],"designed":true,"file":"Research Symbol.dc.html","round":"REDO","rev":"2026-09-17.1","inNav":false,"group":null},
  {"path":"/research/discovery","label":"Chain","crumbs":["Research","Pipeline","Analyze"],"designed":true,"file":"Research Symbol.dc.html","round":"REDO","rev":"2026-09-17.1","inNav":false,"group":null},
  {"path":"/research/payoff","label":"Payoff","crumbs":["Research","Pipeline","Analyze"],"designed":true,"file":"Research Symbol.dc.html","round":"REDO","rev":"2026-09-17.1","inNav":false,"group":null},
  {"path":"/research/compare","label":"Compare","crumbs":["Research","Pipeline","Analyze"],"designed":true,"file":"Research Compare.dc.html","round":"NEW","rev":"2026-09-17.1","inNav":true,"group":"Research"},
  {"path":"/research/history","label":"History","crumbs":["Research","Pipeline","Analyze"],"designed":true,"file":"Research History.dc.html","round":"NEW","rev":"2026-09-17.1","inNav":true,"group":"Research"},
  {"path":"/research/lab/today","label":"Stock ratings · method","crumbs":["Research","Pipeline","Discover"],"designed":true,"file":"Research Lab Today.dc.html","round":"LAB","rev":"2026-09-20.4","inNav":false,"group":null},
  {"path":"/research/lab/screener","label":"Stock screen · method","crumbs":["Research","Pipeline","Discover"],"designed":true,"file":"Research Lab Screener.dc.html","round":"LAB","rev":"2026-09-20.4","inNav":false,"group":null},
  {"path":"/research/lab/symbol","label":"Symbol · method","crumbs":["Research","Pipeline","Analyze"],"designed":true,"file":"Research Lab Symbol.dc.html","round":"LAB","rev":"2026-09-20.4","inNav":false,"group":null},
  {"path":"/research/lab/history","label":"History · method","crumbs":["Research","Pipeline","Analyze"],"designed":true,"file":"Research Lab History.dc.html","round":"LAB","rev":"2026-09-20.4","inNav":false,"group":null},
  {"path":"/research/lab/calibration","label":"Calibration","crumbs":["System","Data"],"designed":true,"file":"Research Lab Calibration.dc.html","round":"LAB","rev":"2026-09-20.4","inNav":true,"group":"System"},
  {"path":"/research/lab/discover-model","label":"Discover model","crumbs":["System","Data"],"designed":true,"file":"Research Lab Discover Model.dc.html","round":"LAB","rev":"2026-09-20.4","inNav":true,"group":"System"},
  {"path":"/review/playbook-stats","label":"Playbook stats","crumbs":["Review"],"designed":true,"file":"Review Playbook Stats.dc.html","round":"NEW","rev":"2026-09-18.1","inNav":true,"group":"Review"},
  {"path":"/review/objectives","label":"Objectives","crumbs":["Review"],"designed":true,"file":"Review Objectives.dc.html","round":null,"rev":"2026-09-20.5","inNav":true,"group":"Review"},
  {"path":"/research/journal","label":"Journal","crumbs":["Research","The Book"],"designed":true,"file":"Research Journal.dc.html","round":null,"rev":"2026-09-19.2","inNav":true,"group":"Research"},
  {"path":"/research/signal-decay","label":"Signal Decay","crumbs":["Research","Pipeline","Validate"],"designed":true,"file":"Research Signal Decay.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Research"},
  {"path":"/research/backtest","label":"Backtest","crumbs":["Research","Pipeline","Validate"],"designed":true,"file":"Research Backtest.dc.html","round":"LAB","rev":"2026-09-17.1","inNav":true,"group":"Research"},
  {"path":"/research/signal-health","label":"Signal Health","crumbs":["System","Data"],"designed":true,"file":"Research Signal Health.dc.html","round":null,"rev":"2026-09-19.2","inNav":true,"group":"System"},
  {"path":"/research/lens-coverage","label":"Lens Coverage","crumbs":["System","Data"],"designed":true,"file":"Research Lens Coverage.dc.html","round":"OLD","rev":"2026-09-19.2","inNav":true,"group":"System"},
  {"path":"/research/watchlist","label":"Watchlist","crumbs":["Research","The Book"],"designed":true,"file":"Research Watchlist.dc.html","round":null,"rev":"2026-09-18.2","inNav":true,"group":"Research"},
  {"path":"/research/greeks","label":"Contract Greeks","crumbs":["Research","Pipeline","Analyze"],"designed":true,"file":"Research Contract Greeks.dc.html","round":null,"rev":"2026-09-19.2","inNav":false,"group":null},
  {"path":"/research/narrative","label":"Narrative","crumbs":["Research","Pipeline","Analyze"],"designed":true,"file":"Research Narrative Lens.dc.html","round":null,"rev":"2026-09-19.2","inNav":false,"group":null},
  {"path":"/research/copilot","label":"Desk","crumbs":["Research","Copilot"],"designed":true,"file":"Research Copilot.dc.html","round":"REDO","rev":"2026-09-18.2","inNav":true,"group":"Research"},
  {"path":"/research/daily-brief","label":"Daily Brief","crumbs":["Research","Copilot"],"designed":true,"file":"Research Daily Brief.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Research"},
  {"path":"/research/copilot/trading","label":"Book starters","crumbs":["Research","Copilot"],"designed":true,"file":"Research Copilot.dc.html","round":"REDO","rev":"2026-09-15.5","inNav":false,"group":null},
  {"path":"/research/agent-personas","label":"Personas","crumbs":["Research","Copilot"],"designed":true,"file":"Research Copilot.dc.html","round":"REDO","rev":"2026-09-18.2","inNav":true,"group":"Research"},
  {"path":"/research/loop/harness","label":"Autopilot","crumbs":["Research"],"designed":true,"file":"Research Autopilot Console.dc.html","round":null,"rev":"2026-09-20.1","inNav":true,"group":"Research"},
  {"path":"/research/loop/objectives/obj-daily-stock","label":"Daily Loop Stock Explorer","crumbs":["Research","Autopilot"],"designed":true,"file":"Research Objective.dc.html","round":null,"rev":"2026-09-20.1","inNav":false,"group":null},
  {"path":"/research/loop/objectives/obj-earnings-iv","label":"Earnings-week IV","crumbs":["Research","Autopilot"],"designed":true,"file":"Research Objective.dc.html","round":null,"rev":"2026-09-20.1","inNav":false,"group":null},
  {"path":"/research/loop/objectives/obj-smallcap-sepa","label":"Small-cap SEPA","crumbs":["Research","Autopilot"],"designed":true,"file":"Research Objective.dc.html","round":null,"rev":"2026-09-20.3","inNav":false,"group":null},
  {"path":"/research/loop/objectives/obj-vol-crush","label":"Post-earnings vol crush","crumbs":["Research","Autopilot"],"designed":true,"file":"Research Objective.dc.html","round":null,"rev":"2026-09-20.3","inNav":false,"group":null},
  {"path":"/research/loop/runs","label":"Loop Run","crumbs":["Research","Autopilot"],"designed":true,"file":"Research Autopilot Console.dc.html","round":null,"rev":"2026-09-18.2","inNav":false,"group":null},
  {"path":"/research/loop/decisions","label":"Decision Inbox","crumbs":["Research","Autopilot"],"designed":true,"file":"Research Autopilot Decisions.dc.html","round":"OLD","rev":"2026-09-18.2","inNav":true,"group":"Research"},
  {"path":"/research/loop/hypotheses","label":"Hypothesis Board","crumbs":["Research","The Book"],"designed":true,"file":"Research Hypothesis Board.dc.html","round":null,"rev":"2026-09-18.2","inNav":true,"group":"Research"},
  {"path":"/research/loop/candidates","label":"Candidate Pool","crumbs":["Research","The Book"],"designed":true,"file":"Research Candidate Pool.dc.html","round":null,"rev":"2026-09-18.2","inNav":true,"group":"Research"},
  {"path":"/trade/desk","label":"Desk","crumbs":["Trade"],"designed":true,"file":"Trade Desk.dc.html","round":"OLD","rev":"2026-09-18.1","inNav":true,"group":"Trade"},
  {"path":"/trade/plans","label":"Plans","crumbs":["Trade","Desk"],"designed":true,"file":"Trade Plans.dc.html","round":"OLD","rev":"2026-09-18.1","inNav":true,"group":"Trade"},
  {"path":"/trade/fills","label":"Orders & Fills","crumbs":["Trade","Desk"],"designed":true,"file":"Trade Fills.dc.html","round":"OLD","rev":"2026-09-18.1","inNav":true,"group":"Trade"},
  {"path":"/trade/rules","label":"Rules","crumbs":["Trade","Desk"],"designed":true,"file":"Trade Desk.dc.html","round":"OLD","rev":"2026-09-18.1","inNav":true,"group":"Trade"},
  {"path":"/trade/playbook","label":"Playbook","crumbs":["Trade","Desk"],"designed":true,"file":"Trade Playbook.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Trade"},
  {"path":"/review","label":"Queue","crumbs":["Review"],"designed":true,"file":"Review Queue.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Review"},
  {"path":"/review/fit","label":"Single trade","crumbs":["Review"],"designed":true,"file":"Review Fit.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Review"},
  {"path":"/review/habits","label":"Habits","crumbs":["Review"],"designed":true,"file":"Review Habits.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Review"},
  {"path":"/review/proposals","label":"Rule proposals","crumbs":["Review"],"designed":true,"file":"Review Queue.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Review"},
  {"path":"/portfolio/performance","label":"Performance","crumbs":["Portfolio"],"designed":true,"file":"Portfolio Performance.dc.html","round":null,"rev":"2026-09-17.2","inNav":true,"group":"Portfolio"},
  {"path":"/portfolio/positions","label":"Positions","crumbs":["Portfolio","Performance"],"designed":true,"file":"Portfolio Positions.dc.html","round":"OLD","rev":"2026-09-18.1","inNav":true,"group":"Portfolio"},
  {"path":"/portfolio/backing","label":"Backing & Model","crumbs":["Portfolio","Performance"],"designed":true,"file":"Portfolio Backing.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Portfolio"},
  {"path":"/portfolio/outcome","label":"Outcome","crumbs":["Portfolio","Performance"],"designed":true,"file":"Portfolio Outcome.dc.html","round":"OLD","rev":"2026-09-17.1","inNav":true,"group":"Portfolio"},
  {"path":"/portfolio/accounts","label":"Accounts","crumbs":["Portfolio"],"designed":true,"file":"Portfolio Accounts.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Portfolio"},
  {"path":"/portfolio/ledger","label":"Trade Ledger","crumbs":["Portfolio","Accounts"],"designed":true,"file":"Portfolio Ledger.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Portfolio"},
  {"path":"/portfolio/transfer","label":"Transfer & Pay","crumbs":["Portfolio","Accounts"],"designed":true,"file":"Portfolio Transfer.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Portfolio"},
  {"path":"/portfolio/corporate-actions","label":"Corporate Actions","crumbs":["Portfolio","Accounts"],"designed":true,"file":"Portfolio Corporate Actions.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Portfolio"},
  {"path":"/trade/assignment","label":"Assignment","crumbs":["Trade","Desk"],"designed":true,"file":"Trade Assignment.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Trade"},
  {"path":"/risk/sizing","label":"Sizing","crumbs":["Risk"],"designed":true,"file":"Risk Sizing.dc.html","round":null,"rev":"2026-09-18.1","inNav":true,"group":"Risk"},
  {"path":"/risk/budget","label":"Risk Budget","crumbs":["Risk"],"designed":true,"file":"Risk Budget.dc.html","round":null,"rev":"2026-09-18.1","inNav":true,"group":"Risk"},
  {"path":"/risk/limits","label":"Limits & Breaches","crumbs":["Risk"],"designed":true,"file":"Risk Limits.dc.html","round":null,"rev":"2026-09-18.1","inNav":true,"group":"Risk"},
  {"path":"/risk/margin","label":"Margin & Buying Power","crumbs":["Risk"],"designed":true,"file":"Risk Margin.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Risk"},
  {"path":"/risk/stress","label":"Stress & Scenario","crumbs":["Risk"],"designed":true,"file":"Risk Stress.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Risk"},
  {"path":"/system/status","label":"System Status","crumbs":["System"],"designed":true,"file":"System Status.dc.html","round":null,"rev":"2026-09-15.13","inNav":true,"group":"System"},
  {"path":"/settings","label":"Settings","crumbs":["System"],"designed":true,"file":"Settings.dc.html","round":null,"rev":"2026-09-15.13","inNav":true,"group":"System"},
  {"path":"/docs/research-blueprint","label":"Research Blueprint","crumbs":["System","Reference"],"designed":false,"file":"_Shell Stub.dc.html","round":null,"rev":null,"inNav":true,"group":"System"},
  {"path":"/docs/research-calibration","label":"Research Calibration","crumbs":["System","Reference"],"designed":false,"file":"_Shell Stub.dc.html","round":null,"rev":null,"inNav":true,"group":"System"},
  {"path":"/docs/tech-stack","label":"Tech Stack","crumbs":["System","Reference"],"designed":false,"file":"_Shell Stub.dc.html","round":null,"rev":null,"inNav":true,"group":"System"},
  {"path":"/docs/ui-design-system","label":"UI Design System","crumbs":["System","Reference"],"designed":false,"file":"_Shell Stub.dc.html","round":null,"rev":null,"inNav":true,"group":"System"},
  {"path":"/docs/index","label":"Index","crumbs":["System","Reference","Design"],"designed":true,"file":"Docs Index.dc.html","round":null,"rev":"2026-09-15.5","inNav":true,"group":"System"},
  {"path":"/docs/progress","label":"Progress","crumbs":["System","Reference","Design"],"designed":true,"file":"Docs Progress.dc.html","round":null,"rev":"2026-09-15.6","inNav":true,"group":"System"},
  {"path":"/docs/layout","label":"Layout Map","crumbs":["System","Reference","Design"],"designed":true,"file":"Docs Layout Map.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"System"},
  {"path":"/docs/audit","label":"UI Audit","crumbs":["System","Reference","Design"],"designed":true,"file":"Docs Audit.dc.html","round":null,"rev":"2026-09-12.1","inNav":true,"group":"System"},
  {"path":"/docs/capability","label":"Capability Map","crumbs":["System","Reference","Design"],"designed":true,"file":"Docs Capability.dc.html","round":null,"rev":"2026-09-12.1","inNav":true,"group":"System"},
  {"path":"/docs/gaps","label":"Gap Review","crumbs":["System","Reference","Design"],"designed":true,"file":"Docs Gaps.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"System"},
  {"path":"/docs/options-kit","label":"Options Kit","crumbs":["System","Reference","Design"],"designed":true,"file":"Docs Options Kit.dc.html","round":null,"rev":"2026-09-17.2","inNav":true,"group":"System"},
  {"path":"/docs/drilldown","label":"Drill-down","crumbs":["System","Reference","Design"],"designed":true,"file":"Docs Drilldown.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"System"},
  {"path":"/docs/research-vision","label":"Research Vision · dock","crumbs":["System","Reference","Design"],"designed":true,"file":"Research Artifact Dock.dc.html","round":null,"rev":"2026-09-18.2","inNav":true,"group":"System"},
  {"path":"/docs/research-menu","label":"Research menu","crumbs":["System","Reference","Design"],"designed":true,"file":"Docs Research Menu.dc.html","round":null,"rev":"2026-09-20.1","inNav":true,"group":"System"},
]
