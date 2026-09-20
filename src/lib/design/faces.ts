/**
 * Reading and Method — the two faces of one page.
 *
 * The design dissolved Lab on 2026-09-20 with a single argument: the four
 * mirror pages were never siblings of their readings. Pipeline asks what the
 * market said; those pages ask whether the instrument reads it accurately.
 * Same subject, same path root, same endpoint — so the switch between them
 * belongs to the page, not to the tree, and neither face gets its own menu
 * row. A row per face is the Lab mistake resurrected.
 *
 * The pairs are generated from the design's own `FACES`, never typed here: a
 * hand-kept copy of a pairing is exactly the thing that drifts once the design
 * moves a page.
 */
import { DESIGN_FACES } from './designRoutes.generated'
import { PAGE_ROUTES } from '@/layout/routeRegistry'

export type FaceSide = 'reading' | 'method'

export interface PageFace {
  side: FaceSide
  reading: string
  method: string
  /** The route this page's other face lives at. */
  other: string
  /**
   * Whether the app has a page at the other face.
   *
   * The design pairs eight routes; this side has built one of them. A switch
   * that silently navigates to a route with no page is worse than one that
   * says the face is not built — so the control asks, and says.
   */
  otherBuilt: boolean
}

const BUILT = new Set(PAGE_ROUTES.map((r) => r.path))

/** The two faces of a route, or null when the route has only one. */
export function faceOf(path: string): PageFace | null {
  const clean = path.split('?')[0].split('#')[0]
  for (const { reading, method } of DESIGN_FACES) {
    if (clean === reading) {
      return { side: 'reading', reading, method, other: method, otherBuilt: BUILT.has(method) }
    }
    if (clean === method) {
      return { side: 'method', reading, method, other: reading, otherBuilt: BUILT.has(reading) }
    }
  }
  return null
}

/**
 * Reading routes that carry a method face.
 *
 * The menu marks these with `⧉` rather than giving the method a row of its
 * own — the same precedent as the stk / opt unit marks: a dimension the tree
 * admits exists without pretending it is a place.
 */
export function readingsWithMethod(): string[] {
  return DESIGN_FACES.map((f) => f.reading)
}

export function hasMethodFace(path: string): boolean {
  const face = faceOf(path)
  return face?.side === 'reading'
}
