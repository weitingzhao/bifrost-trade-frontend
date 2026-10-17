/**
 * A `SectionBand` whose default fold follows the device (design Rev .163,
 * DESIGN_CONTRACTS §18.7 `data-sr-phone-fold` · §18.11 `data-sr-pad-fold`).
 *
 * Reference sections a phone or an iPad should not spend its first screen on
 * start folded there, and open on the desk. Each tier remembers its own fold:
 * folding Book on the iPad does not fold it on the desk. A change of tier
 * remounts the band, so it re-reads that tier's default and memory.
 *
 * App-level until the DS takes `phoneDefaultOpen` / `padDefaultOpen` on
 * `SectionBand` itself (HANDOFF Rev .163, proposed for 0.14.0).
 */
import type { ComponentProps } from 'react'
import { SectionBand } from '@bifrost/ui'
import { useDevice } from '@/lib/device'

// Read off the component, not imported: @bifrost/ui 0.14.0 stopped exporting
// the props types neither app imported.
type SectionBandProps = ComponentProps<typeof SectionBand>

export interface DeviceSectionBandProps extends SectionBandProps {
  /** The phone's default; the desk's (`defaultOpen`) when unset. */
  phoneDefaultOpen?: boolean
  /** The iPad's default; the desk's (`defaultOpen`) when unset. */
  padDefaultOpen?: boolean
}

export function DeviceSectionBand({
  phoneDefaultOpen,
  padDefaultOpen,
  defaultOpen = true,
  persistKey,
  ...band
}: DeviceSectionBandProps) {
  const { device } = useDevice()
  const tierDefault =
    device === 'phone' ? (phoneDefaultOpen ?? defaultOpen) : device === 'pad' ? (padDefaultOpen ?? defaultOpen) : defaultOpen
  const page = persistKey ?? (typeof window === 'undefined' ? '' : window.location.pathname)
  return (
    <SectionBand
      key={device}
      {...band}
      defaultOpen={tierDefault}
      persistKey={device === 'desk' ? persistKey : `${page}@${device}`}
    />
  )
}
