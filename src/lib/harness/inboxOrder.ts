/**
 * What the Decision Inbox shows first, and why it is an order at all.
 *
 * The prototype draws four card kinds — candidate batch, hypothesis, policy and
 * patch. The queue is mostly kinds it never drew: measured on DEV 2026-09-22,
 * 176 of 200 pending drafts are `eod_verdict`, and `order_intent` and
 * `decision_draft` — the two at the head of the Decisions view by time — appear
 * nowhere in the prototype's own fixture. They fall to the generic prose card
 * because there is no card for them, so a reader met untyped prose first and
 * the designed bodies below the fold, and the page read as unbuilt when three
 * of its four card kinds were built.
 *
 * This is a different axis from the one the card refuses to reorder on: a draft
 * whose Approve writes nothing keeps its place among its own kind and carries
 * that in weight, not position. `digestFirst` is the same shape for Briefings.
 */

/**
 * The kinds DraftCard draws a body for, rather than falling through to prose.
 *
 * Keep this in step with that component's dispatch chain: a kind that gains a
 * body there and not here sinks below the prose cards it just stopped being
 * one of.
 */
export const TYPED_BODY_KINDS: ReadonlySet<string> = new Set([
  'candidate_batch',
  'daily_digest',
  'policy_suggestion',
  'decision_draft',
  // Gained a body 2026-09-22 when the design ruled on it; it belongs in the
  // typed band from that moment, not from the next time someone reads this.
  'order_intent',
])

export function hasTypedBody(draft: { kind: string }): boolean {
  return TYPED_BODY_KINDS.has(draft.kind)
}

/**
 * The cards the design drew, before the ones it did not.
 *
 * Both bands keep the order they arrived in, so this is a grouping and not a
 * re-sort: nothing moves relative to anything of its own kind, and no card is
 * hidden.
 */
export function typedFirst<T extends { kind: string }>(rows: readonly T[]): T[] {
  return [...rows.filter(hasTypedBody), ...rows.filter((r) => !hasTypedBody(r))]
}
