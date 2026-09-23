import { describe, expect, it } from 'vitest'
import { TYPED_BODY_KINDS, typedFirst } from '@/lib/harness/inboxOrder'

// The queue a reader actually meets on DEV. `order_intent` and `decision_draft`
// head it by time and once had no body of their own, which put the designed
// bodies below the fold; both have one since the design ruled on them
// (2026-09-22.7), so the band they sit in moved with the body — which is the
// property this file exists to keep.
const QUEUE = [
  { id: 'a', kind: 'order_intent' },
  { id: 'b', kind: 'eod_verdict' },
  { id: 'c', kind: 'decision_draft' },
  { id: 'd', kind: 'morning_brief' },
  { id: 'e', kind: 'candidate_batch' },
  { id: 'f', kind: 'policy_suggestion' },
]

describe('typedFirst', () => {
  it('puts every card the design drew before the ones it did not', () => {
    const out = typedFirst(QUEUE)
    const firstProse = out.findIndex((r) => !TYPED_BODY_KINDS.has(r.kind))
    const lastTyped = out.map((r) => TYPED_BODY_KINDS.has(r.kind)).lastIndexOf(true)
    expect(lastTyped).toBeLessThan(firstProse)
  })

  it('keeps the server order inside each band — a grouping, not a re-sort', () => {
    const out = typedFirst(QUEUE)
    expect(out.filter((r) => TYPED_BODY_KINDS.has(r.kind)).map((r) => r.id)).toEqual(['a', 'c', 'e', 'f'])
    expect(out.filter((r) => !TYPED_BODY_KINDS.has(r.kind)).map((r) => r.id)).toEqual(['b', 'd'])
  })

  it('hides nothing', () => {
    expect(typedFirst(QUEUE).map((r) => r.id).sort()).toEqual(QUEUE.map((r) => r.id).sort())
  })

  it('leaves a queue that is all one band untouched', () => {
    const allProse = QUEUE.filter((r) => !TYPED_BODY_KINDS.has(r.kind))
    expect(typedFirst(allProse)).toEqual(allProse)
  })
})
