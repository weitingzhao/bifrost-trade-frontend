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
 *   aligned   walked with the Owner against a design rev, and it matches
 *   stale     walked, but against an older rev — the design has moved since
 *   pending   the design has this page and we have not walked it
 *   moving    the design dissolves it into another page; waiting on that page
 *   staging   no home found in the design, and nobody has decided yet
 *   unbuilt   the design has the page, the app does not
 *
 * Only `aligned`, `moving` and `staging` are written down (`RouteEntry.design`).
 * `pending` is what an untagged app route in the design table means, and
 * `unbuilt` is what a design route missing from the app table means — deriving
 * the two big states keeps the hand-maintained set at a dozen rows.
 */
import { PAGE_ROUTES, REDIRECT_ROUTES, type RouteEntry } from '@/layout/routeRegistry'
import { DESIGN_REV, DESIGN_ROUTES, type DesignRoute } from './designRoutes.generated'

export type AdoptionState = 'aligned' | 'stale' | 'pending' | 'moving' | 'staging' | 'unbuilt'

/** What a route's own entry may declare. `pending` is never written — it is the default. */
export interface DesignTag {
  state: 'aligned' | 'moving' | 'staging'
  /**
   * The design rev it was walked against. An `aligned` route whose rev is not
   * the current one reads as `stale`: the judgement was real, and it was about
   * a document that has since changed.
   */
  rev?: string
  /** `moving`: where it goes, and what has to exist first. `staging`: the open question. */
  note?: string
}

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
}

const DESIGN_BY_PATH = new Map(DESIGN_ROUTES.map((d) => [d.path, d]))

/**
 * Design routes the app answers with a redirect, grouped by where they land.
 *
 * A design path the app redirects to a real page is adopted through that page.
 * Only redirects whose target is itself a page count — a redirect to a path the
 * app does not have covers nothing.
 */
function aliasesByTarget(pages: ReadonlySet<string>): Map<string, string[]> {
  const byTarget = new Map<string, string[]>()
  for (const r of REDIRECT_ROUTES) {
    if (!DESIGN_BY_PATH.has(r.path)) continue
    const target = r.redirect.split(/[?#]/)[0]
    if (!pages.has(target)) continue
    byTarget.set(target, [...(byTarget.get(target) ?? []), r.path])
  }
  return byTarget
}

function stateOf(entry: RouteEntry, design: DesignRoute | null): AdoptionState {
  const tag = entry.design
  if (tag?.state === 'aligned') return tag.rev === DESIGN_REV ? 'aligned' : 'stale'
  if (tag) return tag.state
  return design ? 'pending' : 'staging'
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
    }
  })
  const covered = new Set([...rows.map((r) => r.path), ...[...byTarget.values()].flat()])
  for (const d of DESIGN_ROUTES) {
    if (covered.has(d.path)) continue
    rows.push({
      path: d.path,
      label: d.label,
      crumbs: d.crumbs,
      state: 'unbuilt',
      design: d,
    })
  }
  return rows
}

export interface AdoptionCounts {
  /**
   * The denominator: design routes that have a prototype.
   *
   * Not the app's page count — 43 of the design's routes have no app page at
   * all, so counting against the app would read near 100% with half the design
   * unbuilt. And not all 88 either: a route the design resolves to
   * `_Shell Stub` has nothing to adopt, and the design calls those its own
   * backlog.
   */
  designed: number
  aligned: number
  byState: Record<AdoptionState, number>
}

export function adoptionCounts(rows: readonly AdoptionRow[]): AdoptionCounts {
  const byState = {
    aligned: 0,
    stale: 0,
    pending: 0,
    moving: 0,
    staging: 0,
    unbuilt: 0,
  } as Record<AdoptionState, number>
  for (const r of rows) byState[r.state] += 1
  return {
    designed: DESIGN_ROUTES.filter((d) => d.designed).length,
    aligned: byState.aligned,
    byState,
  }
}

export const ADOPTION_SECTIONS: { state: AdoptionState; title: string; blurb: string }[] = [
  { state: 'aligned', title: 'In place', blurb: 'Walked against the design and matching.' },
  {
    state: 'stale',
    title: 'Walked, then the design moved',
    blurb: 'Aligned against an older rev. Worth a second look, not a rebuild.',
  },
  {
    state: 'pending',
    title: 'To walk',
    blurb: 'The design has this page and the app has it. Nobody has compared them yet.',
  },
  {
    state: 'unbuilt',
    title: 'To build',
    blurb: 'The design has the page, the app does not.',
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
]

export { DESIGN_REV }
