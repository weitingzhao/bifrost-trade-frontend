import type { ReactNode } from 'react'

/**
 * A count on a sidebar row, the Finder way (design Rev .137 §3): no capsule,
 * just the figure at the row's end in mono 11/500. A live reading keeps its
 * state colour on the digits; a neutral one (`tone` omitted) reads the
 * vibrancy mute, like every other secondary ink on the glass.
 */
export function NavBadge({ tone, title, children }: { tone?: string; title?: string; children: ReactNode }) {
  return (
    <span
      title={title}
      className="ml-auto flex-none whitespace-nowrap font-mono text-[11px] font-medium leading-[17px] tabular-nums"
      style={{ color: tone ?? 'var(--vib-mute)' }}
    >
      {children}
    </span>
  )
}
