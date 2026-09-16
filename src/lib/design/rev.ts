/**
 * Comparing design revs — `YYYY-MM-DD.N`.
 *
 * The design stamps every route with the rev of its own last substantive change
 * (registry 5th element, its DECISIONS 2026-09-15 option C). A page the Owner
 * walked goes stale when *that* rev moves past the one it was walked against —
 * not when some other page moves the package's global Rev, which is what the
 * first version of this compared and why five walked pages read stale the day
 * `/docs/omnibar` retired.
 *
 * String comparison is not enough: `.10` sorts before `.9` lexically, so the
 * ordinal is compared as a number.
 */

/** `2026-09-15.13` → `[2026, 9, 15, 13]`; null when it is not a rev. */
export function parseRev(rev: string | null | undefined): [number, number, number, number] | null {
  if (!rev) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:\.(\d+))?$/.exec(rev.trim())
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] ? Number(m[4]) : 0]
}

/**
 * Is `candidate` strictly newer than `baseline`?
 *
 * Unparseable input answers false: an unreadable rev is not evidence that the
 * design moved, and marking a walked page stale on a typo would send the Owner
 * to re-read a page nothing changed on.
 */
export function revIsNewer(candidate: string | null | undefined, baseline: string | null | undefined): boolean {
  const a = parseRev(candidate)
  const b = parseRev(baseline)
  if (!a || !b) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i]
  }
  return false
}
