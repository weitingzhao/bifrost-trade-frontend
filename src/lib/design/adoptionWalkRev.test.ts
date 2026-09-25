import { describe, expect, it } from 'vitest'
import { adoptionCounts, adoptionRows, DESIGN_REV } from './adoption'
import { revIsNewer } from './rev'

const rows = adoptionRows()
const counts = adoptionCounts(rows)

/**
 * The half of the walk that is about revisions: which pages read stale, and
 * why a page's own stamp — not the package's — is what decides it. Split out
 * of `adoptionWalk.test.ts` when that file reached the 800-line line.
 */
describe('the design walk, by revision', () => {
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
    // Package 2026-09-23.6 @ Rev .24 is the next full package, and most of its
    // fifteen revs are shell and colour (three-way theme, light as grey paper,
    // the identity-colour ratchet, glass for floating things, the system
    // font) — global Rev only. Twenty-six files were renamed to mirror the
    // menu rather than the route, with no route, label or stamp moved. Four
    // stamps did: Positions (.21), and Narrative, Overview and Compare (.24).
    // Package 2026-09-23.7 @ Rev .28 is three rounds of shell interaction
    // (.25–.27: dock, floats, keyboard, focus, the StageRail into the crumb)
    // and a pre-export sweep (.28), and Package .8 @ Rev .29 answers this
    // side's §14.4 ask in the contract alone — the snapshot moved by its
    // global Rev and nothing else, so no page stamp and no state moves.
    // Packages .9 and .10 @ Rev .30–.31 move the colour tokens into
    // `@bifrost/ui` 0.4.13 and leave every page alone: global Rev only.
    // Package .11 (full) + .13 (incremental) @ Rev .49: eighteen revs, most of
    // them the unified page head rolled across the prototypes (.32–.42) and
    // freshness / data confidence (.44–.47) — shell and prototype work that
    // stamps no page. Three stamps did move, all at .43: Stock screen, Symbol
    // and Narrative. Package .14 (full) @ Rev .51 is the §17 interaction
    // standard — shell and prototype markup, no page stamp — and .15 @ Rev .52
    // takes the app's System tree; of its three pages only Calibration's
    // stamp moved. Package .16 @ Rev .55 answers this side's receipt: the three
    // .52 stamps corrected, the app's three §17 additions drawn into Limits,
    // Positions and Margin (.55), four System stubs drawn (.53), and Objectives
    // moved to Home (.55). Packages .17 (full) @ Rev .57 and .18 @ Rev .58
    // rebuild the frame — the right rail becomes a bottom toolbar, the Symbol
    // list stays on every page, the status bar becomes a pill — and move one
    // page stamp: Research Symbol (.56, its four-layer head). Package .19
    // (full) @ Rev .72 — the "Apple" round, the Owner's final design — moves
    // materials, the frame (the pill retires into a top menu bar) and
    // interactions, and no page stamp: the page files changed only in look,
    // so nothing walked reads stale for it.
    expect(DESIGN_REV).toBe('2026-09-25.72')
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
    // Live and Alerts, which move rail rather than page. 2 → 4 with Package
    // 2026-09-23.6: Positions redrawn as the §16 north star, and Research
    // Overview's census carrying the two rows this side's ask corrected. 4 → 3
    // the same evening: Overview's two rows took the design's words and it
    // waits for a look in `reviewing`. 3 → 2 with Positions, rebuilt to its
    // north-star rev and waiting the same way. 2 → 0 with Live and Alerts,
    // built into the rail's Market group (Rev .7): for the first time since
    // Package 2026-09-23.2 nothing walked is behind its rev. 0 → 2 with
    // Package .11 @ Rev .43: Stock screen and Symbol; 2 → 0 the same day,
    // both re-walked with the narrative pieces the design added to them.
    // 0 → 1 with Rev .55: Objectives, moved to Home with a mode tag, is built
    // in the round that brings objective modes to this side. 1 → 0 the same
    // day, once research 0.113.0 stored the mode and the tag had one to read.
    expect(counts.byState.stale).toBe(0)
    for (const row of rows) {
      if (row.state !== 'aligned') continue
      // Every walked page carries the rev it was walked against, and the design
      // still stamps that page no later than it.
      expect(row.rev, row.path).toBeTruthy()
      expect(revIsNewer(row.design?.rev, row.rev), row.path).toBe(false)
    }
  })
})
