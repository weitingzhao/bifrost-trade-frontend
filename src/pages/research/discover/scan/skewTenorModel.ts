import type { SkewExtremeRow } from '@/api/research/volSurface'
import { daysTo } from '@/utils/optionTicker'

/** The tenor cell of the skew table: the number, the inputs under it, and why. */
export interface SkewTenor {
  main: string
  sub: string | null
  title: string
}

const dash = '—'

/**
 * What the DTE column says for one ~30-day reading (research 0.152.0).
 *
 * An interpolated reading has no expiry of its own: it is a 30-day slope drawn
 * between two fits, so the column says 30 and names both inputs, counted from
 * New York's today like every other DTE on the page. A window reading is one
 * fit's slope, so it shows that expiry's DTE and says it was not interpolated.
 */
export function skewTenor(
  r: Pick<SkewExtremeRow, 'basis' | 'expiry' | 'short_expiry' | 'long_expiry'>,
  today: string,
): SkewTenor {
  const own = r.expiry ? daysTo(r.expiry, today) : null
  if (r.basis === 'interpolated' && r.short_expiry && r.long_expiry) {
    if (r.short_expiry === r.long_expiry) {
      return { main: '30', sub: null, title: `The ${r.short_expiry} fit sits at 30 DTE — taken as it is` }
    }
    const s = daysTo(r.short_expiry, today)
    const l = daysTo(r.long_expiry, today)
    return {
      main: '30',
      sub: `${s ?? dash} · ${l ?? dash}`,
      title: `Slope interpolated to 30 DTE between the ${r.short_expiry} and ${r.long_expiry} fits`,
    }
  }
  if (r.basis === 'window') {
    return {
      main: own != null ? String(own) : dash,
      sub: 'one fit',
      title: 'No fits either side of 30 DTE that session — this is the one expiry’s slope, not interpolated to 30',
    }
  }
  return { main: own != null ? String(own) : dash, sub: null, title: '' }
}
