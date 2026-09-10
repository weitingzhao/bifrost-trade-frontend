/**
 * The arithmetic every hand-rolled chart in this app was writing again.
 *
 * 42 files draw SVG; 25 of them compute their own min/max and their own
 * value→pixel map, with the same four-line preamble each time:
 *
 *   const vals = series.filter(Number.isFinite)
 *   const vMin = Math.min(0, ...vals); const vMax = Math.max(0, ...vals)
 *   const range = vMax - vMin || 1
 *   const y = PT + ((vMax - v) / range) * cH
 *
 * Copied by hand, it drifts by hand. Two charts of the same quantity end up on
 * different baselines — one padded to zero, one not — and nothing says so,
 * because each is internally consistent. On a trading surface that is a
 * comparison the reader makes and gets wrong.
 *
 * This is geometry only. Colours are `chartTokens`; the no-data case is
 * `dataState` + `DataStateBlock`, so a chart with nothing to draw says so
 * instead of returning null and vanishing from the layout.
 */

export interface ScaleOptions {
  /** Drawing extent in pixels, before padding. */
  size: number
  /** Pixels reserved before the axis starts (left for x, top for y). */
  padStart?: number
  /** Pixels reserved after it ends. */
  padEnd?: number
  /**
   * Stretch the domain to include zero. Right for bars, where a column's
   * height is meant to read as a magnitude; wrong for a price line, where it
   * would flatten the very movement the chart exists to show.
   */
  includeZero?: boolean
  /** Force the domain instead of deriving it — for axes shared across panels. */
  domain?: [number, number]
}

export interface Scale {
  min: number
  max: number
  /** Never zero, so callers can divide without guarding. */
  range: number
  /** Domain value → pixel, increasing left-to-right. */
  at: (v: number) => number
  /** Domain value → pixel, increasing top-to-bottom, as SVG y wants. */
  atInverted: (v: number) => number
  /** Where zero sits, for a baseline. Null when zero is outside the domain. */
  zero: number | null
}

/** Only finite numbers describe a domain; null and NaN are absent readings. */
export function finiteValues(values: readonly (number | null | undefined)[]): number[] {
  return values.filter((v): v is number => v != null && Number.isFinite(v))
}

/**
 * `Math.min(...arr)` throws on very large arrays — an option chain can reach
 * the argument limit — so this reduces instead of spreading.
 */
function extent(vals: readonly number[]): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  for (const v of vals) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  return [lo, hi]
}

export function linearScale(
  values: readonly (number | null | undefined)[],
  opts: ScaleOptions,
): Scale {
  const { size, padStart = 0, padEnd = 0, includeZero = false, domain } = opts
  const vals = finiteValues(values)

  let [min, max] = domain ?? extent(vals)
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    // Nothing usable. A degenerate 0–1 domain keeps `at` total rather than
    // making every caller branch; there is nothing to plot on it anyway.
    min = 0
    max = 1
  }
  if (includeZero && !domain) {
    min = Math.min(0, min)
    max = Math.max(0, max)
  }
  // A flat series still has to render — one point in the middle beats a
  // divide-by-zero.
  if (min === max) {
    min -= 0.5
    max += 0.5
  }

  const range = max - min
  const inner = Math.max(0, size - padStart - padEnd)
  const at = (v: number) => padStart + ((v - min) / range) * inner
  return {
    min,
    max,
    range,
    at,
    atInverted: (v: number) => padStart + ((max - v) / range) * inner,
    zero: min <= 0 && max >= 0 ? at(0) : null,
  }
}

/**
 * Ticks on round numbers, which is what the eye reads back as a value.
 *
 * The pattern this replaces was `[min, min + range / 2, max]` — three ticks
 * labelled with whatever the data happened to reach, so an axis would read
 * 0.37 / 2.19 / 4.01 and mean nothing at a glance.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || count < 2) return []
  if (min === max) return [min]
  const raw = (max - min) / (count - 1)
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag
  const first = Math.ceil(min / step) * step
  const out: number[] = []
  // Guard the accumulation rather than the loop bound: floating step sums
  // drift, and a tick a hair past max would be drawn outside the plot.
  for (let t = first; t <= max + step * 1e-9; t += step) {
    out.push(Math.abs(t) < step * 1e-9 ? 0 : t)
  }
  return out
}
