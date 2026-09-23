/**
 * The menu's shapes — one per row, drawn by the design.
 *
 * Why the app does not just pick icons from lucide for these: folded to an
 * icon rail, the glyph is the only readable thing on a row, and the design
 * redrew the whole set so no two rows share a shape. An icon library gives you
 * the *nearest* name, and the nearest name for two adjacent rows is very often
 * the same picture — which is exactly the collision the redraw removed. Six of
 * them have no library equivalent at all: `payoff`, `smile`, `ladder`, `valve`,
 * `rotor`, `pillars`.
 *
 * So the shape comes from `DESIGN_GLYPHS`, which is generated from the design
 * package, and nothing here chooses one. The one thing this file decides is
 * what to draw when a name is missing: an empty square, not a fallback icon —
 * a plausible substitute would be indistinguishable from a glyph that is
 * right, and a row silently wearing the wrong shape is worse on the rail than
 * a row wearing an obvious blank.
 */
import type { ComponentType, CSSProperties } from 'react'
import {
  DESIGN_EQUIP_GROUP_GLYPH,
  DESIGN_EQUIP_ROUTE_GLYPH,
  DESIGN_FOLD_GLYPH,
  DESIGN_GLYPHS,
  DESIGN_ROUTE_GLYPH,
} from './designRoutes.generated'

export type GlyphName = keyof typeof DESIGN_GLYPHS

/** What a missing name draws: a plain box, so the gap is visible on the rail. */
const MISSING = 'M4 4h16v16H4z'

export function Glyph({
  name,
  className,
  style,
}: {
  name: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      <path d={DESIGN_GLYPHS[name] ?? MISSING} />
    </svg>
  )
}

/**
 * A glyph as a nav item's `icon`.
 *
 * `ShellNavItem.icon` is a component, not an element, and the sidebar passes
 * it only a `className`. Memoised per name so the tree does not hand the
 * sidebar a brand-new component type on every render, which would remount
 * every row.
 */
/**
 * What a glyph is, as a prop.
 *
 * `aria-hidden` is in the shape because the callers that render an icon
 * beside its own label pass it, and a lucide component takes arbitrary SVG
 * props while this one does not — leaving it out made the rail the one place
 * a design glyph could not be substituted for a lucide icon.
 */
export type GlyphComponent = ComponentType<{
  className?: string
  style?: CSSProperties
  'aria-hidden'?: boolean
}>

const cache = new Map<string, GlyphComponent>()

export function glyph(name: string): GlyphComponent {
  let made = cache.get(name)
  if (!made) {
    made = ({ className, style }: { className?: string; style?: CSSProperties }) => (
      // `aria-hidden` is accepted and ignored: `Glyph` always sets it.
      <Glyph name={name} className={className} style={style} />
    )
    made.displayName = `Glyph(${name})`
    cache.set(name, made)
  }
  return made
}

/**
 * The glyph the design gives a route, or null when it gives it none.
 *
 * Null is a real answer: the app has pages the design's menu does not carry,
 * and those keep whatever icon they already had rather than borrowing a shape
 * that means something else.
 */
export function routeGlyph(path: string): GlyphComponent | null {
  const name = DESIGN_ROUTE_GLYPH[path]
  return name ? glyph(name) : null
}

/** The same for a fold heading, which the design keys by label, not by route. */
export function foldGlyph(label: string): GlyphComponent | null {
  const name = DESIGN_FOLD_GLYPH[label]
  return name ? glyph(name) : null
}

/**
 * The equipment rail's shapes.
 *
 * The nine surfaces left the tree in §5a.8, so they carry no nav row and
 * `routeGlyph` finds nothing for them. Their shapes are declared in the
 * design's `equip()` instead — by route for a tab, by group id for a rail
 * head — and the rail reads them here for the same reason the tree does: on
 * a rail the glyph is the row.
 */
export function equipRouteGlyph(path: string): GlyphComponent | null {
  const name = DESIGN_EQUIP_ROUTE_GLYPH[path]
  return name ? glyph(name) : null
}

export function equipGroupGlyph(id: string): GlyphComponent | null {
  const name = DESIGN_EQUIP_GROUP_GLYPH[id]
  return name ? glyph(name) : null
}
