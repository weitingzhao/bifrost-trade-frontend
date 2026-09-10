/**
 * What a hypothesis card should show when it can only show three lines.
 *
 * The card truncates in three places — thesis to two lines, tags to three,
 * symbols to four — and every cut was by position. Position carries no signal
 * here: the daily loop writes each thesis from one template, so the opening
 * sentence is identical across every card it produces, and the plumbing tags
 * (`harness`, `candidate_batch`) are appended first. A grid of five cards ended
 * up showing five copies of the same two lines and the same three tags, with
 * the grades and scores that actually tell them apart clipped out of view.
 *
 * These helpers rank before the slice. They read only what is already on the
 * record — the structured metrics live on the linked candidate's
 * `lens_snapshot`, but only 5 of 24 active hypotheses have one, so the card
 * cannot depend on it.
 */

/** Opaque run / batch identifiers that eat the end of a generated title. */
const TRAILING_REF = /\s*\(((?:run|batch|job)_[A-Za-z0-9._-]{4,}|[0-9a-f]{12,})\)\s*$/i

export interface TitleParts {
  /** The title with any trailing opaque id removed. */
  title: string
  /** That id, to render as a subdued reference — null when there was none. */
  ref: string | null
}

/**
 * "Daily Loop Stock Explorer · SCSC (run_1a081364889cde94e)" hands twenty
 * characters of the most prominent slot to a value nobody reads at a glance,
 * and pushes the symbol toward the clamp. Split it out; the id still shows,
 * just not where the eye lands first.
 */
export function splitTitleRef(title: string): TitleParts {
  const m = TRAILING_REF.exec(title)
  if (!m) return { title: title.trim(), ref: null }
  const stripped = title.slice(0, m.index).trim()
  // A title that is nothing but the id keeps it — better an opaque card than a
  // blank one.
  if (!stripped) return { title: title.trim(), ref: null }
  return { title: stripped, ref: m[1] }
}

/**
 * Sentence boundaries without lookbehind: a terminator, whitespace, then a
 * capital. `$58.48` and `2026-09-08` survive because neither `.` is followed by
 * whitespace.
 */
function sentences(text: string): string[] {
  const out: string[] = []
  let start = 0
  for (let i = 0; i < text.length - 1; i++) {
    const c = text[i]
    if (c !== '.' && c !== '!' && c !== '?') continue
    let j = i + 1
    while (j < text.length && /\s/.test(text[j])) j++
    if (j === i + 1) continue
    if (j >= text.length || !/[A-Z]/.test(text[j])) continue
    out.push(text.slice(start, i + 1).trim())
    start = j
  }
  const tail = text.slice(start).trim()
  if (tail) out.push(tail)
  return out.filter(Boolean)
}

/** A sentence earns its place on the card by carrying a figure. */
function hasFigure(s: string): boolean {
  return /\d/.test(s)
}

/**
 * The part of the thesis worth two lines: the first sentence carrying figures,
 * with whatever follows appended so the clamp still has somewhere to go.
 * Falls back to the whole thesis when nothing is numeric.
 */
export function salientThesis(thesis: string | null | undefined): string {
  const text = (thesis ?? '').trim()
  if (!text) return ''
  const parts = sentences(text)
  if (parts.length < 2) return text
  const first = parts.findIndex(hasFigure)
  if (first <= 0) return text
  return parts.slice(first).join(' ')
}

/**
 * Tags that say how the row was produced rather than what it claims. They are
 * written first by the loop, so an unranked `slice(0, 3)` shows only these.
 * Demoting — rather than promoting a known-good list — keeps any tag we have
 * not seen before visible by default.
 */
const PLUMBING_TAGS = new Set([
  'harness',
  'candidate_batch',
  'from-candidate',
  'daily-loop',
  'batch',
  'manual',
  'auto',
  'copilot-loop',
])

/** Stable: informative tags keep their order, plumbing sinks to the end. */
export function rankTags(tags: readonly string[]): string[] {
  const keep: string[] = []
  const sink: string[] = []
  for (const t of tags) (PLUMBING_TAGS.has(t.toLowerCase()) ? sink : keep).push(t)
  return [...keep, ...sink]
}
