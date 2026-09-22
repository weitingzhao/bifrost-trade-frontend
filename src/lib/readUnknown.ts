/**
 * Reading a value off an untyped payload, once.
 *
 * Four corners of the app grew the same four-line `str(v: unknown)` — the
 * digest reader, the draft provenance rule, the Journal's node model and, on
 * 2026-09-22, the objective's patch banner. The code-health ratchet counted
 * the fourth and was right to: the API's payloads are `Record<string,
 * unknown>` by design, so "pull a string out of one" is not four decisions,
 * it is one made four times.
 *
 * The rule each copy already agreed on, kept here: **a blank string is not a
 * value.** A payload that carries `""` is carrying an absence with a type,
 * and a caller that prints it shows an empty cell where it meant to show a
 * dash.
 *
 * The three older helpers named `readStr` / `readNum` in `faceExtras.ts` take
 * a record and a key rather than a value; they can adopt `readKey` below
 * whenever that file is next touched.
 */

/** A non-blank string, or null. */
export function readStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

/** A finite number, or null — `NaN` and `Infinity` are not readings. */
export function readNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** The same, off a key of a payload that may not be there at all. */
export function readKey(
  payload: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  return readStr(payload?.[key])
}

/** Every string in an array value, dropping anything else. */
export function readStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}
