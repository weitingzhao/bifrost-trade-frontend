import type { ReactNode } from 'react'

/**
 * A count on a sidebar row (design Rev .61 §5): a borderless capsule, the
 * tone at 18% under the tone's own ink, fully round, 17 high. No frame — the
 * number is the news and the colour says what kind; a boxed tag read as one
 * more control on a row that already has two.
 */
export function NavBadge({ tone, title, children }: { tone: string; title?: string; children: ReactNode }) {
  return (
    <span
      title={title}
      className="ml-auto flex-none whitespace-nowrap rounded-full px-[7px] font-mono text-dense-caption font-semibold leading-[17px]"
      style={{ color: tone, background: `color-mix(in srgb, ${tone} 18%, transparent)` }}
    >
      {children}
    </span>
  )
}
