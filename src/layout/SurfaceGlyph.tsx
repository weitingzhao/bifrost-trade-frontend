/**
 * A surface's glyph — **the same one the rail uses to summon it**.
 *
 * §5a.8, eighteenth round, and it is a small thing that does a lot: the tab,
 * the float's title bar and the rail icon all name a surface with one mark, so
 * "the thing I opened from there" and "the thing sitting here" read as one
 * object. What it replaces is a coloured dot, which said only *which group*
 * and left the tab strip a row of three identical circles.
 *
 * A run is the one surface with no rail icon (there is no runs page on this
 * side to give it one), so it carries the reading's own mark: a pipeline.
 */
import { createElement } from 'react'
import { Workflow } from 'lucide-react'
import { glyph } from '@/lib/design/glyphs'
import { EQUIP_GROUPS } from './equip'
import type { Surface } from './equipSurface'

const SUBJECT = glyph('subject')

function iconFor(surface: Surface) {
  if (surface.run) return Workflow
  // The toolbar's Symbol button draws the same shape (design `icons.subject`).
  if (surface.subject) return SUBJECT
  for (const g of EQUIP_GROUPS) {
    if (g.hub.to === surface.to) return g.hub.icon
    const page = g.pages.find((p) => p.to === surface.to)
    if (page) return page.icon
  }
  return g0Icon(surface)
}

/** Anything else falls back to its group's own head icon rather than nothing. */
function g0Icon(surface: Surface) {
  return EQUIP_GROUPS.find((g) => g.id === surface.group)?.icon ?? Workflow
}

export function SurfaceGlyph({
  surface,
  className,
  style,
}: {
  surface: Surface
  className?: string
  style?: React.CSSProperties
}) {
  // `createElement`, not `<Icon />`: the lint rule reads a capitalised local
  // as a component *created during render*. These are lucide components with
  // stable module-scope identities, so the rule's concern does not apply, and
  // this is the spelling that says so.
  return (
    <span className={className} style={style}>
      {createElement(iconFor(surface), { className: 'size-3.5', 'aria-hidden': true })}
    </span>
  )
}
