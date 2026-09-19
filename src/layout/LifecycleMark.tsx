/**
 * The lifecycle numeral that replaces a group's icon (`shell-registry.js`
 * lcMark). A group is recognised by its word, not its glyph, and the numeral
 * carries more: the position in the loop, and — read out of sequence in the
 * `reach` order — which order the sidebar is in. In `loop` order the numerals
 * draw the spine themselves, extended past the row so consecutive marks join.
 */
import type { IconComponent } from '@bifrost/ui'
import { cn } from '@/lib/utils'

export function lifecycleMark(
  glyph: string,
  opts: { spine?: boolean; first?: boolean; last?: boolean } = {},
): IconComponent {
  const { spine = false, first = false, last = false } = opts
  return function LifecycleMark({ className }: { className?: string }) {
    return (
      <span
        className={cn('relative inline-flex size-4 flex-none items-center justify-center', className)}
      >
        {spine ? (
          <span
            aria-hidden
            className="absolute left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-border"
            style={{ top: first ? '50%' : '-13px', bottom: last ? '50%' : '-13px' }}
          />
        ) : null}
        <span className="relative inline-flex size-3.5 items-center justify-center rounded-full border border-border bg-secondary font-mono text-dense-micro font-bold leading-3 text-muted-foreground">
          {glyph}
        </span>
      </span>
    )
  }
}
