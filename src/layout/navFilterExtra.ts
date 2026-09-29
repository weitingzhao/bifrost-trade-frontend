/**
 * What the sidebar's "Filter pages" field finds beyond the tree on screen
 * (design 2026-09-28): the toolbar's equipment, which has no tree row (placed
 * `Toolbar · The Book`), and the other tree — the business pages from inside
 * System, System's from anywhere else — so one field finds every page there is.
 */
import { shellNavFilterIndex, type ShellNavFilterEntry, type ShellNavGroup } from '@bifrost/ui'
import { EQUIP_GROUPS } from './equip'

export function navFilterExtra(otherTree: readonly ShellNavGroup[], otherName: string): ShellNavFilterEntry[] {
  const equipment: ShellNavFilterEntry[] = EQUIP_GROUPS.flatMap((g) =>
    [g.hub, ...g.pages].map((p) => ({
      id: p.to,
      to: p.to,
      label: p.label ?? g.label,
      place: `Toolbar · ${g.label}`,
    })),
  )
  // A tree whose top group already carries its name (System › System) says it once.
  const other = shellNavFilterIndex(otherTree).map((e) => ({
    ...e,
    place: e.place === otherName || e.place.startsWith(`${otherName} › `) ? e.place : `${otherName} › ${e.place}`,
  }))
  return [...equipment, ...other]
}
