/**
 * A number the API actually sent, or null.
 *
 * JSON hands back whatever the backend had: a number, a string, a null, or
 * the field missing entirely. `NaN` and `Infinity` survive a `typeof` check
 * and then poison every arithmetic that touches them — silently, because
 * `NaN < 1` is false and so is `NaN >= 1`, so a guard written either way
 * passes and the wrong branch runs.
 *
 * **It does not coerce.** A string is not a number here; `"81.6"` answers
 * null rather than 81.6. That is the difference from {@link numericOrNull}
 * below, which coerces on purpose because its callers read series and
 * decimals the backend serialises as strings. The two were both called `num`,
 * which is how the duplicate-name ratchet found the first of them. Named for
 * what they do, so the next reader does not have to open them to find out.
 */
export function finiteOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/**
 * The same question asked of a field the backend may serialise as a string.
 *
 * Postgres `numeric` reaches the browser as `"146.73"` through more than one
 * of these APIs — candidate outcomes send every price and return that way —
 * and a forecast series sends its levels the same. So this one coerces, and
 * answers null for anything that is not a finite number afterwards.
 *
 * The blank string is the case worth naming: `Number('')` is `0`, so a reader
 * written as `v == null ? null : Number(v)` turns a missing field into a
 * plotted zero. An empty string is an absent reading, and it answers null.
 */
export function numericOrNull(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string' || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
