import { describe, expect, it } from 'vitest'
import { PAGE_ROUTES } from '@/layout/routeRegistry'
import {
  adoptionByGroup,
  adoptionCounts,
  adoptionGroupOf,
  adoptionRows,
  DESIGN_REV,
} from './adoption'
import { DESIGN_ROUTES } from './designRoutes.generated'
import { revIsNewer } from './rev'

const rows = adoptionRows()
const counts = adoptionCounts(rows)

describe('design adoption', () => {
  it('makes every app page say where it stands', () => {
    // The ratchet. A page the design does not have is `staging` by derivation,
    // so a new page added without a thought lands in "to ask" — which is the
    // right default, but only if someone reads it. This fails instead: say
    // where it goes (`moving`) or that nobody knows yet (`staging`), in the
    // entry, with a note. A page waiting for the Owner's look says what was
    // walked and when.
    const unexplained = rows
      .filter((r) => (r.state === 'staging' || r.state === 'reviewing') && !r.note)
      .map((r) => r.path)
    expect(unexplained, 'staging or reviewing without a note').toEqual([])
  })

  it('counts against the design, not against itself', () => {
    // Dozens of design prototypes have no page here. A denominator taken from
    // the app would read near complete while most of the design is unbuilt.
    expect(counts.designed).toBe(DESIGN_ROUTES.filter((d) => d.designed).length)
    expect(counts.designed).toBeLessThan(PAGE_ROUTES.length + counts.byState.unbuilt)
  })

  it('accounts for every design route exactly once', () => {
    // Each design route is either a row of its own, or reached through a page
    // that answers to its old name. Nothing counted twice, nothing dropped.
    const owned = new Set<string>()
    for (const r of rows) {
      if (r.design) owned.add(r.design.path)
      for (const a of r.aliasOf ?? []) owned.add(a)
    }
    const missing = DESIGN_ROUTES.filter((d) => !owned.has(d.path)).map((d) => d.path)
    expect(missing).toEqual([])
  })

  it('does not call an adopted page unbuilt because the design uses its old name', () => {
    // The design keeps the six retired hubs as deep links onto the Symbol
    // page's tabs — its own decision. Counting them as work left inflated the
    // backlog by five.
    const symbol = rows.find((r) => r.path === '/research/symbol')
    expect(symbol?.aliasOf).toContain('/research/vol-regime')
    expect(symbol?.aliasOf).toContain('/research/discovery')
    expect(rows.filter((r) => r.state === 'unbuilt').map((r) => r.path)).not.toContain(
      '/research/vol-regime',
    )
  })

  it('only calls a redirect an alias when both paths are the same prototype', () => {
    // `/research/screener` is the design's Stock screen
    // (`Research Screener.dc.html`); the app's Option Screener is its Contracts
    // page (`Research Contract Screener.dc.html`) and moved onto its own path
    // on 2026-09-15. While the first forwarded to the second, counting the
    // forward as adoption would have retired the Stock screen from "to build"
    // without anyone building it — which is the rule this test pins. The Owner
    // ruled on 2026-09-20 that this side's SEPA-conditions page *is* that
    // screen, so it holds the path itself now and answers for itself.
    const home = rows.find((r) => r.path === '/research/screener')
    expect(home?.state).toBe('aligned')
    expect(home?.inApp).toBe(true)
    const contracts = rows.find((r) => r.path === '/research/contract-screener')
    expect(contracts?.state).toBe('pending')
    expect(contracts?.aliasOf).toBeUndefined()
    // The Analyze hubs are the case the rule has to keep: all of them resolve
    // to the prototype the Symbol page was built from.
    expect(rows.find((r) => r.path === '/research/symbol')?.aliasOf).toEqual([
      '/research/vol-regime',
      '/research/dealer-levels',
      '/research/scenario',
      '/research/flow',
      '/research/discovery',
    ])
  })

  it('keeps the tracker out of its own list', () => {
    expect(rows.map((r) => r.path)).not.toContain('/docs/design-adoption')
  })

  it('keeps stubs out of the walk and the build', () => {
    // A stub has no prototype: nothing to compare a page against, nothing to
    // build from. Counted under "to walk" and "to build", those lists read 40
    // and 41 against a denominator they could never reach.
    for (const r of rows) {
      if (r.aliasOf) continue
      if (r.state === 'pending' || r.state === 'unbuilt') {
        expect(r.design?.designed, r.path).toBe(true)
      }
      if (r.state === 'backlog') expect(r.design?.designed, r.path).toBe(false)
    }
    expect(counts.stubs).toBe(DESIGN_ROUTES.length - counts.designed)
    expect(counts.byState.backlog).toBeLessThanOrEqual(counts.stubs)
  })

  it('reads the walk as it stands', () => {
    // Replace these as pages are walked — they are the numbers the Owner reads.
    // Owner list 2026-09-15: all five at Rev 2026-09-15.5. Owner 2026-09-16:
    // Accounts and Transfer & Pay signed off at their page rev 2026-09-16.9.
    // Rev .11 moved Accounts to .11 (the role word and the Data from string,
    // both already built that way); the Owner re-signed it at .11 the same day.
    // Owner 2026-09-17: Trade Ledger signed off at page rev 2026-09-16.9, then
    // Performance at its page rev 2026-09-16.11 (nine walked).
    // Rev 2026-09-17.1 (§14.7, colour tokens only) moved Accounts, Ledger,
    // Transfer & Pay, Symbol and Performance, so those five read stale until the
    // Owner's colour look; the Owner re-signed all five at .17.1 the same day.
    // Outcome signed off 2026-09-17, the first page built from nothing rather
    // than walked against a page the app already had (aligned 9→10).
    // Risk Portfolio Exposure signed off 2026-09-17 — the first page outside
    // the Portfolio group (aligned 10→11). Package 2026-09-17.4 then moved
    // Performance's own page rev to .2 for the one legend sentence P3 asked
    // for, so it read stale for exactly as long as it took the Owner to look:
    // the app already draws what the corrected sentence says, so there was
    // nothing to rebuild and the re-stamp was the whole of the work.
    // Positions and Backing & Model signed off the same day, closing the
    // Portfolio walk: every page in that group is now in place (aligned 11→13).
    // Stress & Scenario signed off the same day (aligned 13→14), then Orders
    // & Fills (aligned 14→15), then Margin & Buying Power (aligned 15→16)
    // and Assignment (16→17), then Limits & Breaches (17→18). Today signed off
    // after it was re-laid out to the design's shape (18→19). P&L Explain and
    // Corporate Actions signed off 2026-09-18, the last two Portfolio pages
    // waiting for a look (19→21) — both were built from nothing, and both
    // spent their review carrying a band that could not read: the first now
    // keeps the thesis table's shape with a NO HYPOTHESIS STORE row, and the
    // second stopped blaming its feed for a calendar the issuers have not
    // declared yet.
    // Positions, the Review Queue and Playbook stats signed off 2026-09-18
    // once the Strategy pages retired, which emptied both groups' queues.
    // Limits, Sizing and Budget followed the same day, after the three were
    // walked cell by cell against their prototypes — Sizing's strip was five
    // cells where the design has four, Budget was missing the week ratio and
    // the daily band, Limits had dropped its history table and its
    // acknowledgement slot. That closes Risk (aligned 24→27). Then the five
    // Trade pages — Desk, Plans, Orders & Fills, Rules, Expiration — signed off
    // together 2026-09-18, after the sidebar itself was re-cut to the design's
    // shape (one Desk home row carrying all six) and Playbook was walked
    // (aligned 27→32). The same evening the Owner opened Plans against the
    // prototype and found the walk had covered the handoff diff, not the whole
    // page — scope bar, inbox signpost, inspector sections, footnotes. The
    // sign-off is withdrawn while it is rebuilt (aligned 32→31). Rebuilt the
    // same evening — and Playbook's own second look dissolved two of its
    // "deliberate" divergences by reading the server — the Owner signed both
    // off together (aligned 31→33). Trade joins Home, Portfolio, Review and
    // Risk as a finished group.
    // Package 2026-09-19.1 (the Research Vision baseline) then moved twelve
    // Research routes to Rev 2026-09-18.2. Four signed-off pages read stale —
    // Decision Inbox (patch cards, the six verbs, ?card=), Symbol (the verdict
    // panel and the verbs), Copilot Desk and Personas (the anchored dock and
    // the Track record table) — each claimed by a batch of the Vision plan
    // (aligned 33→29, stale 0→4); the sum still reconciled to the 33 the walk
    // had reached, a stale row being a comparison that moved, not work lost.
    // Overview is the first page signed off against the baseline
    // (2026-09-19, after the same look retired the seat rail and set the
    // loop group order): reviewing→aligned grows the walked set to 34.
    // Still 34 walked; the split inside it moved. Package 2026-09-20.3 turned
    // three walked pages into the headings of their own layers (§5a.1) — the
    // Research Overview, the Trade Desk and the Review Queue are each now the
    // layer itself rather than its first row — so they leave `aligned` for
    // `stale` without leaving the walked set.
    //
    // 41 with Stock ratings: built from nothing on 2026-09-21, re-walked the
    // same day after the Owner read it beside the prototype — the ranked list
    // was five hundred rows with no filter bar, and the lens cells were solid
    // colour where the design is a quiet track — and signed off after. 42 with
    // the Journal, built and walked the same day: The Book's index, joined out
    // of five stores because no artifact store exists on this side. 43 with
    // the Candidate Pool, whose walk found the page's two verbs squeezed to
    // sixteen pixels by a fixed table with no column widths. 44 with the
    // Hypothesis Board, whose scope had resolved down one road only.
    expect(counts.aligned + counts.byState.stale).toBe(44)
    expect(counts.aligned).toBe(37)
    expect(rows.filter((r) => r.state === 'stale').map((r) => r.path).sort()).toEqual([
      '/research/agent-personas',
      '/research/copilot',
      '/research/loop/decisions',
      '/research/overview',
      '/research/symbol',
      '/review',
      '/trade/desk',
    ])
    // Backing & Model was walked and built in C6 (2026-09-15) but never tagged;
    // it waits for the Owner's look (pending 19→18). Plans joined it in R9-6,
    // built on the strategy_plan table. Transfer & Pay joined in R12, built in
    // R11 against Rev 2026-09-16.9 (pending 22→21). Accounts joined in R12,
    // built against Rev 2026-09-16.9 (pending 21→20). Both left for aligned
    // on the Owner's look (reviewing 4→2). Trade Ledger joined in R13, built
    // against page rev 2026-09-16.9 (pending 20→19, reviewing 2→3), then
    // aligned on the Owner's look (reviewing 3→2). Performance walked and built
    // 2026-09-17 against page rev 2026-09-16.11 (pending 19→18, reviewing 2→3),
    // then signed off by the Owner (reviewing 3→2). Positions walked and built
    // 2026-09-17 against page rev 2026-09-17.1 (pending 18→17, reviewing 2→3).
    // Outcome is the first page built from nothing: the design had a prototype
    // and the app had no page, so it leaves `unbuilt` rather than `pending`
    // (unbuilt 43→42, reviewing 3→4), then aligned on the Owner's look
    // (reviewing 4→3). P&L Explain is the second built from nothing, and the
    // first whose central identity the data cannot evaluate at all
    // (unbuilt 42→41, reviewing 3→4). Risk Portfolio Exposure is the first
    // page outside the Portfolio group, built under the Owner's option-b ruling
    // (unbuilt 41→40, reviewing 4→5), then aligned on the Owner's look
    // (reviewing 5→4). Stress & Scenario is the drill-down Exposure points at
    // (unbuilt 40→39, reviewing 4→5). Positions and Backing & Model, built in
    // C6 and R14 and waiting since, signed off 2026-09-17 (reviewing 5→3).
    // Expiration Desk is the first page in the Trade group (unbuilt 39→38,
    // reviewing 3→4), then Stress & Scenario aligned on the Owner's look
    // (reviewing 4→3). Orders & Fills is the desk's window on the ledger's own
    // fills (unbuilt 38→37, reviewing 3→4), then aligned on the Owner's look
    // (reviewing 4→3). Margin & Buying Power is the link Positions and Backing
    // both wanted (unbuilt 37→36, reviewing 3→4), then aligned on the Owner's
    // look (reviewing 4→3). Assignment is Expiration's other half
    // (unbuilt 36→35, reviewing 3→4), then aligned on the Owner's look
    // (reviewing 4→3). Limits & Breaches closes the readable part of Risk
    // (unbuilt 35→34, reviewing 3→4), then aligned on the Owner's look after it
    // was rebuilt to carry all twelve rules (reviewing 4→3). Corporate Actions
    // is the last page of the Portfolio group (unbuilt 34→33, reviewing 3→4).
    // Today closes the Home group the same day (unbuilt 33→32, reviewing 4→5),
    // then Risk Budget and Sizing close the Risk group (unbuilt 32→30,
    // reviewing 5→7), then all five Review pages at once (unbuilt 30→25,
    // reviewing 7→12), and Today was signed off (reviewing 12→11). P&L Explain
    // and Corporate Actions were signed off together 2026-09-18 (11→9), which
    // emptied Portfolio's queue: every page still waiting for a look is now
    // outside that group. The four Review pages rebuilt on 2026-09-18 — Single
    // trade, Habits, Playbook stats and Rule proposals — were signed off the
    // same day (aligned 21→25, reviewing 9→5). The Queue is not among them: it
    // was walked at page rev 2026-09-17.1 and still waits for its own look.
    //
    // Package 2026-09-18.1 then moved nine routes' own rev the same evening —
    // trade desk/plans/fills/rules, risk limits/sizing/budget, review
    // playbook-stats and portfolio positions — for the Strategy dissolution and
    // the unified limit model. Four of those are pages that had been signed
    // off, so they read stale until the diff is walked (aligned 25→21,
    // stale 0→4), and Portfolio stops being a finished group.
    //
    // Trade › Rules is the first page built against that package: the read side
    // of the four-column chain, and the home the seven Strategy pages move into
    // (unbuilt 25→24, reviewing 5→6). Then the three Risk pages the same
    // package moved were re-walked against it — Limits leaves `stale` for
    // `reviewing`, Sizing and Budget are re-stamped at .18.1 — so the stale set
    // is three and Risk waits on one look for all three. Playbook Stats is
    // re-walked next, absorbing Win Rate as a grouping switch, which takes the
    // stale set to two and Review back to waiting on two looks. Orders & Fills
    // follows — the order boundary stated in full and every fake jump made
    // real — leaving Positions as the only page the design has moved past.
    // Positions closes it: the Instance row on the Risk profile face, where the
    // rename is a real PATCH and the status is a reading, because no column
    // stores one (stale 1→0, reviewing 9→10). Then the Desk is built from
    // nothing on the Owner's ruling of 2026-09-18 — three lanes, and the hedge
    // menu moved onto it from Strategy › Instances rather than armed there
    // (unbuilt 24→23, reviewing 10→11). The Owner then signed off Portfolio and
    // Review together, the same day the seven Strategy pages retired
    // (aligned 21→24, reviewing 11→8), then Risk the same day (24→27,
    // reviewing 8→5): what was left waiting was the five Trade pages, signed off
    // together 2026-09-18 once the Trade sidebar matched the design's shape
    // (aligned 27→32, reviewing 5→0). Playbook — the one Trade page never
    // walked — was walked and built the same day against its page rev
    // 2026-09-17.1 (pending 17→16, reviewing 0→1). Plans rejoined it the same
    // evening: the Owner's look found the page thinner than its prototype, so
    // its sign-off was withdrawn while the full walk was built (aligned 32→31,
    // reviewing 1→2). Both were rebuilt against their prototypes and signed
    // off together 2026-09-18 (aligned 31→33, reviewing 2→0): every walked
    // page is in place, and Trade closes at 7/7.
    // Batch R1 of the Research walk (2026-09-18): the Autopilot tree —
    // harness (the prototype's own ruling: the seat home is not redesigned,
    // only the context strip is new), Hypothesis Board (rebuilt to the card
    // grid, lanes in the server's vocabulary) and Candidate Pool (strip, age,
    // trued footnotes) — walked and built, waiting on the Owner's look
    // (pending 16→13, reviewing 0→3). Package 2026-09-19.1 replaced all three
    // walks' baselines the next day — harness now has its own Console
    // prototype, the Board and the Pool gained operator tags and the verb row
    // — so W1 re-walked all three against .18.2 (reviewing holds at 3, revs
    // move) and walked Overview (rebuilt: dial strip, operator cards, six
    // stations, the Book, Today, Health) and the Workbench home (context
    // strip only — the prototype's own ruling that the seat home is not
    // redesigned) for the first time (pending 16→14, reviewing 3→5). Overview
    // left for aligned on the Owner's look 2026-09-19 (reviewing 5→4).
    // 9: the three layer pages, `/research/screener` after the Owner's
    // naming ruling, and `/review/objectives` — built on option (c) with its
    // chain honestly broken. Then `/risk` and `/portfolio` were re-walked
    // section by section against their prototypes on the Owner's reading that
    // the first builds were not close enough, and `/portfolio` was signed off
    // at the end of that pass (reviewing 9→8, aligned 27→28). `/review/
    // objectives` followed: re-walked under the interaction standard — the
    // page's duplicate objective control dropped for the shell's own scope,
    // the design's last column and floor line added, every link clicked — and
    // signed off (reviewing 8→7, aligned 28→29). `/research/screener` follows,
    // signed off knowing it is unfinished — the funnel, the rail and the loop
    // are enough to use, and its note lists what a later round still owes
    // (reviewing 7→6, aligned 29→30). Then the two layer pages that had been
    // walked twice and were waiting only on a look — `/research/book` and
    // `/risk` — were signed off together (reviewing 6→4, aligned 30→32). What
    // is left in `reviewing` is the R1 batch: three loop pages built before
    // the interaction standard existed. Autopilot leaves it first: the
    // page-level Runs today section it had never had was built, and the two
    // things it cannot draw — five objective states, the three-origin New
    // objective panel — are named on the page (reviewing 4→3, aligned 32→33).
    // Then Stock ratings was built from nothing — the page the Screener's Rank
    // by was blocked on — which is the first row to leave `unbuilt` for
    // `reviewing` in this round (unbuilt 27→26, reviewing 3→4). The Journal
    // followed the same way on 2026-09-21 (unbuilt 26→25, reviewing 4→5): The
    // Book's index, joined out of five stores because no artifact store
    // exists on this side. Then Stock ratings was signed off the same day
    // (reviewing 5→4, aligned 33→34), and the Journal after its own walk
    // (reviewing 4→3, aligned 34→35), and the Candidate Pool after its
    // own (reviewing 3→2, aligned 35→36), and the Hypothesis Board last
    // (reviewing 2→1, aligned 36→37) — what is left in `reviewing` is
    // Pipeline alone.
    expect(counts.byState.reviewing).toBe(1)
    expect(
      rows
        .filter((r) => r.state === 'aligned')
        .map((r) => r.path)
        .sort(),
    ).toEqual([
      '/home',
      '/portfolio',
      '/portfolio/accounts',
      '/portfolio/backing',
      '/portfolio/corporate-actions',
      '/portfolio/ledger',
      '/portfolio/outcome',
      '/portfolio/performance',
      '/portfolio/pnl-explain',
      '/portfolio/positions',
      '/portfolio/transfer',
      '/research/book',
      '/research/copilot/trading',
      '/research/journal',
      '/research/loop/candidates',
      '/research/loop/harness',
      '/research/loop/hypotheses',
      '/research/ratings/stocks',
      '/research/screener',
      // `/research/overview`, `/review` and `/trade/desk` left this list for
      // `stale`: each became the heading of its own layer in Package
      // 2026-09-20.3 (§5a.1), which is a change to the page, not only to the
      // tree around it.
      '/review/fit',
      '/review/habits',
      '/review/objectives',
      '/review/playbook-stats',
      '/review/proposals',
      '/risk',
      '/risk/budget',
      '/risk/limits',
      '/risk/margin',
      '/risk/portfolio',
      '/risk/sizing',
      '/risk/stress',
      '/trade/assignment',
      '/trade/expiration',
      '/trade/fills',
      '/trade/plans',
      '/trade/playbook',
      '/trade/rules',
    ])
    expect(rows.filter((r) => r.state === 'reviewing').map((r) => r.path).sort()).toEqual([
      '/research/workbench',
    ])
    // Was ten: the seven Strategy pages plus Momentum Radar, SEPA Daily Core
    // and Backtest. The seven retired on 2026-09-18 once every capability they
    // carried had a home — they are redirects now, and a redirect is not a row
    // here, so `moving` is the three the design still dissolves elsewhere.
    expect(counts.byState.moving).toBe(3)
    // Rev 2026-09-15.13 collapsed nine `/system/*` routes into `/system/status`
    // and `/settings` (the Owner's OLTP/OLAP/Ops ruling). The app still has the
    // nine pages, so each one asks where it goes — that is nine rows in "to
    // ask". `/research/stock-screener` used to be the tenth; the Owner's
    // 2026-09-20 ruling answered it, so the page holds the design's own path
    // and nothing here is waiting on Design any more.
    expect(counts.byState.staging).toBe(9)
    expect(rows.filter((r) => r.state === 'staging').map((r) => r.path).sort()).toEqual([
      '/system/api',
      '/system/coverage',
      '/system/daemon',
      '/system/data-readiness',
      '/system/feed',
      '/system/ib',
      '/system/platform',
      '/system/socket',
      '/system/topology',
    ])
    // Rev 2026-09-15.13: the design filled almost all of its own backlog — the
    // Risk layer, the Portfolio accounts cluster, the market and workbench data
    // pages, Copilot/Autopilot, Assignment. 82 routes, 78 with a prototype, and
    // only four stubs left (all `/docs/*` reference pages, deliberately last).
    // The denominator nearly doubled, so "to build" grew with it: those pages
    // now have a design to build against, which they did not before.
    // Package 2026-09-19.1 grew it again (78→84): Journal, the Narrative lens,
    // the Artifact Dock concept page, the two objective fixture rows and the
    // runs stem. Package 2026-09-20.1 grew it to 88: the Review Objectives
    // closing page, the Research menu reference, and the two objective rows
    // repointed at their own page rather than the Console. Nothing was
    // removed, and no already-walked page moved rev — the Lab dissolution and
    // the Discover flattening change where Research pages *live*, not what
    // any aligned page concludes.
    // Package 2026-09-20.3 grew it to 91: the three layer overview pages —
    // `/risk`, `/portfolio` and `/research/book` — which exist because a
    // layer that is only a container cannot be its own first child (§5a.1).
    expect(counts.designed).toBe(91)
    // 24 until Trade › Desk was built 2026-09-18; 26 since Package 2026-09-19.1
    // added Journal, Narrative and the Artifact Dock concept page — all three
    // designed with no app page yet (Journal and Narrative are Vision batches
    // W4/W5; the concept page is the design's own reference). 30 since Package
    // 2026-09-20.1: Review Objectives and the Research menu reference are new
    // pages, and the two Lab routes that moved to System › Data took their
    // unbuilt state with them rather than being counted twice. 29 since
    // `/research/ratings` became a redirect to Vol ratings — the design
    // carries it as an alias of that same page, so it is answered, not built.
    // 32 with Package 2026-09-20.3's three layer overview pages, back to 29
    // once all three were built, 28 when the Owner's ruling gave the Stock
    // screen to a page that exists, and 27 with Review Objectives. 26 with
    // Stock ratings, and 25 with the Journal — W4's own page, built the day
    // after (2026-09-21).
    expect(counts.byState.unbuilt).toBe(25)
    // 20 until R13 tagged Trade Ledger: `pending` is the built-but-unwalked
    // pool, so a page leaving it for `reviewing` takes one off this count.
    // 18 since Performance joined `reviewing`; 16 since Playbook did; 13 since
    // the Autopilot tree did (R1); 16 since Package 2026-09-19.1 seeded the two
    // objective rows and the runs stem, which the app answers at `:param`
    // routes (the objective page, the run redirect into the console drawer) —
    // built, designed, not yet walked. 14 since W1 walked Overview and the
    // Workbench home.
    expect(counts.byState.pending).toBe(14)
    expect(
      rows
        .filter((r) => r.via)
        .map((r) => r.path)
        .sort(),
    ).toEqual([
      '/research/loop/objectives/obj-daily-stock',
      '/research/loop/objectives/obj-earnings-iv',
      '/research/loop/runs',
    ])
    expect(counts.byState.backlog).toBe(4)
  })

  it('does not call a walked page stale because some other page moved', () => {
    // The package's global Rev moves on every registry change; a page's own rev
    // moves only when that page's design does. Comparing against the global one
    // marked all five walked pages stale the moment `/docs/omnibar` retired, and
    // again when Rev went .5 → .13 for work on entirely different pages.
    //
    // R11 re-froze at Rev 2026-09-16.9 and the whole diff was that one line: the
    // design's `shell-registry.js` had left the six redone Portfolio pages
    // stamped 2026-09-15.10, so the redo read as "nothing moved". R12 re-froze at
    // .10, where Design filled those stamps in — nine Portfolio routes advanced
    // (six to .9, outcome and corporate-actions to .8, pnl-explain to .7). Route
    // and designed counts held at 82 / 78, and none of the walked pages went
    // stale: no walked page was a Portfolio page yet. Accounts and Transfer &
    // Pay are now, both at .9 — a Portfolio redo will surface here as stale.
    // Rev .11 did exactly that for Accounts: it moved to .11 and read stale
    // until the Owner re-signed it there. Performance, Positions and Backing
    // moved too (table floors only), but none of them is aligned, so none of
    // them can go stale.
    //
    // Rev 2026-09-17.1 is the first time a walked page is honestly stale: §14.7
    // moved direction and unrealized colours on 61 routes, five of them walked.
    // The package's HANDOFF header still reads Rev 2026-09-16.11 (Design did not
    // bump it), so DESIGN_REV holds there while the page stamps say .17.1.
    // The Owner re-signed all five on the colour look, so none stays stale.
    // Package 2026-09-17.4 fixed the header the app reads (P1), so DESIGN_REV
    // finally moves with the body instead of lagging it by two revs.
    // Package 2026-09-20.1 @ Rev .11 is a full baseline. The .11 round bumps
    // only the global Rev — the glyph table is shell, not page — so the 28
    // aligned pages hold and `stale` does not move.
    expect(DESIGN_REV).toBe('2026-09-20.24')
    // Four, and honestly: Package 2026-09-19.1 moved exactly the pages the
    // Vision redesign touches — twelve Research routes to .18.2 — and only the
    // four that were signed off read stale; the rest of the walked set holds.
    // Each stale note names the batch that re-walks it (W2/W3), the same way
    // the count fell 4 → 0 across the .18.1 round.
    // 4 → 7: Package 2026-09-20.3 moved three more walked pages' own revs.
    expect(counts.byState.stale).toBe(7)
    for (const row of rows) {
      if (row.state !== 'aligned') continue
      // Every walked page carries the rev it was walked against, and the design
      // still stamps that page no later than it.
      expect(row.rev, row.path).toBeTruthy()
      expect(revIsNewer(row.design?.rev, row.rev), row.path).toBe(false)
    }
  })
})

describe('adoptionByGroup', () => {
  it('counts a group against every row it owns, not only the ones walked so far', () => {
    const groups = adoptionByGroup(rows)
    const portfolio = groups.find((g) => g.group === 'Portfolio')
    // The question the summary exists to answer. Portfolio was the first group
    // to finish — nine pages, all walked and all signed off — and then Package
    // 2026-09-18.1 moved Positions, which is what a group being "done" is
    // always one design round away from. The summary counts against every row
    // the group owns, so the group reads 8 of 9 rather than staying at nine
    // because nine pages happen to carry a tag. Positions was re-walked and
    // signed off on 2026-09-18, so the group is whole again — until the next
    // design round moves one of them.
    // And the next round did: `/portfolio` joined as the layer's own overview
    // page (§5a.1). It was built, re-walked section by section against the
    // prototype, and signed off 2026-09-20 — so the group is whole again at
    // ten of ten, with nothing left waiting on a look.
    expect(portfolio).toMatchObject({ total: 10, aligned: 10, left: 0 })
    expect(portfolio?.byState.reviewing).toBe(0)
    expect(portfolio?.byState.unbuilt).toBe(0)

    // The design's own backlog is nobody's work here, so it stays out of the
    // denominator: System's four `/docs/*` stubs do not make it read worse.
    const system = groups.find((g) => g.group === 'System')
    expect(system?.byState.backlog).toBe(4)
    expect(system?.total).toBe(rows.filter((r) => r.crumbs[0] === 'System' && r.state !== 'backlog').length)

    // Every row lands in exactly one group, and the totals reconcile.
    expect(groups.reduce((n, g) => n + g.total + g.byState.backlog, 0)).toBe(rows.length)
    expect(groups.reduce((n, g) => n + g.aligned, 0)).toBe(counts.aligned)
    // Closest to done first, so the group being walked sits at the top.
    expect(groups.map((g) => g.left)).toEqual([...groups.map((g) => g.left)].sort((a, b) => a - b))
  })
})

describe('adoptionGroupOf', () => {
  it('is the one derivation the tracker groups by, twice', () => {
    // The summary panel and each state's own list both group; two
    // derivations would eventually disagree and the reader would have no way
    // to tell which was lying.
    const byGroup = adoptionByGroup(rows)
    const counted = new Map<string, number>()
    for (const r of rows) {
      const g = adoptionGroupOf(r)
      counted.set(g, (counted.get(g) ?? 0) + 1)
    }
    for (const g of byGroup) {
      const all = g.total + g.byState.backlog
      expect(counted.get(g.group), `group ${g.group}`).toBe(all)
    }
    expect([...counted.keys()].sort()).toEqual(byGroup.map((g) => g.group).sort())
  })

  it('puts a layer page in its layer, not under Home', () => {
    // `/risk` carries no crumbs — the design flattened the layer trails — so
    // without the design-group fall-back every layer page lands under Home.
    const risk = rows.find((r) => r.path === '/risk')
    expect(risk?.crumbs).toEqual([])
    expect(adoptionGroupOf(risk!)).toBe('Risk')
  })
})
