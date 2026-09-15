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
    React: { createElement: (t) => ({ __el: t }) },
    localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v) },
    location: { hash: '' },
    addEventListener() {},
    innerWidth: 1800,
  }
  globalThis.document = {
    documentElement: stubEl(),
    getElementById: () => stubEl(),
    createElement: stubEl,
    head: { appendChild() {} },
    querySelector: () => stubEl(),
  }
  globalThis.localStorage = window.localStorage

  const ROUND = roundsByFile(pkg)

  const src = readFileSync(join(pkg, 'shell-registry.js'), 'utf8')
  new Function(src)()
  const R = window.ShellRegistry

  /** The design's Research seats — the keys of `SEAT_HOME` in `shell-registry.js`. Copilot left the rail 2026-09-14 (§11.0). */
  const SEATS = ['workbench', 'lab', 'autopilot']

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
        if (it.to && !borrows) found.push({ path: it.to, label: it.label, group, trail })
        walk(kids, group, borrows ? [...trail, it.label] : trail)
      }
    }
    // Since 2026-09-13 the design's Research group carries only the current
    // seat's pages. Asking for one seat would drop every other seat's pages out
    // of the menu; a page is in the nav if any seat shows it.
    for (const seat of SEATS) {
      for (const g of R.navGroups({ route: '/home', seat })) walk(g.items, g.label, [])
    }
    for (const g of R.systemGroups()) walk(g.items, 'System', [])
    return found
  }

  const inNav = new Map(rows().map((r) => [r.path, r]))
  const all = R.routes ?? R.ROUTES ?? []

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
      inNav: nav != null,
      group: nav?.group ?? null,
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
  /** In the design's sidebar. A route can exist and be reachable only by link. */
  inNav: boolean
  /** Top-level group in the design's tree, when it has a row. */
  group: string | null
}

export const DESIGN_REV = ${JSON.stringify(revOf(pkg))}

export const DESIGN_ROUTES: readonly DesignRoute[] = [
${entries.map((e) => '  ' + JSON.stringify(e) + ',').join('\n')}
]
`
  writeFileSync(out, body)
  console.log(`${entries.length} routes (${designed} designed) -> ${out}`)
}

const invoked = process.argv[1] ? resolve(process.argv[1]) : ''
if (invoked && fileURLToPath(import.meta.url) === invoked) {
  generate(resolve(process.argv[2] ?? '../design/trade'))
}
