/**
 * The design's route table, frozen into the repo.
 *
 * `design/trade/` is not a git repo and is not a dependency — it is a package
 * the Owner drops in and re-exports wholesale. The adoption tracker needs the
 * design side to compute against, and the app has to build without the package
 * present, so the table is generated here and committed.
 *
 * `shell-registry.js` is the design's own single source for routes, nav tree
 * and crumbs. Reading it by regex would be a second parser to keep in step, so
 * this executes it against the smallest window/document it needs and asks it
 * the same questions the prototypes do.
 *
 *   node scripts/design-nav-snapshot.mjs [path/to/design/trade]
 *
 * Re-run it whenever the Owner drops in a new design export; the diff on the
 * generated file is the design's menu change, reviewable on its own.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = resolve('src/lib/design/designRoutes.generated.ts')
const inksOut = resolve('src/lib/design/designInks.generated.ts')

/** The six `DIRECTION` keys the registry mirrors from `@bifrost/ui` (§8, Rev .31). */
const INK_KEYS = ['profit', 'loss', 'unrealized', 'ticker', 'contract', 'instance']

/**
 * The registry's colour mirror, per theme: `DIRECTION` plus the accent.
 *
 * Since Rev .31 the package owns these values and `DIRECTION` is only a
 * mirror that must match it. Frozen here so the app's ratchet can hold the
 * mirror to the package without the design package present. A key missing or
 * a value that is not a hex fails the sync — a mirror with a hole in it would
 * pass the comparison by comparing nothing.
 */
export function inksOf(R) {
  const inks = {}
  for (const th of ['dark', 'light']) {
    const dir = R.DIRECTION?.[th]
    const accent = R.ACCENT?.[th]?.[0]
    if (!dir || !accent) throw new Error(`shell-registry.js: DIRECTION.${th} or ACCENT.${th} is missing.`)
    const row = { accent }
    for (const k of INK_KEYS) row[k] = dir[k]
    for (const [k, v] of Object.entries(row)) {
      if (!/^#[0-9a-f]{6}$/i.test(String(v))) throw new Error(`shell-registry.js: ${th}.${k} is ${JSON.stringify(v)}, not a hex.`)
    }
    inks[th] = row
  }
  return inks
}

/**
 * The registry's neutral ramp, per theme, by the `--sk-*` name each step lands on.
 *
 * `RAMP` is a bare array; the names are `SK_VARS`, private to the registry, so
 * they are read from its source text (the same move as the glyph table). The
 * light ramp is Trade's own and stays out of `@bifrost/ui` (Rev .43 Q5), so this
 * mirror is the only thing that holds the app's copy to the design's. A hole, a
 * length mismatch or a non-hex fails the sync rather than freezing a mirror
 * that compares nothing.
 */
export function rampOf(R, registrySource) {
  const m = /const SK_VARS = \[([^\]]+)\]/.exec(registrySource)
  if (!m) throw new Error('shell-registry.js: `const SK_VARS = [...]` not found — the ramp names moved.')
  const names = [...m[1].matchAll(/'(--sk-[\w-]+)'/g)].map((x) => x[1])
  const ramp = {}
  for (const th of ['dark', 'light']) {
    const steps = R.RAMP?.[th]
    if (!Array.isArray(steps) || steps.length === 0) throw new Error(`shell-registry.js: RAMP.${th} is missing.`)
    if (steps.length > names.length) throw new Error(`shell-registry.js: RAMP.${th} has ${steps.length} steps and SK_VARS names ${names.length}.`)
    const row = {}
    steps.forEach((v, i) => {
      if (!/^#[0-9a-f]{6}$/i.test(String(v))) throw new Error(`shell-registry.js: RAMP.${th}[${i}] (${names[i]}) is ${JSON.stringify(v)}, not a hex.`)
      row[names[i]] = v
    })
    ramp[th] = row
  }
  return ramp
}

/**
 * The registry's four severity lamps, read from its `LAMP` severity map.
 *
 * `LAMP` is a private arrow function (`sev >= 2 ? red : sev >= 1 ? yellow :
 * sev > 0 ? gray : green`), so its four literals are read from the source
 * text in that order. The package owns the values since 0.4.15 and the
 * contract (§1) states them; this is the registry's copy, frozen so the app's
 * ratchet can hold the package to it. A shape it cannot read fails the sync.
 */
export function lampsOf(registrySource) {
  const hex = "'(#[0-9a-fA-F]{6})'"
  const re = new RegExp(
    `const LAMP = \\(sev\\) => \\(sev >= 2 \\? ${hex} : sev >= 1 \\? ${hex} : sev > 0 \\? ${hex} : ${hex}\\)`,
  )
  const m = re.exec(registrySource)
  if (!m) throw new Error('shell-registry.js: `const LAMP = (sev) => …` not found in its known shape — the lamp map moved.')
  return { red: m[1], yellow: m[2], gray: m[3], green: m[4] }
}

/**
 * Docs Index round constants the app can store. `round` on DesignRoute stays
 * this set — the tracker still paints OLD.
 */
export const KNOWN_ROUNDS = Object.freeze(['NEW', 'OLD', 'REDO', 'LAB'])

/**
 * Tags Docs Index uses that are the same fact under another name.
 * `OLDC` is 「早期轮次 · 部分被契约覆盖」 — still an early-round prototype, so
 * the app stores it as OLD.
 */
export const ROUND_ALIASES = Object.freeze({ OLDC: 'OLD' })

export function canonicalRound(tag, file) {
  const mapped = ROUND_ALIASES[tag] ?? tag
  if (!KNOWN_ROUNDS.includes(mapped)) {
    const aliases = Object.entries(ROUND_ALIASES)
      .map(([from, to]) => `${from}→${to}`)
      .join(', ')
    throw new Error(
      `Unknown Docs Index round tag '${tag}'${file ? ` on ${file}` : ''}. ` +
        `Known: ${KNOWN_ROUNDS.join(', ')}. Aliases: ${aliases || '(none)'}.`,
    )
  }
  return mapped
}

/**
 * Prototype rows in Docs Index: `['Label', 'File.dc.html', '/path', TAG, '…']`.
 * A tag that is neither known nor aliased must fail the sync — not become null.
 */
export function parseRoundsFromIndex(html) {
  const found = new Map()
  const re = /\['[^']+', '([^']+\.dc\.html)', '\/[^']*', ([A-Za-z_][\w]*),/g
  for (const m of html.matchAll(re)) {
    found.set(m[1], canonicalRound(m[2], m[1]))
  }
  return found
}

/**
 * Which round of the design a prototype belongs to.
 *
 * `Docs Index.dc.html` marks each one NEW / OLD / REDO / LAB, plus OLDC
 * (early round, partly overtaken by contract — stored as OLD). It matters for
 * sequencing: an OLD prototype is an early round that later contract decisions
 * may have overtaken, and the package's own rule is that where a prototype and
 * a contract disagree, the contract wins.
 */
export function roundsByFile(dir) {
  try {
    const idx = readFileSync(join(dir, 'Docs Index.dc.html'), 'utf8')
    return parseRoundsFromIndex(idx)
  } catch (err) {
    if (err && err.code === 'ENOENT') return new Map()
    throw err
  }
}

function stubEl() {
  return {
    style: { setProperty() {} },
    dataset: {},
    setAttribute() {},
    appendChild() {},
    textContent: '',
  }
}

function revOf(dir) {
  try {
    const h = readFileSync(join(dir, 'HANDOFF.md'), 'utf8')
    return h.match(/Rev\s+([\w.-]*?)\.?(?=\s|$)/m)?.[1] ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

function generate(pkg) {
  const store = {}
  globalThis.window = {
    // Props and children too: the nav rows carry their glyph as a component,
    // and calling it is how the glyph table is read. Asking the registry the
    // way a prototype does beats a second parser for the SVG.
    React: { createElement: (t, p, ...c) => ({ __el: t, props: p ?? {}, children: c.flat() }) },
    localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v) },
    location: { hash: '', search: '' },
    addEventListener() {},
    innerWidth: 1800,
  }
  globalThis.document = {
    documentElement: stubEl(),
    getElementById: () => stubEl(),
    createElement: stubEl,
    head: { appendChild() {} },
    body: stubEl(),
    querySelector: () => stubEl(),
    querySelectorAll: () => [],
    // The registry wires listeners at load time (Rev 2026-09-15.13 remembers the
    // sidebar's collapsed state on click). Reading the route table must not
    // depend on a DOM: a missing stub method here fails the whole sync with a
    // TypeError from inside the design's own file.
    addEventListener() {},
    removeEventListener() {},
  }
  globalThis.localStorage = window.localStorage
  // Rev 2026-09-22.6 reads the embed flag off a bare `location.search` at load
  // time. In a browser `window.location` and `location` are the same object; in
  // Node they are not, so the alias has to be made explicitly or the registry
  // throws a ReferenceError before it has defined anything.
  globalThis.location = window.location

  const ROUND = roundsByFile(pkg)

  const src = readFileSync(join(pkg, 'shell-registry.js'), 'utf8')
  // Rev 2026-09-23.11 starts a one-minute watcher at load time (auto theme by
  // the clock), and a live interval keeps Node running after the file is
  // written — the sync hung until killed. The timers are shadowed for the
  // registry alone: reading a route table schedules nothing.
  const noTimer = () => 0
  new Function('setInterval', 'setTimeout', src)(noTimer, noTimer)
  const R = window.ShellRegistry

  /** The design's Research seats — the keys of `SEAT_HOME` in `shell-registry.js`. Copilot left the rail 2026-09-14 (§11.0). */
  const SEATS = ['workbench', 'lab', 'autopilot']

  /**
   * The design's glyph table, by name.
   *
   * `ic` is private to the registry, and the names matter — the design's own
   * handoff names the six with no lucide equivalent, and the app wants to say
   * `payoff` rather than paste a path. So the table is read from the source
   * text, and then every glyph the executed tree hands back is checked against
   * it: an unmatched path fails the sync rather than landing here nameless.
   */
  function glyphTable(text) {
    const table = new Map()
    for (const m of text.matchAll(/(\w+):\s*icon\('([^']+)'\)/g)) table.set(m[2], m[1])
    if (table.size === 0) throw new Error('shell-registry.js: no `name: icon(...)` pairs found — the glyph table moved.')
    return table
  }

  /**
   * One path in the SVG, or the sync is reading something it does not model.
   *
   * Every glyph in the design is a single `<path>` at viewBox 24 with round
   * caps. Rendering a second element as though it were the first would draw a
   * quietly wrong shape, which is worse than failing here.
   */
  function glyphPath(node, where) {
    // A glyph can arrive wrapped, and only in ways this list knows by name:
    // `data-navrow` since Rev 2026-09-20.12 (the hook the registry's CSS uses
    // to give container rows their unboxed caret), and `data-capsec` since
    // Rev 2026-09-21.3 (§5a.7 — each row under a caption carries its section
    // so collapsing is one CSS rule, and the marker rides on the icon slot).
    //
    // Unwrapped by name rather than by descending through anything: a wrapper
    // this list has not seen is a change to the design worth failing on, and
    // it duly failed on both of these.
    const MARKERS = ['data-navrow', 'data-capsec']
    if (node && node.__el === 'span' && MARKERS.some((m) => node.props?.[m] != null)) {
      const inner = (node.children ?? [])[0]
      node = typeof inner?.__el === 'function' ? inner.__el(inner.props ?? {}) : inner
    }
    if (!node || node.__el !== 'svg') throw new Error(`${where}: glyph did not render an <svg>.`)
    const paths = (node.children ?? []).filter((c) => c && c.__el === 'path')
    if (paths.length !== 1) throw new Error(`${where}: expected one <path>, found ${paths.length}.`)
    return String(paths[0].props?.d ?? '')
  }

  /** Every row the design's sidebar renders, with the group and fold it sits in. */
  function rows() {
    const found = []
    const walk = (items, group, trail) => {
      for (const it of items ?? []) {
        const kids = it.children ?? []
        // A row with children is either a home (a page that is also the heading
        // for the pages under it) or a fold (a heading that borrows its first
        // child's route so that clicking it goes somewhere). Only the home is a
        // route of its own — the same distinction `navConfig.ts` draws.
        const borrows = kids.length > 0 && it.to === kids[0]?.to
        if (it.to && !borrows) found.push({ path: it.to, label: it.label, group, trail, icon: it.icon })
        walk(kids, group, borrows ? [...trail, it.label] : trail)
      }
    }
    // Since 2026-09-13 the design's Research group carries only the current
    // seat's pages. Asking for one seat would drop every other seat's pages out
    // of the menu; a page is in the nav if any seat shows it.
    // A layer header carries its own page since Rev 2026-09-20.14 — Home,
    // Trade, Research and Review are `dual` rows whose group heading *is* the
    // route. Walking only `g.items` marked those four as "not in the nav"
    // while they sat at the top of it.
    const layer = (g, group) => {
      if (g.to) found.push({ path: g.to, label: g.label, group, trail: [] })
    }
    for (const seat of SEATS) {
      for (const g of R.navGroups({ route: '/home', seat })) {
        layer(g, g.label)
        walk(g.items, g.label, [])
      }
    }
    for (const g of R.systemGroups()) {
      layer(g, 'System')
      walk(g.items, 'System', [])
    }
    return found
  }

  /**
   * Every row's glyph, by route — and every fold header's, by its label.
   *
   * The design's own handoff makes this load-bearing rather than decorative:
   * folded to an icon rail, the glyph is the *only* readable thing, and the
   * set was redrawn so no two rows share a shape. Taking a near-synonym from
   * an icon library would quietly collide two of them again, so the shape
   * comes from the design and nothing here chooses one.
   *
   * A fold is told from a page by its id: `r()` keys a row by its own path, so
   * a row whose id is not its path is a heading that borrowed a route to be
   * clickable. The `borrows` heuristic in `rows()` cannot be used here — the
   * Validate fold points at its *second* child — and a heading and a page
   * sharing a path carry different shapes.
   */
  /**
   * A caption row (§5a.7): `cap('Discover')` builds `{ id: 'cap:discover',
   * label, icon }` where the icon is a marker, not a glyph — the design has
   * no other per-row hook to hang it on. It names the rows after it and has
   * no route, so it belongs in neither glyph map.
   */
  const isCaption = (it) => typeof it.id === 'string' && it.id.startsWith('cap:')

  function glyphs(table) {
    const byRoute = new Map()
    const byFold = new Map()
    // A group heading's shape too (System's is \`chip\`): the heading is the
    // one row left when the sidebar folds to its icon rail.
    const byGroup = new Map()
    // A business layer's heading carries its lifecycle numeral rather than a
    // glyph (§13), so only a heading that renders one is recorded.
    const head = (g) => {
      if (typeof g.icon !== 'function') return
      const node = g.icon({ className: '' })
      if (!node || node.__el !== 'svg') return
      const name = table.get(glyphPath(node, g.label))
      if (name) byGroup.set(g.label, name)
    }
    const walk = (items) => {
      for (const it of items ?? []) {
        // A caption is a heading, not a row (§5a.7): the design builds it with
        // a hidden icon slot because the DS gives it no other per-row hook, so
        // asking it for a glyph throws. It has no route to key one on either.
        if (isCaption(it)) continue
        if (it.icon) {
          const d = glyphPath(it.icon({ className: '' }), it.label)
          const name = table.get(d)
          if (!name) throw new Error(`${it.label}: glyph is not in the registry's \`ic\` table.`)
          if (it.id !== it.to) byFold.set(it.label, name)
          else byRoute.set(it.to, name)
        }
        walk(it.children)
      }
    }
    for (const seat of SEATS) for (const g of R.navGroups({ route: '/home', seat })) { head(g); walk(g.items) }
    for (const g of R.systemGroups()) { head(g); walk(g.items) }
    return { byRoute, byFold, byGroup }
  }

  /**
   * The equipment rail's shapes.
   *
   * The nine surfaces left the tree in §5a.8, so they carry no nav row and
   * `glyphs()` finds nothing for them — which is exactly the set the sidebar
   * probe reports as missing. Their shapes live in `equip()` instead, and as
   * plain names rather than components: `autopilot: { icon: 'rotor' }`.
   *
   * Keyed two ways because the rail draws two kinds of thing: a group's head
   * (by group id) and a tab (by the route it opens).
   */
  function equipGlyphs() {
    const byGroup = new Map()
    const byRoute = new Map()
    const eq = R.equip ? R.equip() : {}
    for (const [id, g] of Object.entries(eq)) {
      if (!g || typeof g !== 'object') continue
      if (typeof g.icon === 'string') {
        byGroup.set(id, g.icon)
        if (typeof g.hub === 'string') byRoute.set(g.hub, g.icon)
      }
      for (const t of g.tabs ?? []) {
        if (typeof t?.icon === 'string' && typeof t.to === 'string') byRoute.set(t.to, t.icon)
      }
    }
    return { byGroup, byRoute }
  }

  const GLYPH_NAMES = glyphTable(src)
  const GLYPH_NAMES_BY_NAME = new Set(GLYPH_NAMES.values())
  const SHELL_GLYPHS = ['gear', 'lanes', 'toolbar', 'symlist', 'subject']
  const glyph = glyphs(GLYPH_NAMES)
  const equipGlyph = equipGlyphs()
  const equipNames = [...equipGlyph.byGroup.values(), ...equipGlyph.byRoute.values()]
  /** name -> path data, only for the shapes the tree and the rail actually use. */
  const glyphUsed = [
    ...new Set([
      ...glyph.byRoute.values(),
      ...glyph.byFold.values(),
      ...glyph.byGroup.values(),
      ...equipNames,
      // The chrome's own controls, which no nav row carries: the sidebar
      // foot's doors (gear · lanes), the bottom toolbar's square and its
      // Lists / Symbol buttons (Rev .57).
      ...SHELL_GLYPHS.filter((n) => GLYPH_NAMES_BY_NAME.has(n)),
    ]),
  ].sort()
  const dByName = new Map([...GLYPH_NAMES].map(([d, name]) => [name, d]))

  /**
   * The unit of analysis each page answers in, off the registry's `scopeOf`.
   *
   * `stk` or `opt` at the end of a row says what *one row of the answer* is,
   * not where the data comes from — Vol Regime reads option prices and still
   * answers once per symbol. This side had been hand-typing the field on its
   * own route table and had four of the design's eighteen, which is exactly
   * how a hand-kept copy of someone else's table goes.
   */
  const scope = Object.fromEntries(
    (R.ROUTES ?? [])
      .map((r) => r.path)
      .filter((path) => typeof path === 'string')
      .map((path) => [path, R.scopeOf?.(path) ?? null])
      .filter(([, v]) => v === 'underlying' || v === 'contract'),
  )

  /** The design's `FACES` pairs, straight off the registry. */
  const faces = (R.FACES ?? []).map(([reading, method]) => ({ reading, method }))

  /**
   * Which routes read the objective scope, and which are ruled to.
   *
   * Two lists on purpose, and the distinction is the Lens's whole contract:
   * `wired` is what actually filters today, `target` is the reach the Owner
   * ruled. A route joins `wired` in the same change that teaches its page to
   * filter — never before, because a lit token on a page that then ignores the
   * scope is the shell saying something false.
   */
  // `OBJ_SCOPE` itself is private to the registry; `objectiveScope()` is its
  // public reader, so the wired set is asked rather than reached into.
  const objWired = (R.ROUTES ?? [])
    .map((r) => r.path)
    .filter((path) => R.objectiveScope?.(path))
    .sort()
  const objTarget = (R.ROUTES ?? [])
    .map((r) => r.path)
    .filter((path) => R.objectives?.planned?.(path) || R.objectiveScope?.(path))
    .sort()
  const symTarget = (R.ROUTES ?? [])
    .map((r) => r.path)
    .filter((path) => R.symbolPlanned?.(path))
    .sort()

  const inNav = new Map(rows().map((r) => [r.path, r]))
  const all = R.routes ?? R.ROUTES ?? []
  // Rev .48 Q2: the registry names the design-process pages the app does not
  // build. Read, not typed — the app's copy of this list is what drifted.
  if (!(R.DESIGN_ONLY instanceof Set)) throw new Error('shell-registry.js: `DESIGN_ONLY` is not exported as a Set.')
  for (const p of R.DESIGN_ONLY) {
    if (!all.some((r) => r.path === p)) throw new Error(`shell-registry.js: DESIGN_ONLY names ${p}, which is not a route.`)
  }

  const entries = all.map((r) => {
    const nav = inNav.get(r.path)
    return {
      path: r.path,
      label: r.label,
      crumbs: r.crumbs ?? [],
      // A route with no prototype resolves to `_Shell Stub` — the design's own
      // build backlog. It cannot be "adopted", so it is out of the denominator.
      designed: R.fileFor(r.path) !== '_Shell Stub.dc.html',
      file: R.fileFor(r.path),
      round: ROUND.get(R.fileFor(r.path)) ?? null,
      // Per-page rev (design's DECISIONS 2026-09-15, option C): the Rev of that
      // page's last substantive design change. The global Rev moves on every
      // registry change, so comparing against it marked every walked page stale
      // the moment any other page moved. Stub rows carry none.
      rev: typeof r.rev === 'string' && r.rev ? r.rev : null,
      inNav: nav != null,
      group: nav?.group ?? null,
      designOnly: R.DESIGN_ONLY.has(r.path),
    }
  })

  const designed = entries.filter((e) => e.designed).length
  const body = `/**
 * GENERATED — do not edit. \`node scripts/design-nav-snapshot.mjs\`.
 *
 * The design's route table (\`design/trade/shell-registry.js\`), frozen so the
 * adoption tracker has a design side to compute against and the app builds
 * without the design package present.
 *
 * Derived, not typed: ${entries.length} routes, ${designed} with a designed page,
 * ${entries.length - designed} resolving to the stub. One route per line, so a
 * diff on this file reads as the design's menu change.
 */

export interface DesignRoute {
  path: string
  label: string
  crumbs: readonly string[]
  /** False when the route resolves to \`_Shell Stub\` — the design's own backlog. */
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
  /**
   * The registry's \`DESIGN_ONLY\` (Rev .48): a design-process document kept in
   * the package and not built in the app, so out of the denominator.
   */
  designOnly: boolean
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
${faces.map((f) => '  ' + JSON.stringify(f) + ',').join('\n')}
]

/**
 * Routes that read the objective scope today — the Lens lights its token only
 * for these.
 */
export const DESIGN_OBJ_WIRED: readonly string[] = [
${objWired.map((p) => '  ' + JSON.stringify(p) + ',').join('\n')}
]

/**
 * Routes ruled to read it, wired or not. A route here but not in
 * \`DESIGN_OBJ_WIRED\` is the honest third state: held, not wired yet.
 */
export const DESIGN_OBJ_TARGET: readonly string[] = [
${objTarget.map((p) => '  ' + JSON.stringify(p) + ',').join('\n')}
]

/** The same three-state honesty for the symbol scope: ruled reach, wired or not. */
export const DESIGN_SYM_TARGET: readonly string[] = [
${symTarget.map((p) => '  ' + JSON.stringify(p) + ',').join('\n')}
]

/**
 * The design's menu glyphs — the shape, not a library's name for it.
 *
 * Folded to an icon rail the glyph is the only readable thing on a row, so the
 * set was drawn so that no two rows share one. Six of them have no equivalent
 * in any icon library at all (\`payoff\`, \`smile\`, \`ladder\`, \`valve\`,
 * \`rotor\`, \`pillars\`), which is the reason this is path data rather than a
 * table of imports: reaching for the nearest library name would put two rows
 * back on one shape.
 *
 * Every one is a single path on a 24 viewBox with round caps — \`Glyph\` in
 * \`src/lib/design/glyphs.tsx\` is the only thing that should read this.
 */
export const DESIGN_GLYPHS: Readonly<Record<string, string>> = {
${glyphUsed.map((n) => '  ' + JSON.stringify(n) + ': ' + JSON.stringify(dByName.get(n)) + ',').join('\n')}
}

/** Which glyph each row carries, by route. */
export const DESIGN_ROUTE_GLYPH: Readonly<Record<string, string>> = {
${[...glyph.byRoute].sort(([a], [b]) => (a < b ? -1 : 1)).map(([path, name]) => '  ' + JSON.stringify(path) + ': ' + JSON.stringify(name) + ',').join('\n')}
}

/**
 * And each fold heading's, by its label. Keyed by label rather than by route
 * because a heading borrows a child's path to be clickable, so two rows share
 * it while carrying different shapes.
 */
export const DESIGN_FOLD_GLYPH: Readonly<Record<string, string>> = {
${[...glyph.byFold].sort(([a], [b]) => (a < b ? -1 : 1)).map(([label, name]) => '  ' + JSON.stringify(label) + ': ' + JSON.stringify(name) + ',').join('\n')}
}

/** And each group heading's, by its label (System's is \`chip\`). */
export const DESIGN_GROUP_GLYPH: Readonly<Record<string, string>> = {
${[...glyph.byGroup].sort(([a], [b]) => (a < b ? -1 : 1)).map(([label, name]) => '  ' + JSON.stringify(label) + ': ' + JSON.stringify(name) + ',').join('\n')}
}

/**
 * The equipment rail's shapes — the nine surfaces that left the tree (§5a.8)
 * and so carry no nav row. By group id for a rail head, by route for a tab.
 */
export const DESIGN_EQUIP_GROUP_GLYPH: Readonly<Record<string, string>> = {
${[...equipGlyph.byGroup].sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, name]) => '  ' + JSON.stringify(id) + ': ' + JSON.stringify(name) + ',').join('\n')}
}

export const DESIGN_EQUIP_ROUTE_GLYPH: Readonly<Record<string, string>> = {
${[...equipGlyph.byRoute].sort(([a], [b]) => (a < b ? -1 : 1)).map(([path, name]) => '  ' + JSON.stringify(path) + ': ' + JSON.stringify(name) + ',').join('\n')}
}

/**
 * The unit of analysis a page answers in: "stk" (one row per symbol) or "opt"
 * (per strike x expiry). The sidebar's trailing mark reads this.
 */
export const DESIGN_SCOPE: Readonly<Record<string, 'underlying' | 'contract'>> = {
${Object.entries(scope).sort(([a], [b]) => (a < b ? -1 : 1)).map(([path, v]) => '  ' + JSON.stringify(path) + ': ' + JSON.stringify(v) + ',').join('\n')}
}

export const DESIGN_REV = ${JSON.stringify(revOf(pkg))}

export const DESIGN_ROUTES: readonly DesignRoute[] = [
${entries.map((e) => '  ' + JSON.stringify(e) + ',').join('\n')}
]
`
  writeFileSync(out, body)

  const inks = inksOf(R)
  const ramp = rampOf(R, src)
  const lamps = lampsOf(src)
  const rampRows = (th) => Object.entries(ramp[th]).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')
  const inkRows = (th) => Object.entries(inks[th]).map(([k, v]) => `    ${k}: ${JSON.stringify(v)},`).join('\n')
  writeFileSync(
    inksOut,
    `/**
 * GENERATED — do not edit. \`node scripts/design-nav-snapshot.mjs\`.
 *
 * The design registry's colour mirror (\`DIRECTION\` + \`ACCENT\` in
 * \`design/trade/shell-registry.js\`, Rev ${revOf(pkg)}). The values belong to
 * \`@bifrost/ui\` since Rev .31; the registry keeps this copy as a ratchet mirror,
 * and \`identityColour.test.ts\` holds it to the package.
 */

export const DESIGN_INKS = {
  dark: {
${inkRows('dark')}
  },
  light: {
${inkRows('light')}
  },
} as const

/**
 * The neutral ramp (\`RAMP\`, named by \`SK_VARS\`). Trade-only — the package does
 * not carry it (Rev .43 Q5) — so \`identityColour.test.ts\` holds the app's
 * \`--sk-*\` declarations to this mirror instead.
 */
/** The four severity lamps (\`LAMP\`), the same in both themes (Rev .43 Q4). */
export const DESIGN_LAMPS = {
${Object.entries(lamps).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join('\n')}
} as const

export const DESIGN_RAMP = {
  dark: {
${rampRows('dark')}
  },
  light: {
${rampRows('light')}
  },
} as const
`,
  )

  console.log(
    `${entries.length} routes (${designed} designed, ${faces.length} faces, ${objTarget.length} objective-scoped, ` +
      `${glyphUsed.length} glyphs over ${glyph.byRoute.size} rows + ${glyph.byFold.size} folds + ${equipGlyph.byRoute.size} rail surfaces, ${Object.keys(scope).length} scoped) -> ${out}`,
  )
}

const invoked = process.argv[1] ? resolve(process.argv[1]) : ''
if (invoked && fileURLToPath(import.meta.url) === invoked) {
  generate(resolve(process.argv[2] ?? '../design/trade'))
}
