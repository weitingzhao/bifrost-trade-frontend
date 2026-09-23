/**
 * GENERATED — do not edit. `node scripts/design-nav-snapshot.mjs`.
 *
 * The design's route table (`design/trade/shell-registry.js`), frozen so the
 * adoption tracker has a design side to compute against and the app builds
 * without the design package present.
 *
 * Derived, not typed: 96 routes, 92 with a designed page,
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

/**
 * The design's menu glyphs — the shape, not a library's name for it.
 *
 * Folded to an icon rail the glyph is the only readable thing on a row, so the
 * set was drawn so that no two rows share one. Six of them have no equivalent
 * in any icon library at all (`payoff`, `smile`, `ladder`, `valve`,
 * `rotor`, `pillars`), which is the reason this is path data rather than a
 * table of imports: reaching for the nearest library name would put two rows
 * back on one shape.
 *
 * Every one is a single path on a 24 viewBox with round caps — `Glyph` in
 * `src/lib/design/glyphs.tsx` is the only thing that should read this.
 */
export const DESIGN_GLYPHS: Readonly<Record<string, string>> = {
  "anchored": "M4 4h8v16H4zM6.5 8.5h3M6.5 12h2M12 11h3M15 7h6v5h-2l-2 2.5V12h-2z",
  "bell": "M18 16H6l1.5-2.2V10a4.5 4.5 0 019 0v3.8zM10 19a2 2 0 004 0",
  "binder": "M4 4h16v16H4zM8 4v16M11 9h6M11 14h4",
  "blueprint": "M4 4h16v16H4zM9 4v16M4 9h16M12 13h5M12 16h3",
  "brief": "M5 3h14v18H5zM8 7h8M8 11h8M8 15h4",
  "bubble": "M21 12a8 8 0 01-8 8H5l-2 2V12a8 8 0 018-8h2a8 8 0 018 8z",
  "bucket": "M5 8h14l-1.5 12h-11zM6.6 14h10.8",
  "bullseye": "M12 3a9 9 0 100 18 9 9 0 000-18M12 8a4 4 0 100 8 4 4 0 000-8M12 11.5h.01",
  "caliper": "M4 6v12M20 6v12M4 12h16M9 9l-3 3 3 3M15 9l3 3-3 3",
  "card": "M4 5h16v14H4zM8 15l2.5-3 2 2 3.5-4",
  "ceiling": "M3 5h18M7 20v-8M12 20v-11M17 20v-5M9.5 11.5L12 9l2.5 2.5",
  "clipcheck": "M9 3h6v3H9zM9 5H5v16h14V5h-4M9 13l2 2 4-4",
  "clockback": "M3 12a9 9 0 109-9 9 9 0 00-7 3M3 3v5h5M12 7v5l3 2",
  "compass": "M12 2a10 10 0 100 20 10 10 0 000-20zM15 9l-2 6-4 2 2-6z",
  "coverbar": "M3 10h18v4H3zM3 10h11v4H3z",
  "curve": "M4 4v16h16M7 15l4-5 3 3 5-7",
  "datecal": "M4 5h16v15H4zM8 3v4M16 3v4M4 10h16M8.5 14h2M13.5 14h2M8.5 17h2",
  "db": "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  "decay": "M3 5h4v5h4v5h4v5h6",
  "deliver": "M12 3v8M8.5 7.5L12 11l3.5-3.5M4 14h16v6H4z",
  "doc": "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h3",
  "eye": "M2.5 12C5 8 8.2 6 12 6s7 2 9.5 6c-2.5 4-5.7 6-9.5 6s-7-2-9.5-6zM12 9.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6z",
  "flows": "M3 12h18M8 8V3M5 6l3-3 3 3M16 16v5M13 18l3 3 3-3",
  "fork": "M12 3v5M12 8l-5 4M12 8l5 4M7 12v4M17 12v4M4 16h6M14 16h6",
  "gap": "M3 13h6v6H3zM15 13h6v6h-6zM10.5 16h.01M13.5 16h.01",
  "gates": "M3 6l4 6-4 6M10 6l4 6-4 6M19 4v16",
  "gauge": "M4 17a8 8 0 0116 0M12 17l4.5-5.5",
  "gaugebar": "M3 9h18v6H3zM13 9v6M6 12h4",
  "gear": "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 01-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 012.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 012.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z",
  "grid4": "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  "hourglass": "M7 3h10M7 21h10M7 3c0 4 5 5 5 9s-5 5-5 9M17 3c0 4-5 5-5 9s5 5 5 9",
  "kit": "M4 4h7v7H4zM17.5 5a4 4 0 100 8 4 4 0 000-8M4 15h7M4 19h5M15 17h6",
  "ladder": "M6 5h12M6 9h12M6 13h12M6 17h12M3 13h2M19 13h2",
  "lamprows": "M5 7h.01M5 12h.01M5 17h.01M9 7h10M9 12h10M9 17h6",
  "layers": "M12 3l9 5-9 5-9-5 9-5zM3 14l9 5 9-5",
  "map": "M4 4h6v6H4zM14 4h6v6h-6zM9 14h6v6H9zM7 10v3h10v-3M12 13v1",
  "matched": "M3 9h13l-3.5-3.5M21 15H8l3.5 3.5",
  "matrix": "M4 5h16v14H4zM4 10h16M4 15h16M9.3 5v14M14.6 5v14M14.6 15h5.4v4h-5.4z",
  "model": "M6 6a2 2 0 100 4 2 2 0 000-4M6 14a2 2 0 100 4 2 2 0 000-4M18 10a2 2 0 100 4 2 2 0 000-4M8 8.6l8 2.8M8 15.4l8-2.8",
  "openbook": "M12 7C10 5 7 4.4 4 5v13c3-.6 6 0 8 2 2-2 5-2.6 8-2V5c-3-.6-6 0-8 2zM12 7v14",
  "pages": "M3 8c3-1.2 6-1.2 9 0 3-1.2 6-1.2 9 0M3 13c3-1.2 6-1.2 9 0 3-1.2 6-1.2 9 0M3 18c3-1.2 6-1.2 9 0 3-1.2 6-1.2 9 0",
  "panel3": "M10 7a3 3 0 106 0 3 3 0 00-6 0M6 20a7 7 0 0114 0M3.5 10.5a2.5 2.5 0 103 4M2 19a5 5 0 013-4.2",
  "pathmarks": "M3 18c3.5 0 4.5-9 7.5-9s3.5 7 5.5 7 3-4.5 5-7M10.5 9h.01M21 9h.01",
  "payoff": "M3 17h6l5-9h7M9 20v-6",
  "pie": "M12 3a9 9 0 100 18 9 9 0 000-18M12 12V3M12 12l7 5",
  "pillars": "M12 3l8 4H4zM7 7v10M12 7v10M17 7v10M4 20h16",
  "planactual": "M3 6h18v4H3zM9 6v4M15 6v4M3 14h11v4H3zM14 12v8",
  "promote": "M4 6h10M4 11h10M4 16h10M18 17V6M18 6l-2.5 2.5M18 6l2.5 2.5",
  "pulse": "M3 12h4l3 7 4-14 3 7h4",
  "reliability": "M4 20V4M4 20h16M5 19L19 5M5 19c3 0 5-2.5 7-6s4-6.5 7-8",
  "replay": "M3 20h18M11 6L4 11l7 5zM20 6l-7 5 7 5z",
  "restrike": "M3 7h6v10H3zM15 7h6v10h-6M10 12h4M12.5 9.5L15 12l-2.5 2.5",
  "rotor": "M12 7a5 5 0 100 10 5 5 0 000-10M12 3v4M12 17v4M3 12h4M17 12h4",
  "scale": "M12 4v16M8 20h8M4 8h16M4 8l-2 5h4zM20 8l2 5h-4z",
  "setsquare": "M5 4v15h15zM5 8h2.5M5 12h2.5M5 16h2.5",
  "sidebar": "M4 5h16v14H4zM9 5v14M11.5 9h6M11.5 13h4",
  "sieve": "M3 6h10M3 11h6M3 16h4M15 8.5a4 4 0 100 8 4 4 0 000-8M18.5 16.5L21 19",
  "sliders": "M4 8h16M9 6v4M4 16h16M15 14v4",
  "slip": "M6 3h8l4 4v14H6zM14 3v4h4M9 16h5M13 13l3 3-3 3",
  "smile": "M3 19h18M4 8C7 16 17 16 20 8",
  "steps": "M4 20h4v-4H4zM10 20h4v-8h-4zM16 20h4v-12h-4z",
  "streak": "M3 8h4v4H3zM9 8h4v4H9zM15 8h4v4h-4zM3 15h4v4H3zM9 15h4v4H9z",
  "swatch": "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM16.5 13a3.5 3.5 0 100 7 3.5 3.5 0 000-7z",
  "tree": "M6 3v18M6 8h5M6 16h5M13 5h7v6h-7zM13 13h7v6h-7z",
  "valve": "M4 12h5M15 12h5M9 8h6v8H9zM12 4v4",
  "vs": "M11 3v18M4 17V9M7.5 17v-5M14.5 17v-8M18 17v-3",
  "wallet": "M4 6h12a4 4 0 014 4v7H4zM4 6v11M14 12h4",
  "waterfall": "M3 21V3M6 16h3v5H6zM12 11h3v5h-3zM18 6h3v5h-3z",
  "waves": "M12 12h.01M8.5 8.5a5 5 0 000 7M15.5 8.5a5 5 0 010 7M5.6 5.6a9 9 0 000 12.8M18.4 5.6a9 9 0 010 12.8",
  "zoomin": "M4 4h6M4 4v6M20 20h-6M20 20v-6M9 9L4 4M15 15l5 5",
}

/** Which glyph each row carries, by route. */
export const DESIGN_ROUTE_GLYPH: Readonly<Record<string, string>> = {
  "/docs/audit": "clipcheck",
  "/docs/capability": "grid4",
  "/docs/drilldown": "zoomin",
  "/docs/gaps": "gap",
  "/docs/index": "compass",
  "/docs/layout": "map",
  "/docs/options-kit": "kit",
  "/docs/progress": "steps",
  "/docs/research-blueprint": "blueprint",
  "/docs/research-calibration": "reliability",
  "/docs/research-menu": "sidebar",
  "/docs/research-vision": "anchored",
  "/docs/tech-stack": "layers",
  "/docs/ui-design-system": "swatch",
  "/portfolio/accounts": "wallet",
  "/portfolio/backing": "pillars",
  "/portfolio/corporate-actions": "restrike",
  "/portfolio/ledger": "binder",
  "/portfolio/outcome": "planactual",
  "/portfolio/performance": "curve",
  "/portfolio/pnl-explain": "waterfall",
  "/portfolio/positions": "payoff",
  "/portfolio/transfer": "flows",
  "/research/agent-personas": "panel3",
  "/research/backtest": "replay",
  "/research/compare": "vs",
  "/research/contract-screener": "ladder",
  "/research/daily-brief": "brief",
  "/research/events": "datecal",
  "/research/history": "clockback",
  "/research/lab/calibration": "sliders",
  "/research/lab/discover-model": "model",
  "/research/lens-coverage": "coverbar",
  "/research/loop/decisions": "valve",
  "/research/orchestration": "tree",
  "/research/ratings/stocks": "gauge",
  "/research/scan": "smile",
  "/research/screener": "sieve",
  "/research/signal-decay": "decay",
  "/research/signal-health": "lamprows",
  "/research/symbol": "card",
  "/review/fit": "pathmarks",
  "/review/habits": "streak",
  "/review/objectives": "bullseye",
  "/review/playbook-stats": "pie",
  "/risk/budget": "bucket",
  "/risk/limits": "ceiling",
  "/risk/margin": "gaugebar",
  "/risk/portfolio": "scale",
  "/risk/sizing": "caliper",
  "/risk/stress": "matrix",
  "/settings": "gear",
  "/system/status": "pulse",
  "/trade/assignment": "deliver",
  "/trade/expiration": "hourglass",
  "/trade/fills": "matched",
  "/trade/plans": "slip",
  "/trade/playbook": "openbook",
  "/trade/rules": "gates",
}

/**
 * And each fold heading's, by its label. Keyed by label rather than by route
 * because a heading borrows a child's path to be clickable, so two rows share
 * it while carrying different shapes.
 */
export const DESIGN_FOLD_GLYPH: Readonly<Record<string, string>> = {
  "Agents": "panel3",
  "Data": "db",
  "Design": "setsquare",
  "Reference": "doc",
}

/**
 * The equipment rail's shapes — the nine surfaces that left the tree (§5a.8)
 * and so carry no nav row. By group id for a rail head, by route for a tab.
 */
export const DESIGN_EQUIP_GROUP_GLYPH: Readonly<Record<string, string>> = {
  "autopilot": "rotor",
  "book": "pages",
  "copilot": "bubble",
  "market": "waves",
}

export const DESIGN_EQUIP_ROUTE_GLYPH: Readonly<Record<string, string>> = {
  "/market/live": "waves",
  "/research/book": "pages",
  "/research/copilot": "bubble",
  "/research/copilot/trading": "brief",
  "/research/event-radar": "bell",
  "/research/journal": "tree",
  "/research/loop/candidates": "promote",
  "/research/loop/decisions": "valve",
  "/research/loop/harness": "rotor",
  "/research/loop/hypotheses": "fork",
  "/research/loop/runs": "replay",
  "/research/watchlist": "eye",
}

/**
 * The unit of analysis a page answers in: "stk" (one row per symbol) or "opt"
 * (per strike x expiry). The sidebar's trailing mark reads this.
 */
export const DESIGN_SCOPE: Readonly<Record<string, 'underlying' | 'contract'>> = {
  "/research/compare": "contract",
  "/research/contract-screener": "contract",
  "/research/dealer-levels": "underlying",
  "/research/discovery": "contract",
  "/research/explorer": "underlying",
  "/research/flow": "underlying",
  "/research/greeks": "contract",
  "/research/history": "underlying",
  "/research/lab/history": "underlying",
  "/research/lab/screener": "underlying",
  "/research/lab/symbol": "underlying",
  "/research/payoff": "contract",
  "/research/ratings/stocks": "underlying",
  "/research/scan": "contract",
  "/research/scenario": "underlying",
  "/research/screener": "underlying",
  "/research/symbol": "underlying",
  "/research/vol-regime": "underlying",
  "/review/fit": "contract",
}

export const DESIGN_REV = "2026-09-23.9"

export const DESIGN_ROUTES: readonly DesignRoute[] = [
  {"path":"/home","label":"Today","crumbs":[],"designed":true,"file":"Home Today.dc.html","round":"NEW","rev":"2026-09-17.1","inNav":true,"group":"Home"},
  {"path":"/research/events","label":"Events","crumbs":["Home"],"designed":true,"file":"Research Events.dc.html","round":"NEW","rev":"2026-09-23.8","inNav":true,"group":"Home"},
  {"path":"/market/live","label":"Live","crumbs":["Market"],"designed":true,"file":"Market Live.dc.html","round":null,"rev":"2026-09-23.7","inNav":false,"group":null},
  {"path":"/risk/portfolio","label":"Portfolio Exposure","crumbs":["Risk"],"designed":true,"file":"Risk Portfolio.dc.html","round":"NEW","rev":"2026-09-23.3","inNav":true,"group":"Risk"},
  {"path":"/portfolio/pnl-explain","label":"P&L Explain","crumbs":["Portfolio","Performance"],"designed":true,"file":"Portfolio PnL Explain.dc.html","round":"NEW","rev":"2026-09-17.1","inNav":true,"group":"Portfolio"},
  {"path":"/trade/expiration","label":"Expiration","crumbs":["Trade"],"designed":true,"file":"Trade Expiration.dc.html","round":"NEW","rev":"2026-09-17.1","inNav":true,"group":"Trade"},
  {"path":"/research/overview","label":"Research","crumbs":[],"designed":true,"file":"Research Overview.dc.html","round":"OLD","rev":"2026-09-20.23","inNav":true,"group":"Research"},
  {"path":"/risk","label":"Risk","crumbs":["Risk"],"designed":true,"file":"Risk Overview.dc.html","round":null,"rev":"2026-09-20.15","inNav":true,"group":"Risk"},
  {"path":"/portfolio","label":"Portfolio","crumbs":["Portfolio"],"designed":true,"file":"Portfolio Overview.dc.html","round":null,"rev":"2026-09-20.15","inNav":true,"group":"Portfolio"},
  {"path":"/research/workbench","label":"Pipeline","crumbs":["Research"],"designed":true,"file":"Research Overview.dc.html","round":"OLD","rev":"2026-09-22.2","inNav":false,"group":null},
  {"path":"/research/ratings","label":"Vol ratings","crumbs":["Research","Discover"],"designed":true,"file":"Research Scan.dc.html","round":"OLD","rev":"2026-09-20.10","inNav":false,"group":null},
  {"path":"/research/ratings/stocks","label":"Stock ratings","crumbs":["Research","Discover"],"designed":true,"file":"Research Ratings Stocks.dc.html","round":"OLD","rev":"2026-09-23.9","inNav":true,"group":"Research"},
  {"path":"/research/scan","label":"Vol ratings","crumbs":["Research","Discover"],"designed":true,"file":"Research Scan.dc.html","round":"OLD","rev":"2026-09-20.10","inNav":true,"group":"Research"},
  {"path":"/research/screener","label":"Stock screen","crumbs":["Research","Discover"],"designed":true,"file":"Research Screener.dc.html","round":"OLD","rev":"2026-09-20.10","inNav":true,"group":"Research"},
  {"path":"/research/explorer","label":"Stock screen","crumbs":["Research","Discover"],"designed":true,"file":"Research Screener.dc.html","round":"OLD","rev":"2026-09-20.10","inNav":false,"group":null},
  {"path":"/research/contract-screener","label":"Option screen","crumbs":["Research","Discover"],"designed":true,"file":"Research Contract Screener.dc.html","round":"OLD","rev":"2026-09-20.10","inNav":true,"group":"Research"},
  {"path":"/research/event-radar","label":"Alerts","crumbs":["Market"],"designed":true,"file":"Research Event Radar.dc.html","round":null,"rev":"2026-09-23.7","inNav":false,"group":null},
  {"path":"/research/symbol","label":"Symbol","crumbs":["Research","Analyze"],"designed":true,"file":"Research Symbol.dc.html","round":"REDO","rev":"2026-09-18.2","inNav":true,"group":"Research"},
  {"path":"/research/vol-regime","label":"Vol Regime","crumbs":["Research","Analyze"],"designed":true,"file":"Research Symbol.dc.html","round":"REDO","rev":"2026-09-17.1","inNav":false,"group":null},
  {"path":"/research/dealer-levels","label":"Dealer Levels","crumbs":["Research","Analyze"],"designed":true,"file":"Research Symbol.dc.html","round":"REDO","rev":"2026-09-17.1","inNav":false,"group":null},
  {"path":"/research/scenario","label":"Scenario","crumbs":["Research","Analyze"],"designed":true,"file":"Research Symbol.dc.html","round":"REDO","rev":"2026-09-17.1","inNav":false,"group":null},
  {"path":"/research/flow","label":"Flow","crumbs":["Research","Analyze"],"designed":true,"file":"Research Symbol.dc.html","round":"REDO","rev":"2026-09-17.1","inNav":false,"group":null},
  {"path":"/research/discovery","label":"Chain","crumbs":["Research","Analyze"],"designed":true,"file":"Research Symbol.dc.html","round":"REDO","rev":"2026-09-17.1","inNav":false,"group":null},
  {"path":"/research/payoff","label":"Payoff","crumbs":["Research","Analyze"],"designed":true,"file":"Research Symbol.dc.html","round":"REDO","rev":"2026-09-17.1","inNav":false,"group":null},
  {"path":"/research/compare","label":"Compare","crumbs":["Research","Analyze"],"designed":true,"file":"Research Compare.dc.html","round":"NEW","rev":"2026-09-17.1","inNav":true,"group":"Research"},
  {"path":"/research/history","label":"History","crumbs":["Research","Analyze"],"designed":true,"file":"Research History.dc.html","round":"NEW","rev":"2026-09-17.1","inNav":true,"group":"Research"},
  {"path":"/research/lab/today","label":"Stock ratings · method","crumbs":["Research","Discover"],"designed":true,"file":"Research Lab Today.dc.html","round":"LAB","rev":"2026-09-22.6","inNav":false,"group":null},
  {"path":"/research/lab/screener","label":"Stock screen · method","crumbs":["Research","Discover"],"designed":true,"file":"Research Lab Screener.dc.html","round":"LAB","rev":"2026-09-20.4","inNav":false,"group":null},
  {"path":"/research/lab/symbol","label":"Symbol · method","crumbs":["Research","Analyze"],"designed":true,"file":"Research Lab Symbol.dc.html","round":"LAB","rev":"2026-09-20.4","inNav":false,"group":null},
  {"path":"/research/lab/history","label":"History · method","crumbs":["Research","Analyze"],"designed":true,"file":"Research Lab History.dc.html","round":"LAB","rev":"2026-09-20.4","inNav":false,"group":null},
  {"path":"/research/lab/calibration","label":"Calibration","crumbs":["System","Data"],"designed":true,"file":"Research Lab Calibration.dc.html","round":"LAB","rev":"2026-09-20.4","inNav":true,"group":"System"},
  {"path":"/research/lab/discover-model","label":"Discover model","crumbs":["System","Data"],"designed":true,"file":"Research Lab Discover Model.dc.html","round":"LAB","rev":"2026-09-20.4","inNav":true,"group":"System"},
  {"path":"/review/playbook-stats","label":"Playbook stats","crumbs":["Review"],"designed":true,"file":"Review Playbook Stats.dc.html","round":"NEW","rev":"2026-09-18.1","inNav":true,"group":"Review"},
  {"path":"/review/objectives","label":"Objectives","crumbs":["Review"],"designed":true,"file":"Review Objectives.dc.html","round":null,"rev":"2026-09-20.5","inNav":true,"group":"Review"},
  {"path":"/research/book","label":"The Book","crumbs":[],"designed":true,"file":"Research Book.dc.html","round":null,"rev":"2026-09-20.24","inNav":false,"group":null},
  {"path":"/research/journal","label":"Journal","crumbs":["The Book"],"designed":true,"file":"Research Journal.dc.html","round":null,"rev":"2026-09-19.2","inNav":false,"group":null},
  {"path":"/research/signal-decay","label":"Signal Decay","crumbs":["Research","Validate"],"designed":true,"file":"Research Signal Decay.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Research"},
  {"path":"/research/backtest","label":"Backtest","crumbs":["Research","Validate"],"designed":true,"file":"Research Backtest.dc.html","round":"OLD","rev":"2026-09-22.6","inNav":true,"group":"Research"},
  {"path":"/research/signal-health","label":"Signal Health","crumbs":["System","Data"],"designed":true,"file":"Research Signal Health.dc.html","round":null,"rev":"2026-09-19.2","inNav":true,"group":"System"},
  {"path":"/research/lens-coverage","label":"Lens Coverage","crumbs":["System","Data"],"designed":true,"file":"Research Lens Coverage.dc.html","round":"OLD","rev":"2026-09-19.2","inNav":true,"group":"System"},
  {"path":"/research/watchlist","label":"Watchlist","crumbs":["The Book"],"designed":true,"file":"Research Watchlist.dc.html","round":null,"rev":"2026-09-18.2","inNav":false,"group":null},
  {"path":"/research/greeks","label":"Contract Greeks","crumbs":["Risk","Portfolio Exposure"],"designed":true,"file":"Research Contract Greeks.dc.html","round":null,"rev":"2026-09-23.3","inNav":false,"group":null},
  {"path":"/research/narrative","label":"Narrative","crumbs":["Research","Analyze"],"designed":true,"file":"Research Narrative Lens.dc.html","round":null,"rev":"2026-09-19.2","inNav":false,"group":null},
  {"path":"/research/copilot","label":"Copilot","crumbs":[],"designed":true,"file":"Research Copilot.dc.html","round":"REDO","rev":"2026-09-22.6","inNav":false,"group":null},
  {"path":"/research/daily-brief","label":"Daily Brief","crumbs":["Home"],"designed":true,"file":"Research Daily Brief.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Home"},
  {"path":"/research/copilot/trading","label":"Book starters","crumbs":["Copilot"],"designed":true,"file":"Research Copilot.dc.html","round":"REDO","rev":"2026-09-21.1","inNav":false,"group":null},
  {"path":"/research/agent-personas","label":"Personas","crumbs":["System","Agents"],"designed":true,"file":"Research Copilot.dc.html","round":"REDO","rev":"2026-09-21.1","inNav":true,"group":"System"},
  {"path":"/research/orchestration","label":"Orchestration","crumbs":["System","Agents"],"designed":true,"file":"Research Orchestration.dc.html","round":null,"rev":"2026-09-21.1","inNav":true,"group":"System"},
  {"path":"/research/loop/harness","label":"Autopilot","crumbs":[],"designed":true,"file":"Research Autopilot Console.dc.html","round":null,"rev":"2026-09-22.6","inNav":false,"group":null},
  {"path":"/research/loop/objectives/obj-daily-stock","label":"Daily Loop Stock Explorer","crumbs":["Autopilot"],"designed":true,"file":"Research Objective.dc.html","round":null,"rev":"2026-09-20.1","inNav":false,"group":null},
  {"path":"/research/loop/objectives/obj-earnings-iv","label":"Earnings-week IV","crumbs":["Autopilot"],"designed":true,"file":"Research Objective.dc.html","round":null,"rev":"2026-09-20.1","inNav":false,"group":null},
  {"path":"/research/loop/objectives/obj-smallcap-sepa","label":"Small-cap SEPA","crumbs":["Autopilot"],"designed":true,"file":"Research Objective.dc.html","round":null,"rev":"2026-09-20.3","inNav":false,"group":null},
  {"path":"/research/loop/objectives/obj-vol-crush","label":"Post-earnings vol crush","crumbs":["Autopilot"],"designed":true,"file":"Research Objective.dc.html","round":null,"rev":"2026-09-20.3","inNav":false,"group":null},
  {"path":"/research/loop/runs","label":"Loop Run","crumbs":["Autopilot"],"designed":true,"file":"Research Autopilot Console.dc.html","round":null,"rev":"2026-09-18.2","inNav":false,"group":null},
  {"path":"/research/loop/decisions","label":"Decision Inbox","crumbs":["Review"],"designed":true,"file":"Research Autopilot Decisions.dc.html","round":"OLD","rev":"2026-09-23.1","inNav":true,"group":"Review"},
  {"path":"/research/loop/hypotheses","label":"Hypothesis Board","crumbs":["The Book"],"designed":true,"file":"Research Hypothesis Board.dc.html","round":null,"rev":"2026-09-18.2","inNav":false,"group":null},
  {"path":"/research/loop/candidates","label":"Candidate Pool","crumbs":["The Book"],"designed":true,"file":"Research Candidate Pool.dc.html","round":null,"rev":"2026-09-18.2","inNav":false,"group":null},
  {"path":"/trade/desk","label":"Trade","crumbs":[],"designed":true,"file":"Trade Desk.dc.html","round":"OLD","rev":"2026-09-20.23","inNav":true,"group":"Trade"},
  {"path":"/trade/plans","label":"Plans","crumbs":["Trade"],"designed":true,"file":"Trade Plans.dc.html","round":"OLD","rev":"2026-09-18.1","inNav":true,"group":"Trade"},
  {"path":"/trade/fills","label":"Orders & Fills","crumbs":["Trade"],"designed":true,"file":"Trade Fills.dc.html","round":"OLD","rev":"2026-09-18.1","inNav":true,"group":"Trade"},
  {"path":"/trade/rules","label":"Rules","crumbs":["Trade"],"designed":true,"file":"Trade Desk.dc.html","round":"OLD","rev":"2026-09-18.1","inNav":true,"group":"Trade"},
  {"path":"/trade/playbook","label":"Playbook","crumbs":["Trade"],"designed":true,"file":"Trade Playbook.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Trade"},
  {"path":"/review","label":"Review","crumbs":[],"designed":true,"file":"Review Queue.dc.html","round":null,"rev":"2026-09-20.23","inNav":true,"group":"Review"},
  {"path":"/review/fit","label":"Single trade","crumbs":["Review"],"designed":true,"file":"Review Fit.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Review"},
  {"path":"/review/habits","label":"Habits","crumbs":["Review"],"designed":true,"file":"Review Habits.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Review"},
  {"path":"/review/proposals","label":"Rule proposals","crumbs":["Review"],"designed":true,"file":"Research Autopilot Decisions.dc.html","round":"OLD","rev":"2026-09-23.1","inNav":false,"group":null},
  {"path":"/portfolio/performance","label":"Performance","crumbs":["Portfolio"],"designed":true,"file":"Portfolio Performance.dc.html","round":null,"rev":"2026-09-17.2","inNav":true,"group":"Portfolio"},
  {"path":"/portfolio/positions","label":"Positions","crumbs":["Portfolio","Performance"],"designed":true,"file":"Portfolio Positions.dc.html","round":"OLD","rev":"2026-09-23.3","inNav":true,"group":"Portfolio"},
  {"path":"/portfolio/backing","label":"Backing & Model","crumbs":["Portfolio","Performance"],"designed":true,"file":"Portfolio Backing.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Portfolio"},
  {"path":"/portfolio/outcome","label":"Outcome","crumbs":["Portfolio","Performance"],"designed":true,"file":"Portfolio Outcome.dc.html","round":"OLD","rev":"2026-09-17.1","inNav":true,"group":"Portfolio"},
  {"path":"/portfolio/accounts","label":"Accounts","crumbs":["Portfolio"],"designed":true,"file":"Portfolio Accounts.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Portfolio"},
  {"path":"/portfolio/ledger","label":"Trade Ledger","crumbs":["Portfolio","Accounts"],"designed":true,"file":"Portfolio Ledger.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Portfolio"},
  {"path":"/portfolio/transfer","label":"Transfer & Pay","crumbs":["Portfolio","Accounts"],"designed":true,"file":"Portfolio Transfer.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Portfolio"},
  {"path":"/portfolio/corporate-actions","label":"Corporate Actions","crumbs":["Portfolio","Accounts"],"designed":true,"file":"Portfolio Corporate Actions.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Portfolio"},
  {"path":"/trade/assignment","label":"Assignment","crumbs":["Trade"],"designed":true,"file":"Trade Assignment.dc.html","round":null,"rev":"2026-09-17.1","inNav":true,"group":"Trade"},
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
  {"path":"/docs/research-menu","label":"Research menu","crumbs":["System","Reference","Design"],"designed":true,"file":"Docs Research Menu.dc.html","round":null,"rev":"2026-09-22.5","inNav":true,"group":"System"},
]
