/**
 * Design-walk notes · Review.
 *
 * Review — the layer whose subject is the person using the app.
 *
 * One file per layer because the record only grows: the notes are long on
 * purpose, and a single catalogue crossed the 800-line ratchet on the day the
 * Review re-walk was written. Split by the group each page belongs to, which
 * is the seam the reader already has in their head.
 */
export const REVIEW_NOTES: Record<string, string> = {
  '/review':
    'Walked 2026-09-17 against Review Queue.dc.html at page rev 2026-09-17.1, on local DEV (:5173), with the other four Review pages. The design\u2019s method is the page: a single P&L blurs two different facts \u2014 was the plan any good, and did I follow it \u2014 and the 2\u00d72 exists to separate them, because the fix differs in every cell. Both axes need what this side has not got: a plan linked to the position (Trade Plans stores a target and a stop, but no plan has ever reached one) and the mark through the holding period (no daily position mark is stored). So the grid keeps its four cells, keeps the fix each implies, and carries n \u2014 in every cell, with the two missing numbers named. The queue itself is real: the ledger\u2019s own grouping (buildOptExecutionGroups) yields the closed trades \u2014 measured on DEV, 67 contracts taken flat by their own fills, every one carrying a play name \u2014 with realised, days held, DTE at entry and the share of the credit kept. Three of the design\u2019s eleven columns are the ones the missing plan would fill (Plan said, Discipline, Plan cost); they stay in the table marked rather than being removed, because they are the page\u2019s subject and dropping them would leave a P&L list wearing Review\u2019s name. A contract past expiry that was never bought back is counted apart rather than folded in: it is over economically but carries no closing fill, so it has no realised figure to read. Second pass 2026-09-18 after the Owner read the page against the prototype and said it felt nothing like it. Two of the three differences were real and are now closed: the design\u2019s Closed since window (1M / 3M / 6M / All) was missing entirely, so the queue always showed every close ever \u2014 it is built, and the band above it reads the same window rather than the whole ledger, with the ledger total kept beside it; and the design reviews a trade in place, which this side had moved out to Single trade, so the queue now picks a row and opens the same panels under it, from one shared component (pages/review/ReviewTradeFit.tsx) that Single trade also renders \u2014 two copies of a review would become two reviews the day a planned exit finally reaches a position. The third difference is the page\u2019s premise and cannot be built here: the design filters by To review / Reviewed, and nothing on this side records that a trade was reviewed, which is why the outcome filter asks Wins / Losses instead and the queue is a census rather than a worklist. That one needs a review store. Third pass the same day, after the Owner put the prototype on screen: the layout was still not the design\u2019s. It is now. One filter bar carries Closed since, Account and State with the run of totals on its right, in place of a header full of chips and a four-tile band. The 2\u00d72 carries the design\u2019s own cell names and the fix each implies, with n and both costs marked. And the bottom band is the design\u2019s split rather than a stack: the queue at 640px against the review at 360px, so a trade is read beside the list it came from, with Sample under it saying what the sample can support \u2014 n against the design\u2019s floor of 20, the reviewed count that nothing records, and the expired-unbooked count. The queue is the design\u2019s eleven columns in its order; the three the plan would fill and the auto-tags read n/c and none derivable, the State segment is disabled beside its marker, and Confirm review is described rather than drawn, because it would write. Two defects found in the measuring: every Symbol cell held the raw OCC string rather than the underlying (the same defect Outcome had), and the table clipped 188 cells at the design\u2019s 1180 floor \u2014 our Trade column is a whole contract token where the design\u2019s is an id, so it holds 1460 with the two text columns wrapping, measured at 0 clipped. Fourth pass the same day, on the Review panel itself: picking a row had been opening Single trade\u2019s page-sized panels inside a 360px column. It is the design\u2019s compact panel now \u2014 symbol and contract with realised on the right, Plan / Actual / Entry as three lines, the two gaps as boxes beside each other, the tags, and the two actions on a footer. Actual and Entry are real (how it ended, days held against days to expiry, the open date, the DTE at entry, the play); Plan, both gap figures, the auto-tags and IV rank at entry are marked, and the hand tags are drawn dashed because adding one would write. What the two surfaces share is the model rather than the component: REVIEW_GAPS moved into reviewTrades.ts so both word the same missing number the same way, and ReviewTradeFit sank back to pages/review/fit now that only that page renders it. Fifth pass the same day: the four cells are the design\u2019s filter, so they are buttons now \u2014 pick one and the queue takes its name, its count and a clear cell filter beside it; pick it again or clear to come back. The filter is real and answers with nothing every time, because a cell is a claim about the plan and the path and neither reaches this side: every cell reads n 0, and the empty queue says which emptiness it is rather than looking broken. The design leaves a plan-less trade out of the grid entirely; here that is all 67, which the footer now states. The day a plan reaches a position the interaction starts working with no further change. Owner to look before aligned. Owner signed off 2026-09-18 on local DEV (:5173) at this rev.'
    + 'RE-WALKED 2026-09-21 against Rev 2026-09-20.23. The bump is \u00a75a.1 \u2014 the group ate its one '
    + 'row, so this page is the Review layer itself and its five siblings rose a level \u2014 which the '
    + 'header already carried; the page body is unchanged at .23, and the sections all stand: filter '
    + 'bar, the 2\u00d72, Queue, the Review aside and Sample. What the re-walk was actually for is the '
    + 'interaction standard, which did not exist when this page was built (2026-09-20), and it found '
    + 'two things. **Sixty-eight rows were mouse-only**: the row carried a pointer and an onClick and '
    + 'no way in from a keyboard, and `aria-selected` on a `<tr>` claims a selectable grid this table '
    + 'is not. **The ticker was not a destination**: the column printed the underlying as text. Both '
    + 'fixed and verified in the running app \u2014 Enter on a focused row fills the aside with that '
    + 'trade, and the name opens `/research/symbol?symbol=INTC` without also picking the row. The six '
    + 'lines behind the first are now `rowSelectProps` beside `useRowLink`: Stock ratings had grown '
    + 'the same block by hand and moved onto it in the same pass. '
    + 'One divergence stands, with its reason: the design\u2019s header chip reads `Proposals <count>` and '
    + 'this side links `Proposals \u2192` without a number. The count comes from the habit readings, which '
    + 'are read off 46 mark-path requests; the queue makes none of them, and a page should not pay for '
    + 'a read it does not make (`useReviewHabits`\u2019 own rule). '
    + 'Swept: every link resolves, no horizontal overflow at 1024, and the two verbs on the aside '
    + 'still say what they would write rather than writing it.',
  '/review/fit':
    'Walked 2026-09-17 and rebuilt 2026-09-18 against Review Fit.dc.html at page rev 2026-09-18.1, on local DEV (:5173). The design\u2019s shape is a diff measured twice \u2014 what I did against what my plan said is discipline, and what my plan said against the best the trade ever printed is the plan itself. On 2026-09-17 both endpoints were recorded as missing. Only one of them is. Measured 2026-09-18: market.option_daily carries each contract\u2019s own daily OHLCV, and marking the position against it with the Ledger\u2019s cash convention lands on the Ledger\u2019s realised figure to the cent on 64 of the book\u2019s 67 closed trades (60 have a bar on 80%+ of the business days held, 5 partial, 0 empty). So the design\u2019s first four bands are now real: the underlying path, the position\u2019s P&L session by session with its own running maximum, the amber area between them \u2014 what was on the table and not taken \u2014 and the counterfactual table. Three of its four rows price: the realised figure, the best mark, and the worst. The fourth, held to expiry, prices at intrinsic from the underlying\u2019s close on the expiry session, which at expiry is exact rather than modelled \u2014 and is withheld, not approximated, while the contract is still running, because marking it at today\u2019s close would put \u201cheld until today\u201d under the name of a different branch. The plan half stays absent, so the two gaps, the verdict cell and two of the tags are marked, each naming what it needs. Execution keeps its designed columns with Mid and Slippage over a marker: the mid standing at submit is recorded nowhere on this side, and it is the only one of the three questions on this page that a better limit price would answer. Deliberate call: the trade picker is a select rather than the design\u2019s chip row \u2014 the prototype carries ten trades and this book carries sixty-seven.',
  '/review/habits':
    'Walked 2026-09-17 and rebuilt 2026-09-18 against Review Habits.dc.html at page rev 2026-09-18.1, on local DEV (:5173). Built to the design\u2019s own shape: the Window / Basis filter bar with n against the sample floor, the gate panel above the readings, Tendencies with a distribution strip per habit, and the three aside panels \u2014 Plan \u00d7 adherence, Split, Not claimed. Five of eight tendencies now read, against three on 2026-09-17: the contract\u2019s own daily bars make winner trimming and cut-loss latency measurable, and the first of those carries a real cost figure \u2014 what the winners\u2019 exits left on the table, summed. Finding worth keeping: the median winner lands 100% of the best mark it ever printed. That is not an error, it is what short premium held towards expiry looks like \u2014 the P&L rises with time and the exit is the peak. The $701 of give-back is concentrated in a handful of trades, which the strip shows and the median cannot. Two statistical corrections the first build got wrong and this one states: a band has to be about the same statistic as the number beside it (a median now carries an IQR, a mean a 95% interval \u2014 the mean band on credit kept ran to \u2212138% while the middle of the book sat at 76%), and a distribution strip is drawn over Tukey fences rather than the extremes, so one trade that closed for twenty-three times its credit widens the axis by a fixed multiple instead of flattening every other dot into one column. Dots outside are drawn on the edge and counted. Marked, each naming what it needs: three tendencies, every cost figure, the 2\u00d72 and the Split \u2014 all of them divide by the plan. The Split in particular is not estimated: how much of what this book lost was behaviour and how much was the plan is the most consequential figure in the group and the one most likely to be acted on. The Basis filter keeps its two narrower options disabled with a marker, because \u201creviewed only\u201d and \u201chas a plan\u201d are both stores this side has not got.',
  '/review/playbook-stats':
    'Walked 2026-09-17, completed 2026-09-18 and re-walked the same evening against Review Playbook Stats.dc.html at page rev 2026-09-18.1, on local DEV (:5173). Package 2026-09-18.1 folded **Strategy \u203a Win Rate** in here as a grouping switch rather than a page beside it (DECISIONS 2026-09-18): what each play has done and what each shape has done are the same question asked of two groupings, and a page answering only one kept sending the reader elsewhere. So there is a Cut control \u2014 Play / Structure \u2014 and the structure face is WinRateStructureRow in full: twelve columns, the service\u2019s own totals row leading, a Closed-since window, Invested carrying its win/loss split on a second line, and the formulas quoted rather than restated. 0 of 142 cells clip at the raised floor. The two cuts read different services and **do not reconcile**, which the page states instead of averaging: 67 closed contracts over 19 plays on the Ledger\u2019s side, 85 closed instances over 6 structures on the strategy service\u2019s. An instance can hold several contracts and a contract can be flat while its instance is not. Win rate is taken over what resolved rather than over n \u2014 an open instance has neither won nor lost, and counting it in the denominator depresses every rate. The totals row is the service\u2019s own; a total summed here would drift from it the moment either changed its definition of investment. **Defect found and marked, not worked around**: the win-rate endpoint intermittently answers HTTP 200 with an empty body, and the same call a few seconds later returns all six structures (measured repeatedly 2026-09-18 on DEV). A successful empty is indistinguishable from \u201cnothing has closed\u201d, so the page holds the answer against the rulebook\u2019s own structure count and, when structures exist but the service returned none, says the service answered empty and offers Ask again rather than drawing a table of nothing. The cut is also only asked for when it is showing, which keeps it out of the dozen reads this page makes at mount. Owner to look before aligned. Owner signed off 2026-09-18 on local DEV (:5173) at this rev.',
  '/review/proposals':
    'Walked 2026-09-17 and rebuilt 2026-09-18 against Review Queue.dc.html at page rev 2026-09-18.1 (the design files proposals as that prototype\u2019s second surface), on local DEV (:5173). On 2026-09-17 this page had no rows and the reason was that no habit carried a cost. One now does: the give-back on winners is read off each contract\u2019s own daily marks, and it is \u2212$701 across 53 winners. So the page is built as the design draws it \u2014 four proposal cards, evidence on the left, diff on the right, three decisions along the bottom \u2014 and the first of them is argued, citing the six trades that left the most on the table, each a link into Single trade. The other three say which link they are waiting on, and the three states are kept apart on purpose: **argued** (habit, sample and cost), **no cost** (the habit is measured, the cost needs the plan), **no habit** (the tendency itself is unmeasurable here). Collapsing those into \u201cno proposals\u201d loses the only thing the page can tell the Owner about what to build next. Every card\u2019s `\u2212` line is marked, and that is the design\u2019s own point rather than a formality: a diff subtracts from the rule\u2019s current text, no rules store exists on this side, and a proposal with an invented before line would be arguing against a rule nobody wrote. Accept / Defer / Reject are drawn and disabled. A page that omits them reads as \u201cnothing to decide\u201d; the truth is that there is something to decide and nowhere to record it. The chain panel now reports the break at the third link rather than the second, and says what each of the two remaining stores would unlock.'
    + ' '
    + 'MERGED INTO THE DECISION INBOX 2026-09-22 (design Rev 2026-09-22.2, \u00a75a.8). One inbox, not '
    + 'two: the Decision Inbox sat under Autopilot and Rule proposals sat in Review, and they are '
    + 'the same act \u2014 a machine proposes, I approve \u2014 with a row each because the engine touches '
    + 'both ends of the loop. This route stays as the deep link the design keeps and lands on the '
    + 'Inbox with its **Proposals** view selected, the same shape as /research/workbench landing on '
    + 'the census face. '
    + 'A VIEW, NOT A SECTION, and the reason is the page\u2019s own grammar: the View segment already '
    + 'answers "which queue am I looking at", and a fourth queue is what this is. It is not a fourth '
    + '*kind* \u2014 the kind selector narrows server-side draft kinds and a proposal is derived here '
    + 'from habits, so the selector stands down while the view is up. '
    + 'What sitting beside the drafts makes visible, and a page of its own hid: **a draft can be '
    + 'approved and a proposal cannot.** There is an API for the first and no rules store for the '
    + 'second, so the count line says so where the other views print their pending totals. The '
    + 'cards, the chain and the boundary paragraph came over unchanged; the model and the card moved '
    + 'to `pages/research/loop/proposals/` with them, because a page importing another page\u2019s '
    + 'feature directory is the reverse dependency `module-placement` forbids. '
    + 'WALKED AGAIN 2026-09-22 at 1680\u00d71100 on local DEV (:5173), interactions included. The '
    + 'text is the design\u2019s: the three states carry their tags, n 54 and \u2212$701 sit on the '
    + 'header, the evidence prose and its cite buttons read as drawn, the Diff box carries its '
    + 'target, and twelve decision buttons over four cards are drawn disabled with the reason '
    + 'beside them. All seventeen links resolve: eleven cites into Single trade, which reads the '
    + 'same `trade` key they write and selects the cited contract \u2014 TSLA 10APR26 345P opens '
    + 'with its two fills, ten of eleven sessions of contract marks and eleven underlying closes '
    + '\u2014 plus `Habits \u2192` and the chain\u2019s five `where it would come from \u2192` into '
    + '/review/habits, /trade/plans, /risk/limits and /review/playbook-stats. One defect found and '
    + 'fixed: the card\u2019s two columns were laid out with '
    + '`repeat(auto-fit,minmax(min(100%,17rem),1fr))`, the idiom for a grid of chips whose count '
    + 'varies rather than for a designed split \u2014 at 1680 it computed four tracks with two '
    + 'empty, and the design\u2019s 1.1:1 ratio never applied. It is '
    + '`md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]` now, as eight other splits in this repo are '
    + 'written, measured at 711.9px against 647.1px, ratio 1.100. One question is owed to Design '
    + 'rather than answered here: the prototype draws the diff\u2019s `\u2212` in #fb923c and `+` '
    + 'in #2dd4bf, the teal/orange pair that \u00a714.7 retired as direction tokens on '
    + '2026-09-16. Its sweep rewrote the wrapped `var(\u2026)` form across 210 sites and missed '
    + 'these two, which are bare literals \u2014 so those colours are '
    + 'stale rather than a ruling. This side\u2019s `+` meanwhile borrows `text-success`, the '
    + 'severity green that \u00a714.7 rule 2 reserves for dots and tags. Neither is right: a '
    + 'diff\u2019s add and remove lines are neither a signed direction nor a severity, and the '
    + 'design names no colour for them. The `\u2212` line stays muted meanwhile, which is honest '
    + '\u2014 it carries no before value at all.',
  '/review/objectives':
    "Built 2026-09-20 against Review Objectives.dc.html (Rev 2026-09-20.5) on the Owner's "
    + "option (c): build the honest version now, and file the backfill as a request. Re-walked "
    + 'the same day under the interaction standard, section by section. The chain the design '
    + 'reads is proposed -> accepted -> traded -> settled, and on this side it breaks at '
    + '`traded`. Measured first: 1 objective, 29 runs, 62 candidates (10 with a hypothesis_id), '
    + '29 hypotheses of which ZERO carry a linked_opportunity_id, against 25 opportunity ids on '
    + 'the settled side — intersection zero. So the four columns after `accepted` read em-dash '
    + "rather than zero (a zero would say 'it traded nothing'; what is true is 'we cannot "
    + "tell'), every verdict is NO VERDICT, and every closed trade sits in the Unattributed "
    + 'row. The design makes that row a hard requirement for exactly this reason — a chain with '
    + 'a missing link is a fact about the record, not a rounding error — and here it holds the '
    + 'whole book rather than a remainder. The page names the missing field, '
    + '`hypothesis.linked_opportunity_ids`, which is the thing only a built page can say and '
    + 'the whole argument for (c); the request is R5 in REQUEST-research-data-2026-09-20.md. '
    + 'The second pass landed the rest of the prototype. The header took the design’s full '
    + 'title and gained the two things beside it: the window the figures are true of, and the '
    + 'way out to the Autopilot Console. The page’s own objective SegmentControl was removed — '
    + 'the scope is the shell’s, set in the Lens, and a second control for one idea is a second '
    + 'idea; what stands in its place is the design’s violet banner, which names the scope and '
    + 'offers Clear, in the Lens’s own objective ink rather than the prototype’s. The four KPIs '
    + 'became the design’s four, each carrying its tip. The chain table gained the state tag, '
    + 'the floor line under Hit, and the design’s last column — what this row argues for. And '
    + 'Where they die gained its bar, because a share stated only in words leaves two '
    + 'objectives incomparable at a glance, which is the panel’s whole job. Divergences. The '
    + 'window reads the span the trades actually cover, not the design’s trailing 90d: this '
    + 'side reads every canonical execution with no window, and a caption that lies about its '
    + 'own figures is worse than a longer one. The Hit floor prints `no floor set`, because the '
    + 'design’s per-objective hit floor has no column here and VERDICT_FLOOR is a count of '
    + 'settled trades — a different claim, not a substitute. The action column never prints '
    + "'Nothing to change' over a row nobody could judge; a NO VERDICT row reads 'No evidence "
    + "yet' and says why on hover, and nothing on the page is drawn as a control that does "
    + 'nothing. `Where they die` reports the proposed-to-accepted drop and says the loop’s '
    + 'earlier stages are counted per run rather than per objective, instead of naming a gate '
    + 'it cannot measure; the return edge is prose rather than patch cards, because a patch '
    + 'must carry settled evidence and there is none to carry. Interaction sweep: all five '
    + 'links resolve — the objective title opens its own page, the unattributed row and its '
    + 'Why open Outcome, and Clear empties the shell scope — each verified by clicking. The '
    + 'nine-column table keeps its shape and scrolls sideways at a narrow pane rather than '
    + 'crushing its headers, which is the design’s own min-width. '
    + 'Owner signed off 2026-09-20 on local DEV (:5173) at this rev.',
}
