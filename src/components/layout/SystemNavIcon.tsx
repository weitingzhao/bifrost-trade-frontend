import type { LucideIcon } from 'lucide-react'
import type { ShellNavItem } from '@bifrost/ui'

/**
 * A nav row's leading icon.
 *
 * It used to carry a health tint on the System › Runtime rows (API, Daemon,
 * Socket), which probed every API on every page to colour three icons. The
 * Runtime pages retired to the Ops Console on 2026-09-25, and the status bar's
 * System lamp is the one always-on reading, so the icon is just the icon.
 */
export function NavSubItemIcon({ item }: { item: ShellNavItem }) {
  const Icon = item.icon as LucideIcon | undefined
  if (Icon == null) return null
  return <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
}
