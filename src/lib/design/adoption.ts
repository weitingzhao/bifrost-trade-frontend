/**
 * How far the app has been walked against `design/trade`.
 *
 * Two tables, neither of them typed by hand: `DESIGN_ROUTES` is generated from
 * the design's own `shell-registry.js`, and `ROUTES` is the app's. Everything
 * below is a join over the two, so the tracker cannot drift from either side
 * the way a checklist in a document does.
 *
 * The states are what a route can honestly be, and they are different facts —
 * "we have not looked at this yet" is not "the design has no home for it":
 *
 *   aligned    walked with the Owner against a design rev, and it matches
 *   reviewing  walked and built against the design; waiting for the Owner's look
 *   stale      walked, but against an older rev — the design has moved since
 *   pending    the design has a prototype for this page and we have not walked it
 *   moving     the design dissolves it into another page; waiting on that page
 *   staging    no home found in the design, and nobody has decided yet
 *   unbuilt    the design has a prototype, the app has no page
 *   backlog    the design lists the route but has no prototype behind it yet
 *
 * Only `aligned`, `reviewing`, `moving` and `staging` are written down
 * (`RouteEntry.design`). `pending`, `unbuilt` and `backlog` are derived from the
 * two tables, which keeps the hand-maintained set at about a dozen rows.
 *
 * `reviewing` is not `aligned`: the walk and the build are this side's work,
 * and only the Owner's look puts a page "in place".
 *
 * `backlog` is split out of `pending` and `unbuilt` because a stub has nothing
 * to walk or build against. Counted there, the "to" lists disagreed with the
 * denominator.
 */
import { PAGE_ROUTES, REDIRECT_ROUTES, type RouteEntry } from '@/layout/routeRegistry'
import { DESIGN_REV, DESIGN_ROUTES, type DesignRoute } from './designRoutes.generated'
import { revIsNewer } from './rev'

export type AdoptionState =
  | 'aligned'
  | 'reviewing'
  | 'stale'
  | 'pending'
  | 'moving'
  | 'staging'
  | 'unbuilt'
  | 'backlog'

/** What a route's own entry may declare — one definition, in `tag.ts`. */
export type { DesignTag } from './tag'

export interface AdoptionRow {
  path: string
  label: string
  crumbs: readonly string[]
  state: AdoptionState
  /** The design's own entry, when there is one. */
  design: DesignRoute | null
  /** Set on `aligned` and `stale`. */
  rev?: string
  note?: string
  /**
   * Design routes this page answers to without being them.
   *
   * The design keeps `/research/vol-regime` and the other retired hubs as
   * deep-link aliases onto the Symbol page's tabs — its own decision, adopting
   * the app's `?tab=`. They are covered, not unbuilt, and counting them as
   * work left would have inflated the backlog by five.
   */
  aliasOf?: readonly string[]
  /** Whether the app has a page at this path (false for rows only the design has). */
  inApp: boolean
}

const DESIGN_BY_PATH = new Map(DESIGN_ROUTES.map((d) => [d.path, d]))

/**
 * Design routes the app answers with a redirect, grouped by where they land.
 *
 * A design path the app redirects to a real page is adopted through that page —
 * but only when both paths are the same prototype. The six retired Analyze hubs
 * all resolve to `Research Symbol.dc.html`, so the Symbol page really does
 * answer for them. A redirect between two different prototypes does not:
 * `/research/screener` is the design's screener home and
 * `/research/contract-screener` is Contracts, and forwarding one to the other
 * would have marked the home adopted by a page that was never built.
 *
 * Only redirects whose target is itself a page count — a redirect to a path the
 * app does not have covers nothing.
 */
function aliasesByTarget(pages: ReadonlySet<string>): Map<string, string[]> {
  const byTarget = new Map<string, string[]>()
  for (const r of REDIRECT_ROUTES) {
    const from = DESIGN_BY_PATH.get(r.path)
    if (!from) continue
    const target = r.redirect.split(/[?#]/)[0]
    if (!pages.has(target)) continue
    if (DESIGN_BY_PATH.get(target)?.file !== from.file) continue
    byTarget.set(target, [...(byTarget.get(target) ?? []), r.path])
  }
  return byTarget
}

function stateOf(entry: RouteEntry, design: DesignRoute | null): AdoptionState {
  const tag = entry.design
  if (tag?.state === 'aligned') {
    // Per-page rev when the design stamps one, the package rev when it does not.
    // Comparing every page against the global rev made a page stale because a
    // different page moved; the design now carries the rev of each page's own
    // last substantive change.
    const pageRev = design?.rev ?? DESIGN_REV
    return revIsNewer(pageRev, tag.rev) ? 'stale' : 'aligned'
  }
  if (tag) return tag.state
  if (!design) return 'staging'
  return design.designed ? 'pending' : 'backlog'
}

/** Every app page, and every design page the app does not have. */
/**
 * The tracker is not one of the pages it tracks.
 *
 * It is this side's instrument for running the walk, not a page the design was
 * ever going to have. Left in, it would sit in "to ask" forever as a question
 * with no answer — a permanent row in a worklist.
 */
const TRACKER_PATH = '/docs/design-adoption'

export function adoptionRows(): AdoptionRow[] {
  const pages = PAGE_ROUTES.filter((r) => !r.path.includes(':') && r.path !== TRACKER_PATH)
  const byTarget = aliasesByTarget(new Set(pages.map((r) => r.path)))
  const rows: AdoptionRow[] = pages.map((r) => {
    const design = DESIGN_BY_PATH.get(r.path) ?? null
    const aliasOf = byTarget.get(r.path)
    return {
      path: r.path,
      label: r.label,
      crumbs: r.crumbs ?? [],
      // A page with no design entry of its own is still adopted when the design
      // reaches it under an old name.
      state: stateOf(r, design ?? (aliasOf ? DESIGN_BY_PATH.get(aliasOf[0]) ?? null : null)),
      design,
      rev: r.design?.rev,
      note: r.design?.note,
      aliasOf,
      inApp: true,
    }
  })
  const covered = new Set([...rows.map((r) => r.path), ...[...byTarget.values()].flat()])
  for (const d of DESIGN_ROUTES) {
    if (covered.has(d.path)) continue
    rows.push({
      path: d.path,
      label: d.label,
      crumbs: d.crumbs,
      state: d.designed ? 'unbuilt' : 'backlog',
      design: d,
      inApp: false,
    })
  }
  return rows
}

export interface AdoptionCounts {
  /**
   * The denominator: design routes that have a prototype.
   *
   * Not the app's page count — dozens of the design's prototypes have no app
   * page at all (the `unbuilt` list), so counting against the app would read
   * near 100% with much of the design unbuilt. And not every design route
   * either: a route the design resolves to `_Shell Stub` has nothing to adopt
   * (the `backlog` list).
   */
  designed: number
  /** Design routes that fall to `_Shell Stub` — the design's own backlog. */
  stubs: number
  aligned: number
  byState: Record<AdoptionState, number>
}

export function adoptionCounts(rows: readonly AdoptionRow[]): AdoptionCounts {
  const byState = {
    aligned: 0,
    reviewing: 0,
    stale: 0,
    pending: 0,
    moving: 0,
    staging: 0,
    unbuilt: 0,
    backlog: 0,
  } as Record<AdoptionState, number>
  for (const r of rows) byState[r.state] += 1
  const designed = DESIGN_ROUTES.filter((d) => d.designed).length
  return {
    designed,
    stubs: DESIGN_ROUTES.length - designed,
    aligned: byState.aligned,
    byState,
  }
}

export const ADOPTION_SECTIONS: { state: AdoptionState; title: string; blurb: string }[] = [
  { state: 'aligned', title: 'In place', blurb: 'Walked against the design and matching.' },
  {
    state: 'reviewing',
    title: 'To confirm',
    blurb: 'Walked and built against the design. In place once the Owner has looked.',
  },
  {
    state: 'stale',
    title: 'Walked, then the design moved',
    blurb: 'Aligned against an older rev. Worth a second look, not a rebuild.',
  },
  {
    state: 'pending',
    title: 'To walk',
    blurb: 'The design has a prototype for this page and the app has it. Nobody has compared them yet.',
  },
  {
    state: 'unbuilt',
    title: 'To build',
    blurb: 'The design has a prototype, the app has no page.',
  },
  {
    state: 'moving',
    title: 'To move',
    blurb: 'The design dissolves these into another page. They stay until it exists.',
  },
  {
    state: 'staging',
    title: 'To ask',
    blurb: 'No home found in the design. Absent from the design is not retired — ask before moving.',
  },
  {
    state: 'backlog',
    title: 'The design’s backlog',
    blurb:
      'In the design’s menu with no prototype behind it yet. Nothing to walk or build against — the design’s work, not a “to” list here.',
  },
]

export { DESIGN_REV }
