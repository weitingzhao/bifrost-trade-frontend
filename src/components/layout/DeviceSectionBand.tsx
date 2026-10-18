/**
 * A `SectionBand` whose default fold follows the layout class (design Rev .164,
 * DESIGN_CONTRACTS §18.7 `data-sr-fold="compact short"` · §18.11).
 *
 * Reference sections a narrow or a short screen should not spend its first
 * screen on start folded there — `foldAt={['compact', 'short']}` — and open
 * everywhere else. Compact and short (above compact: an iPad Air, a 13″
 * laptop) each remember their own fold, never carried to the desk. Crossing a
 * class remounts the band alone, so it re-reads that class's default and
 * memory; the page around it stays.
 *
 * Rev .163's `phoneDefaultOpen` / `padDefaultOpen` stay as aliases: the phone
 * is compact, the iPad's density is short.
 *
 * App-level until the DS takes `foldAt` on `SectionBand` itself (Rev .174 B10).
 */
import type { ComponentProps } from 'react'
import { SectionBand } from '@bifrost/ui'
import { useLayout } from '@/lib/device'

// Read off the component, not imported: @bifrost/ui 0.14.0 stopped exporting
// the props types neither app imported.
type SectionBandProps = ComponentProps<typeof SectionBand>

export type FoldClass = 'compact' | 'short'

export interface DeviceSectionBandProps extends SectionBandProps {
  /** Start folded in these classes; each keeps its own memory. */
  foldAt?: readonly FoldClass[]
  /** Rev .163: the phone's default — compact's now. */
  phoneDefaultOpen?: boolean
  /** Rev .163: the iPad's default — short's now. */
  padDefaultOpen?: boolean
}

export function DeviceSectionBand({
  foldAt,
  phoneDefaultOpen,
  padDefaultOpen,
  defaultOpen = true,
  persistKey,
  ...band
}: DeviceSectionBandProps) {
  const { w, h } = useLayout()
  const cls: FoldClass | null = w === 'compact' ? 'compact' : h === 'short' ? 'short' : null
  const alias = cls === 'compact' ? phoneDefaultOpen : cls === 'short' ? padDefaultOpen : undefined
  const classDefault = cls == null ? defaultOpen : (alias ?? (foldAt?.includes(cls) ? false : defaultOpen))
  const page = persistKey ?? (typeof window === 'undefined' ? '' : window.location.pathname)
  return (
    <SectionBand
      key={cls ?? 'desk'}
      {...band}
      defaultOpen={classDefault}
      persistKey={cls == null ? persistKey : `${page}@${cls}`}
    />
  )
}
