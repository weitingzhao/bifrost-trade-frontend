/**
 * The park gate (design 2026-09-27, Owner: "wherever I wander I want the
 * simplest way back to the entrance"). A toolbar module is a park: its hub
 * is the gate, its pages and the paths it owns are inside. On a member page
 * the breadcrumb opens with one quiet chip — `‹ ● The Book` — back to the
 * module's home; the hub's own click does the same. At the gate there is
 * nothing to go back to, and where the trail already links the home (r4:
 * two gates side by side read wrong) the trail is the gate and the chip yields.
 */
import { EQUIP_HUE, equipGroupOf } from './equip'
import { routeFor } from './routeRegistry'

export interface ParkGate {
  to: string
  name: string
  hue: string
}

/** The module a page stands inside, other than at its home — or null. */
export function parkOf(path: string) {
  const g = equipGroupOf(path)
  return g && g.hub.to !== path ? g : null
}

export function parkGate(path: string, trail: readonly { to?: string | null }[]): ParkGate | null {
  const g = parkOf(path)
  if (!g) return null
  if (trail.some((c) => c.to === g.hub.to)) return null
  return { to: g.hub.to, name: routeFor(g.hub.to).label || g.hub.label || g.label, hue: EQUIP_HUE[g.id] }
}
