/**
 * The lifecycle numeral that replaces a group's icon (`shell-registry.js`
 * lcMark). A group is recognised by its word, not its glyph, and the numeral
 * carries more: the position in the loop, and — read out of sequence in the
 * `reach` order — which order the sidebar is in. In `loop` order the numerals
 * draw the spine themselves, extended past the row so consecutive marks join.
 *
 * Folded to the icon rail (design Rev .165, Owner: a strip of `· 3 4 1 2 5`
 * says nothing), each layer shows its picture instead — Home a house,
 * Research a compass, Risk a shield, Trading two arrows, Portfolio a pie,
 * Review a look-back tick — the current one in its layer hue. Since D2 that
 * is the group's `railIcon` (`railMark`), which the DS `ShellNavSidebar`
 * draws on the rail in place of `icon` (0.15.x B5); expanded, the numeral and
 * the name as before.
 */
import type { IconComponent } from '@bifrost/ui'
import { cn } from '@/lib/utils'

/** The rail pictures (`shell-registry.js` `ic.home` · `compass` · `shieldcheck` · `trade` · `pie` · `review`). */
export const LAYER_RAIL_GLYPH: Readonly<Record<string, string>> = {
  Home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  Research: 'M12 2a10 10 0 100 20 10 10 0 000-20zM15 9l-2 6-4 2 2-6z',
  Risk: 'M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6zM9 12l2 2 4-4',
  Trading: 'M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3',
  Portfolio: 'M12 3a9 9 0 100 18 9 9 0 000-18M12 12V3M12 12l7 5',
  Review: 'M4.5 12a7.5 7.5 0 102.2-5.3M4 4v4h4M9 12l2 2 4-4',
}

/** A layer's picture for the folded rail (the group's `railIcon`); the layer you stand in takes its hue. */
export function railMark(path: string, here = false): IconComponent {
  return function RailMark({ className }: { className?: string }) {
    return (
      <span
        aria-hidden
        className={cn('inline-flex size-4 flex-none items-center justify-center', className)}
        style={{ color: here ? 'var(--sk-layer)' : 'currentColor' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d={path} />
        </svg>
      </span>
    )
  }
}

export function lifecycleMark(
  glyph: string,
  opts: { spine?: boolean; first?: boolean; last?: boolean; here?: boolean } = {},
): IconComponent {
  const { spine = false, first = false, last = false, here = false } = opts
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
        {/* Only the numeral for the layer you are standing in takes its hue
            (design Rev 2026-09-23.5). Colouring all six would make the column
            a palette; colouring none would waste the one place in the tree
            that can say which layer a group belongs to. Since Rev .27 the
            others also lose their disc: a half-weight hairline ring, no fill —
            the digit still reads, and the ring stops competing with the one
            layer you are in. Rev .137 drops their ring altogether: the bare
            digit in the vibrancy mute, like every secondary ink on the glass. */}
        <span
          className={cn(
            'relative inline-flex size-3.5 items-center justify-center rounded-full border font-mono text-dense-micro font-bold leading-3',
            here ? 'border-current bg-secondary' : 'border-transparent',
          )}
          style={here ? { color: 'var(--sk-layer)' } : { color: 'var(--vib-mute)' }}
        >
          {glyph}
        </span>
      </span>
    )
  }
}
