---
name: design-walk
description: Land a design/trade prototype into this frontend, one page at a time — read the prototype whole, measure the data, build section by section, sweep the interactions, then write the note. Use when a page is being walked, re-walked or built against design/trade/*.dc.html. Not a visual-design skill; frontend-design owns taste and dense-ui owns density.
parity-id: design-walk-v1
---

# Design Walk

Landing one `design/trade/*.dc.html` prototype into `bifrost-trade-frontend`.

**Never write into `design/trade/`.** It is the design side's output, read-only here.

**Only the Owner marks a page `aligned`.** The Agent builds, verifies and writes
the note; it may move a page to `reviewing`, never past it.

---

## 1. Read the prototype whole

Not the diff, not the screenshot — the `.dc.html` file, including the
`<script type="text/x-dc">` block at the bottom. The script is where the
prototype's *behaviour* lives: what each row does on click, how a verdict is
worded, which thresholds colour a number, what the empty state says.

A walk against a rendered picture will match the layout and miss all of that.

## 2. Measure before you promise a reading

Every figure the page will show must be checked against DEV **before** it is
built. A panel built on an endpoint that returns nothing is worse than an
unbuilt page: it claims a reading the app cannot make.

Where the app has no number, the row is **marked, not dropped** — it keeps its
place and names the missing half. `—` is not `0`: a zero is a count, and
"nothing counts this" is not one.

Three ways a measurement lies, all of which have cost a re-walk:

- **One endpoint is not the answer.** A reading is dead only when *every*
  source for it is. The Screener's Momentum stage was marked dead on
  `momentum-filter`, whose mart is still accumulating, while
  `/research/momentum/radar` answered it the whole time. So a reason names the
  endpoint — "`X` returns 0 because Y" — never "no data".
- **An empty 200 is not an empty set.** Before writing "nothing qualifies",
  call the same endpoint with an argument you know has rows. If that answers,
  the emptiness is the data; if it does not, the emptiness is the endpoint.
- **`count` is not always names.** Check whether a route returns one row per
  entity or one per entity per date, and whether a full page is the count or
  the cap. Two figures side by side must count the same thing.

## 3. Extract before you duplicate (§14.2)

An overview page quotes figures other pages compute. When this page becomes the
**second** reader of a function, move it to the shared layer *first*, then build
on it. The same figure computed twice is the failure these pages invite, and it
is far cheaper to prevent than to reconcile.

Module placement: 2+ features → `src/utils/`, `src/hooks/`, `src/components/`.
Never `pages/` → `pages/` across feature folders.

## 4. Build section by section, in the prototype's order

Work down the prototype one section at a time rather than diffing the whole
page. The order is part of the design: it is the argument the page makes.

Watch for the sections that are easiest to skip — a navigational footer
(`The six`, `Three areas`, `Four views`) is a whole section and carries the
layer's own meaning, not decoration.

## 5. Interaction sweep — **every page, every walk**

Layout alignment is not the deliverable; a page that reads right and does not
behave is not landed. Added 2026-09-20 after three pages shipped looking
correct with tickers that were plain text and rows that did not click.

Run all four, on the live page at `:5173`:

```js
// 1. every link, and where it points
const m = document.querySelector('#main-content')
;[...m.querySelectorAll('a')].map(a => [a.textContent.trim().slice(0,30), a.getAttribute('href')])

// 2. every row the prototype makes clickable — is it?
;[...m.querySelectorAll('tbody tr')].map(r => [r.getAttribute('role'), getComputedStyle(r).cursor])
```

3. **Check every href against the router.** A link to a path nobody routed is
   a dead end wearing a link's clothes. `src/layout/deadLinks.test.ts` does
   this for every literal target in the source and runs with the gates — so
   what is left for the sweep is the targets it cannot see: anything built
   from a variable at render time.
4. **Click what changed.** Reading the markup does not prove a destination
   renders. Click it in the browser and read back `location.pathname`.

Four rules the sweep enforces:

- **A whole row the prototype navigates, navigates.** Use `useRowLink` — a
  `<tr>` is not focusable, so an `onClick` on it is invisible to anyone not
  using a mouse. A link *inside* such a row must `stopPropagation`.
- **An entity is its own destination.** A ticker opens that name
  (`withSymbolParam(SYMBOL_PATH, sym)`); an account opens Accounts; a limit
  opens the page that owns its reading. Text a reader would click must be
  clickable or it is a dead end.
- **A dead end says why.** Where there is genuinely nowhere to go, do not draw
  a link — render plain and put the reason in `title`. Never link somewhere
  approximate: answering a click about history with a list of beliefs is worse
  than not linking.
- **Never point at a page that does not exist yet**, however gracefully you
  believe the failure degrades. Pipeline's hypothesis cards carried a comment
  saying an unmounted route would "simply render the 404 boundary"; it rendered
  a blank document, and nobody had checked. Two more of the same were found by
  scanning, one of them written in the same pass that wrote this rule.
- **No deep link a page ignores.** Only attach `?param=` the destination
  actually reads; a parameter it drops is the same failure in a new place.

## 6. Width sweep (§5a.3)

The page container fills the pane; only continuous text is measured. A
`max-width` on the first container after the scroller with no `margin: 0 auto`
is a bug. Inside `<article class="mx-auto">`, or inside a component, it is not.

Check one narrow width (~1024) for horizontal overflow:
`m.scrollWidth > m.clientWidth`.

## 7. Six gates, exit codes captured separately

Never pipe a gate into `tail` and then `&&` a commit — the pipe swallows the
exit code and a red run commits.

```bash
npx tsc -b
npm run lint            # 0 errors
npx vitest run
npm run build
npm run check:legacy-css
npm run check:code-health
```

**Never raise a ratchet baseline.** A duplicated helper means import the
existing one; a file over the line means find the real seam.

## 8. Write the note, then stop

`src/layout/designNotes.ts` carries what was built, measured and diverged, at
which prototype rev. State goes to `reviewing` in `routeTable.ts`; the counts in
`src/lib/design/adoption.test.ts` move with it.

**Every divergence from the prototype is named in the note with its reason.**
A silent divergence is indistinguishable from a mistake. Reasons that have
stood: the store's vocabulary beats the design's when the words mean opposite
things; the app's own palette beats the prototype's when a reader learns it one
click away; a figure with two definitions is printed once, not twice.

Then report and stop. The Owner looks, and the Owner alone marks `aligned`.
