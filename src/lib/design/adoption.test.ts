import { describe, expect, it } from 'vitest'
import { PAGE_ROUTES } from '@/layout/routeRegistry'
import {
  adoptionCounts,
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
    // Walked 2026-09-22 on its own path, signed 2026-09-23; what this line
    // pins is the `aliasOf`, not the state — the rule is that the forward
    // never counted as adoption.
    expect(contracts?.state).toBe('aligned')
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
    // Hypothesis Board, whose scope had resolved down one road only. 45 with
    // Pipeline, the layer page the design gave a scale to only after this side
    // reported that not one station page records what it made. Then the first
    // of the seven the design had moved past was re-walked: Research Overview
    // leaves `stale` for `reviewing`, which is outside this sum until the
    // Owner looks (45→44), and 45 again when the Owner signed it off the same
    // day — the first of the seven answered rather than counted. Review is the
    // second, and it moves inside the sum rather than into it: `stale` →
    // `reviewing` (45→44), with `aligned` untouched at 39 until the Owner
    // looks. The Desk is the third and moves the same way (44→43). The Owner
    // signed both off 2026-09-21, which closes the batch: the three layer
    // heads §5a.1 moved are answered and back in the sum (43→45, aligned
    // 39→41). Then the second batch left the sum while it waits for a look:
    // the Copilot and its Personas face, one prototype and one cause
    // (45→43). The Owner signed the Copilot the same day, and Package
    // 2026-09-21.4 took `/research/copilot/trading` with it: that package
    // moved all three Copilot rows' rev, so the Book starters page — walked
    // at .15.5 and not re-walked — reads stale (aligned 41, stale 3, so the
    // sum holds at 44).
    // Personas signed off the same day it was re-walked (aligned 41→42,
    // 44→45): the bench, the derived Path, and four record columns that say
    // why they are empty.
    // Orchestration signed off the day it was built, which closes the round
    // the Personas redesign opened (aligned 42→43, 45→46). Book starters —
    // the Copilot row the same package renamed — then left the sum for
    // `reviewing` while the Owner looks (46→45), and the Decision Inbox
    // followed it out of `stale` the same way (45→44), and Symbol — the last
    // page in `stale` — with it (44→43). Nothing is stale now: every walked
    // page is either in place or waiting on a look. Book starters and the
    // Decision Inbox were signed off the same day (43→45). Then the shell
    // restructure took the Research layer page and its census alias back for
    // a look (45→43): the layer grew a second face and the alias stopped
    // being a page of its own. Rule proposals followed them out the same
    // evening, merged into the Inbox as its fourth view (43→42).
    //
    // Package 2026-09-22.3 @ Rev .6 — the "one surface, three places"
    // restructure — moved three walked pages' own revs: Positions and the
    // Copilot page because "open beside" became one destination, the
    // Autopilot Console because its run drawer retired. All three are landed
    // and all three left the sum for `reviewing` rather than sitting in
    // `stale`, which is why aligned falls 42→39 while stale stays empty:
    // nothing here is owed work, only a look.
    //
    // The Owner walked the three faces that were one page short each,
    // 2026-09-22: Positions and the Watchlist signed off (39→41), which closes
    // Portfolio at ten of ten and The Book at four of four. The same look put
    // the Decision Inbox back in the queue (41→40): it had been signed off
    // 2026-09-21 and re-walked, and the Owner's reading is that the page still
    // does not match — the card bodies have the design's shape and not its
    // readings. Only the Owner's look puts a page in place, and the same rule
    // takes one back out.
    //
    // 2026-09-23, the Owner reading the confirm queue itself (40→55): four
    // Research pages, Alerts, Daily Brief and the layer page; the objective page
    // (four fixture rows on one look), Loop Run and the console, closing
    // Autopilot; the rebuilt Decision Inbox and the Rule proposals link onto it,
    // closing Review; then Live after Package 2026-09-23.2 (55→56), and the
    // Pipeline census face (56→57).
    //
    // Package 2026-09-23.2 answers the §15.2 disposition tables this side
    // asked for, and three signed pages go stale carrying the answers: Stock
    // ratings takes SEPA's five capabilities and Momentum's nine factors, and
    // Portfolio Exposure and Positions each grow a door into Contract Greeks,
    // which the design re-homed from Research › Analyze to Risk. The walked
    // set is unchanged at 57; three of them are now behind their own rev.
    // 57 → 56 when Stock ratings was re-walked on 2026-09-23 and left for
    // `reviewing`: a re-walked page is not a walked page until the Owner has
    // looked at it again. 56 → 54 when Portfolio Exposure and Positions grew
    // their doors into Contract Greeks and went the same way. 54 → 58 on
    // 2026-09-23, the Owner signing four together: Option screen, Stock
    // ratings, Portfolio Exposure and Positions, and Contract Greeks once its
    // door was findable — 59. Back to 58 when Stock ratings was re-walked
    // again for the Leaders view and left for `reviewing`. 59 when the Owner
    // signed that walk too.
    expect(counts.aligned + counts.byState.stale).toBe(59)
    // Package 2026-09-23.3 @ Rev .7 adds two more, and for a different reason:
    // Live and Alerts leave the left sidebar for the right rail's new Market
    // group, so their crumbs become `['Market']` and neither is in the design's
    // nav any more. Both were signed; both are now behind their own rev.
    expect(counts.aligned).toBe(57)
    expect(rows.filter((r) => r.state === 'stale').map((r) => r.path).sort()).toEqual([
      '/market/live',
      '/research/event-radar',
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
    // (reviewing 2→1, aligned 36→37). Pipeline closes the round
    // (reviewing 1→0, aligned 37→38): the layer page built to §5a.6's reduced
    // scale, then re-walked twice over its one live number — `Moved on` read
    // zero because 19 Save buttons stamp a vocabulary the census had never
    // learned, and the four lanes' capture verbs had been folded away with
    // nothing mounting them. `reviewing` is empty; what is left is the seven
    // pages the design moved past and the walk that has not started. The
    // first of those seven was re-walked and signed off the same day: Research
    // Overview, whose six-station table became the loop drawn as a circuit at
    // Rev 2026-09-20.23. Review follows it: the same §5a.1 bump, a page body
    // unchanged at .23, and an interaction sweep that found sixty-eight
    // mouse-only rows. The Trade Desk closes the batch — the three layer
    // heads §5a.1 moved, walked together because one section moved them. Both
    // were signed off the same day, so nothing waits on a look. Then batch
    // two: the Copilot gained the design's three-face tab strip and the
    // Personas page became its third face. Both signed off; what waits now is
    // Orchestration, the page Rev 2026-09-21.6 split out of Personas — built
    // and signed off the same day. What waits now is Book starters, the last
    // of the Copilot rows that package moved, the Decision Inbox and Symbol.
    // The first two were signed off; Symbol waits. Vol ratings joins it: the
    // option side of Stock ratings, walked the same evening, and the pass that
    // pulled the weights panel, the tape and the lens bar out of the Stocks
    // page so both ratings pages read one implementation (reviewing 1→2).
    //
    // Then the shell restructure (Rev 2026-09-22.2) takes the two routes of
    // the Research layer page with it: the equipment left the tree and the
    // Pipeline fold merged into the layer, so the layer page grew a second
    // face and its alias stopped being a page (aligned 45→43, reviewing 2→4).
    // Daily Brief joins them: it stopped being a per-symbol lens dashboard
    // and became the morning digest the design draws (reviewing 5→6).
    // Three more with Package 2026-09-22.3, and none of them for the usual
    // reason — they were aligned, the design moved one thing on each, and
    // that one thing was landed the same round: Positions' Ask, the Copilot
    // page's aside (which this side never grew) and the Console's run drawer
    // (reviewing 6→9).
    // The Watchlist is the tenth, and the first walked in this round rather
    // than caught by it: it was `pending`, and the design turns it from a
    // list into a ledger (reviewing 9→10, pending 12→11). The objective page
    // is the eleventh and twelfth — one `:param` route answers two design
    // rows, and the walk found four whole sections missing from a page built
    // from that design and never checked against it (reviewing 10→12,
    // pending 11→9). The Option screen is the thirteenth and closes the
    // Discover fold; its walk's finding is that the screener's chain store is
    // dark, which the page now diagnoses instead of going blank
    // (reviewing 12→13, pending 9→8). Signal Decay is the fourteenth: it was
    // a per-lens instrument, and the design's page asks which of the twelve
    // is slipping — a question picking one at a time cannot answer
    // (reviewing 13→14, pending 8→7). Signal Health is the fifteenth, and its
    // walk found two headline numbers hiding their own composition and an
    // `error` field the page had never read (reviewing 14→15, pending 7→6).
    // Lens Coverage is the sixteenth: the design's one change is the tier
    // split, and it pays on the first row — IV Rank reads 99% of core and 71%
    // of the edge behind a single 97% (reviewing 15→16, pending 6→5). Alerts
    // is the seventeenth, and the only one so far where the design changed the
    // route's subject: Event Radar became Alerts, and the events board it used
    // to hold already renders on the Explorer's own tab (reviewing 16→17,
    // pending 5→4). Live is the eighteenth: the prototype calls itself a
    // redraw of the production page, and the walk found the production page
    // had no header and not one link on it (reviewing 17→18, pending 4→3).
    // Contract Greeks is the nineteenth, and its walk found one contract held
    // across instances drawing one position's greeks three times
    // (reviewing 18→19, pending 3→2). Loop Run is the twentieth and the last
    // of the round: the prototype says it is a surface rather than a page, so
    // the walk verified the deep link into the panel and took out the second
    // close (reviewing 19→20, pending 1→0). Then 22, without a walk: opening
    // the build list found `obj-smallcap-sepa` and `obj-vol-crush` sitting in
    // "to build" as pages to write. They are the same `:objectiveId` route as
    // the two already covered, with an id the store does not hold — a fixture
    // id is not a page, and two of the 25 builds were never builds. 23 with
    // System Status — the first of the build list rather than the walk list,
    // and the design's collapse target for the nine `/system/*` pages. 24 with
    // Settings, the collapse's other half — `/settings` had been redirecting
    // to the Coverage page the same ruling retired. 23 on 2026-09-22: the
    // Owner's walk took Positions and the Watchlist out to `aligned` and put
    // the Decision Inbox back in, which is two out and one in. 8 after
    // the 2026-09-23 pass through the queue (fifteen rows on eleven looks), 7
    // with Live, 6 with the census face. 7 with Options Kit, the first of the
    // four `/docs/*` builds the judgement of 2026-09-23 recommended, and 8
    // with Stock ratings, re-walked the same day onto the capabilities the
    // design moved there, and 10 with Portfolio Exposure and Positions, which
    // grew Contract Greeks' three doors between them. Back to 6 when the Owner
    // signed four of them together on 2026-09-23, and 5 with Contract Greeks.
    // 6 again with Stock ratings, re-walked onto the Leaders view, and back
    // to 5 when that walk was signed. 6 with Events, built on the design's
    // four-state rule so an unfed pipeline reads as unfed.
    expect(counts.byState.reviewing).toBe(6)
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
      '/research/agent-personas',
      '/research/book',
      '/research/contract-screener',
      '/research/copilot',
      '/research/copilot/trading',
      '/research/daily-brief',
      '/research/greeks',
      '/research/journal',
      '/research/loop/candidates',
      '/research/loop/decisions',
      '/research/loop/harness',
      '/research/loop/hypotheses',
      '/research/loop/objectives/obj-daily-stock',
      '/research/loop/objectives/obj-earnings-iv',
      '/research/loop/objectives/obj-smallcap-sepa',
      '/research/loop/objectives/obj-vol-crush',
      '/research/loop/runs',
      '/research/orchestration',
      '/research/overview',
      '/research/ratings/stocks',
      '/research/scan',
      '/research/screener',
      '/research/signal-decay',
      '/research/symbol',
      '/research/watchlist',
      '/research/workbench',
      '/review',
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
      '/trade/desk',
      '/trade/expiration',
      '/trade/fills',
      '/trade/plans',
      '/trade/playbook',
      '/trade/rules',
    ])
    // The two ratings pages' own siblings: Symbol, and the Vol ratings rebuild
    // that shares its weights panel, tape and lens bar with Stock ratings.
    expect(rows.filter((r) => r.state === 'reviewing').map((r) => r.path).sort()).toEqual([
      '/docs/options-kit',
      '/research/events',
      '/research/lens-coverage',
      '/research/signal-health',
      '/settings',
      '/system/status',
    ])
    // Was ten: the seven Strategy pages plus Momentum Radar, SEPA Daily Core
    // and Backtest. The seven retired on 2026-09-18 once every capability they
    // carried had a home — they are redirects now, and a redirect is not a row
    // here, so `moving` is what the design still dissolves elsewhere. Stock
    // Explorer joined them on 2026-09-22: it is the tab shell over the first
    // two, it answers to no design page of its own, and its walk left one open
    // question — where the events board goes. Backtest left on 2026-09-23:
    // the design voided the LAB mark that put it here (round LAB → OLD), and
    // an unwalked page with a current prototype is `pending`, not `moving`.
    expect(counts.byState.moving).toBe(3)
    expect(rows.filter((r) => r.state === 'moving').map((r) => r.path).sort()).toEqual([
      '/research/explorer',
      '/research/momentum-radar',
      '/research/sepa-daily-core',
    ])
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
    // 92 with Package 2026-09-21.4: `/research/orchestration`, split out of
    // the Personas page.
    expect(counts.designed).toBe(92)
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
    // after (2026-09-21). 23 on 2026-09-22 without anything being built: two
    // of the 25 were objective fixture ids, which the `:objectiveId` route has
    // always answered. 22 with System Status, the first page of the build
    // round and the design's collapse target for the nine `/system/*` pages,
    // and 21 with Settings, its other half. 20 on 2026-09-23: Options Kit was
    // the first of the four `/docs/*` the judgement recommended building. 19
    // with Events, whose four-state rule let it be built on an unfed pipeline.
    expect(counts.byState.unbuilt).toBe(19)
    // 20 until R13 tagged Trade Ledger: `pending` is the built-but-unwalked
    // pool, so a page leaving it for `reviewing` takes one off this count.
    // 18 since Performance joined `reviewing`; 16 since Playbook did; 13 since
    // the Autopilot tree did (R1); 16 since Package 2026-09-19.1 seeded the two
    // objective rows and the runs stem, which the app answers at `:param`
    // routes (the objective page, the run redirect into the console drawer) —
    // built, designed, not yet walked. 14 since W1 walked Overview and the
    // Workbench home.
    // 12 since Vol ratings and then Daily Brief left it for `reviewing`, and
    // 11 since the Watchlist did — the first page of this round walked rather
    // than caught by it — 9 since the two objective rows followed, both
    // answered by the one `:param` route that was walked, 8 with the Option
    // screen, 7 with Signal Decay, 6 with Signal Health, 5 with Lens Coverage
    // 4 with Alerts, 3 with Live and 2 with Contract Greeks. Stock Explorer
    // was the next, and it turned out to be `moving` rather than a walk: its
    // registry row is an alias of the Screener prototype, which is aligned at
    // `/research/screener`. Loop Run was the last, and it is `reviewing` now —
    // "to walk" is empty for the first time. 0 → 1 on 2026-09-23: Backtest
    // came back into it from `moving`, which is the honest place for a page
    // with a current prototype and no walk — the LAB mark that took it out
    // was voided by the design, not by anything this side did.
    expect(counts.byState.pending).toBe(1)
    expect(rows.filter((r) => r.state === 'pending').map((r) => r.path)).toEqual([
      '/research/backtest',
    ])
    expect(
      rows
        .filter((r) => r.via)
        .map((r) => r.path)
        .sort(),
    ).toEqual([
      '/research/loop/objectives/obj-daily-stock',
      '/research/loop/objectives/obj-earnings-iv',
      '/research/loop/objectives/obj-smallcap-sepa',
      '/research/loop/objectives/obj-vol-crush',
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
    //
    // Package 2026-09-21.1 @ Rev .3 is the same kind of round: three shell
    // rulings (page names, the Pipeline layer page, container rows becoming
    // captions) and not one route changed. So the global Rev moves and no
    // page stamp does, which is why the aligned set holds through it.
    // Package 2026-09-21.4 @ Rev .6: the Personas face redrawn and one new
    // route (`/research/orchestration`). It moved the three Copilot rows'
    // own rev, which is why one of them is stale and two were re-walked.
    // Package 2026-09-22.3 @ Rev .6 is the same kind of round again, and the
    // largest: eighteen rulings about surfaces, three page stamps moved, and
    // the whole of the Research layer re-crumbed as Pipeline left the tree.
    // Package 2026-09-22.6 @ Rev .9 is three incremental answers to questions
    // this side asked rather than a round of its own: .7 the Decision Inbox's
    // two undrawn card kinds, .8 the VRP field on the candidate column, .9 the
    // diff's colours. Only the two routes that were asked about moved their own
    // stamp — decisions to .8 and proposals to .9 — and neither is aligned yet,
    // so the aligned set holds and `stale` does not move.
    // Package 2026-09-23.1 @ Rev .2 draws the Rule proposals merge rather than
    // only ruling it: /review/proposals changes file to the Decision Inbox's
    // own prototype and stops being a row or a View. It moves three stamps —
    // decisions, proposals and Live — and all three were still in the confirm
    // queue, so again nothing aligned goes stale.
    // Package 2026-09-23.2 @ Rev .6 is the first round in a while that does
    // make signed pages stale, and it is this side's own doing: it answers the
    // four `moving` pages with disposition tables, and a capability with a
    // destination is work on the destination page.
    // Package 2026-09-23.3 @ Rev .7 is the full package that supersedes them
    // all, and it moves two more signed pages by moving the menu rather than
    // the page: the left rail is where you stand, the right rail is what you
    // use beside it, and Live and Alerts are the second kind.
    // Package 2026-09-23.4 @ Rev .8 moves one row's stamp: `/research/events`
    // gains the Market face the Explorer walk's events board is waiting on.
    // That page is `unbuilt` here, so no state moves with it. Rev .9 answers
    // this side's ask about Momentum Radar's ranking with a Leaders view on
    // Stock ratings, which moves that page's stamp and nothing else.
    expect(DESIGN_REV).toBe('2026-09-23.9')
    // Four, and honestly: Package 2026-09-19.1 moved exactly the pages the
    // Vision redesign touches — twelve Research routes to .18.2 — and only the
    // four that were signed off read stale; the rest of the walked set holds.
    // Each stale note names the batch that re-walks it (W2/W3), the same way
    // the count fell 4 → 0 across the .18.1 round.
    // 4 → 7: Package 2026-09-20.3 moved three more walked pages' own revs.
    // 7 → 6: Research Overview was re-walked against Rev 2026-09-20.23, the
    // first of the seven to be answered rather than counted. 6 → 5 with
    // Review, the second, and 5 → 4 with the Trade Desk: the three §5a.1
    // layer heads are answered, and what is left in `stale` is the four
    // Research pages the Vision redesign moved. 4 → 2 with the Copilot pair,
    // re-walked together because they are one prototype. 2 → 3 when Package
    // 2026-09-21.4 moved the three Copilot rows' rev: Book starters was
    // walked at .15.5 and is not part of this round. 3 → 2 when it was
    // re-walked and took the design's own name, and 2 → 1 with the Decision
    // Inbox. 1 → 0 with Symbol: for the first time since Package 2026-09-18.1
    // there is no page whose design has moved past its walk.
    // Package 2026-09-22.3 moved the Copilot page, the Autopilot Console and
    // Positions. None of the three lost its walk — what changed is that "open
    // beside" now has one destination — and all three were answered in the
    // same round, so they wait for a look in `reviewing` rather than here.
    // 0 → 3 with Package 2026-09-23.2, and this time the pages really did
    // lose their walk: each of the three is where a capability the design
    // re-homed has to be built, so being behind the rev is the accurate
    // reading rather than an artefact of some other page moving. 3 → 5 with
    // Package 2026-09-23.3, where Live and Alerts moved rail rather than page.
    // 5 → 4: Stock ratings was the first of the three to be built to its new
    // rev, and it is the one the two `moving` pages are waiting on. 4 → 2 with
    // the two pages that hold Contract Greeks' doors — all that is left is
    // Live and Alerts, which move rail rather than page.
    expect(counts.byState.stale).toBe(2)
    for (const row of rows) {
      if (row.state !== 'aligned') continue
      // Every walked page carries the rev it was walked against, and the design
      // still stamps that page no later than it.
      expect(row.rev, row.path).toBeTruthy()
      expect(revIsNewer(row.design?.rev, row.rev), row.path).toBe(false)
    }
  })
})
