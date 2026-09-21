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
 * null rather than 81.6. That is the difference from the reader in
 * `ForecastPathOverlay`, which takes `Number(v)` on purpose because its
 * series arrive as strings — two different readings that were both called
 * `num`, which is how the duplicate-name ratchet found this one. Named for
 * what it does, so the next reader does not have to open it to find out.
 */
export function finiteOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
