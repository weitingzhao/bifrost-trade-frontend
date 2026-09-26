/**
 * The arithmetic of a numeric field's step (design Rev .72 §7), kept apart
 * from the capsule so it can be tested.
 */

/** `12` · `1.25` · `-3` · `$84,000` · `33%` — what counts as a number to step. */
export const NUMERIC = /^-?\$?\d[\d,]*(\.\d+)?%?$/

/**
 * `raw` moved by `n` steps, written the way it was written: the `$`, the
 * thousands commas, the `%` and the number of decimals are kept. The step is
 * the value's last decimal place, or `stepAttr` when the field has one.
 */
export function stepValue(raw: string, n: number, stepAttr?: string): string | null {
  const t = raw.trim()
  if (!NUMERIC.test(t)) return null
  const dollar = t.includes('$')
  const pct = t.endsWith('%')
  const grouped = t.includes(',')
  const core = t.replace(/[$,%]/g, '')
  const own = (core.split('.')[1] ?? '').length
  const hasStep = stepAttr != null && Number(stepAttr) > 0
  const st = hasStep ? Number(stepAttr) : 10 ** -own
  // A step finer than the value's own places widens them: 3 by 0.5 is 3.5.
  const dec = hasStep ? Math.max(own, (String(stepAttr).split('.')[1] ?? '').length) : own
  const next = Number(core) + n * st
  const fixed = Math.abs(next).toFixed(dec)
  const body = grouped ? fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : fixed
  const negative = next < 0 && Number(fixed) !== 0
  return `${negative ? '-' : ''}${dollar ? '$' : ''}${body}${pct ? '%' : ''}`
}
