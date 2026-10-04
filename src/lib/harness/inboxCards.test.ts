import { describe, expect, it } from 'vitest'
import type { AiDraft, DraftKind } from '@/api/researchDrafts'
import { buildInboxCards, cardHoldingDraft, hiddenDecisionCount, inboxCardKey, inboxSections } from './inboxCards'

// Fixtures are made up: ids, hypotheses, objectives and symbols are invented.
let seq = 0
function draft(kind: DraftKind, payload: Record<string, unknown>, at: string, scope = 'global'): AiDraft {
  seq += 1
  return {
    id: `d${seq}`,
    kind,
    payload,
    scope,
    status: 'pending',
    generated_by: 'loop_curator',
    linked_action_id: null,
    created_at: `2026-01-${at}T10:00:00Z`,
    expires_at: null,
  }
}
const batch = (obj: string, syms: string[], at: string) =>
  draft('candidate_batch', { objective_id: obj, items: syms.map((s) => ({ id: `c-${s}-${at}`, symbol: s })) }, at, `objective:${obj}`)
const patch = (obj: string, at: string) =>
  draft('policy_suggestion', { objective_id: obj, suggestion: { max_candidates: 5 }, current_policy: { max_candidates: 8 } }, at, `objective:${obj}`)

describe('call cards (Rev .143 #2)', () => {
  it('merges a verdict and a vehicle on one hypothesis into one call', () => {
    const v = draft('decision_draft', { hypothesis_id: 'hyp-a', verdict: 'watch_only' }, '02')
    const o = draft('order_intent', { hypothesis_id: 'hyp-a', strategy_template: 'Long Call' }, '03')
    const [card, ...rest] = buildInboxCards([v, o])
    expect(rest).toEqual([])
    expect(card.key).toBe('call:hyp-a')
    expect(card.tag).toBe('call')
    expect(card.dest).toBe('nothing')
    // The verdict heads the card even when the vehicle is newer.
    expect(card.head).toBe(v)
    expect(card.verdict).toBe(v)
    expect(card.vehicle).toBe(o)
    expect(card.answers.map((d) => d.id).sort()).toEqual([v.id, o.id].sort())
  })

  it('never merges on a blank hypothesis id', () => {
    const a = draft('decision_draft', { hypothesis_id: '' }, '02', 'hypothesis:')
    const b = draft('order_intent', { hypothesis_id: '' }, '02', 'hypothesis:')
    const c = draft('decision_draft', {}, '02', 'hypothesis:')
    const cards = buildInboxCards([a, b, c])
    expect(cards).toHaveLength(3)
    expect(cards.every((x) => x.shape === 'single' && x.dest === 'nothing' && x.tag === 'call')).toBe(true)
  })

  it('takes the newest verdict and folds the older one, and answers all of them', () => {
    const old = draft('decision_draft', { hypothesis_id: 'hyp-b', verdict: 'avoid' }, '01')
    const fresh = draft('decision_draft', { hypothesis_id: 'hyp-b', verdict: 'watch' }, '05')
    const veh = draft('order_intent', { hypothesis_id: 'hyp-b' }, '04')
    const [card] = buildInboxCards([old, fresh, veh])
    expect(card.verdict).toBe(fresh)
    expect(card.folded).toEqual([old])
    expect(card.answers).toHaveLength(3)
  })

  it('draws a vehicle alone as a call headed by the vehicle', () => {
    const o = draft('order_intent', { hypothesis_id: 'hyp-c' }, '03')
    const [card] = buildInboxCards([o])
    expect(card.shape).toBe('call')
    expect(card.verdict).toBeNull()
    expect(card.head).toBe(o)
  })
})

describe('one card per objective (Rev .143 #5 · Owner 2026-10-04 #12)', () => {
  it('lets the newest batch cover earlier ones whatever names they proposed', () => {
    const b1 = batch('obj-x', ['AAA', 'BBB'], '01')
    const b2 = batch('obj-x', ['CCC'], '03')
    const b3 = batch('obj-x', ['AAA', 'BBB'], '02')
    const other = batch('obj-y', ['DDD'], '02')
    const cards = buildInboxCards([b1, b2, b3, other])
    expect(cards.map((c) => c.key)).toEqual(['pool:obj-x', 'pool:obj-y'])
    expect(cards[0].head).toBe(b2)
    expect(cards[0].folded).toEqual([b3, b1])
    expect(cards[0].answers).toEqual([b2])
    expect(cards[0].tag).toBe('candidates')
  })

  it('folds an objective’s patches the same way, and puts them in Policy', () => {
    const p1 = patch('obj-x', '01')
    const p2 = patch('obj-x', '04')
    const [card] = buildInboxCards([p1, p2])
    expect(card.key).toBe('patch:obj-x')
    expect(card.dest).toBe('policy')
    expect(card.tag).toBe('patch')
    expect(card.head).toBe(p2)
    expect(card.folded).toEqual([p1])
  })

  it('keeps a rule-scoped policy suggestion a single rule card', () => {
    const r = draft('policy_suggestion', { suggestion: {} }, '01', 'opportunity:O1')
    expect(inboxCardKey(r)).toBe(`draft:${r.id}`)
    const [card] = buildInboxCards([r])
    expect(card.dest).toBe('rules')
    expect(card.tag).toBe('rule')
  })

  it('takes earlier runs hidden in this browser out of the fold, and sends nothing', () => {
    const b1 = batch('obj-z', ['AAA'], '01')
    const b2 = batch('obj-z', ['BBB'], '02')
    const b3 = batch('obj-z', ['CCC'], '03')
    const [card] = buildInboxCards([b1, b2, b3], new Set([b1.id]))
    expect(card.head).toBe(b3)
    expect(card.folded).toEqual([b2])
    expect(card.hiddenEarlier).toEqual([b1])
    expect(hiddenDecisionCount([b1, b2, b3], new Set([b1.id]))).toBe(1)
  })

  it('draws no card when every run of an objective is hidden', () => {
    const b1 = batch('obj-w', ['AAA'], '01')
    expect(buildInboxCards([b1], new Set([b1.id]))).toEqual([])
  })
})

describe('the stream', () => {
  it('leaves briefings out and orders cards newest first', () => {
    const eod = draft('eod_verdict', {}, '09')
    const note = draft('playbook_note', { note_md: '## A note' }, '02', 'playbook')
    const hyp = draft('hypothesis_draft', {}, '05')
    const cards = buildInboxCards([eod, note, hyp])
    expect(cards.map((c) => c.head)).toEqual([hyp, note])
    expect(cards.map((c) => c.dest)).toEqual(['book', 'rules'])
  })

  it('finds a card by any of its drafts — the ?card= link', () => {
    const v = draft('decision_draft', { hypothesis_id: 'hyp-q' }, '02')
    const o = draft('order_intent', { hypothesis_id: 'hyp-q' }, '03')
    const b1 = batch('obj-q', ['AAA'], '01')
    const b2 = batch('obj-q', ['BBB'], '02')
    const cards = buildInboxCards([v, o, b1, b2])
    expect(cardHoldingDraft(cards, o.id)?.key).toBe('call:hyp-q')
    expect(cardHoldingDraft(cards, b1.id)?.key).toBe('pool:obj-q')
    expect(cardHoldingDraft(cards, 'nope')).toBeNull()
  })

  it('groups by where Approve writes, in the design’s order, and leads with a deep-linked card', () => {
    const items = [
      { k: 'n1', d: 'nothing' as const },
      { k: 'p1', d: 'pool' as const },
      { k: 'r1', d: 'rules' as const },
      { k: 'n2', d: 'nothing' as const },
      { k: 'y1', d: 'policy' as const },
    ]
    const plain = inboxSections(items, (i) => i.d)
    expect(plain.map((s) => s.dest)).toEqual(['rules', 'policy', 'pool', 'nothing'])
    expect(plain[3].items.map((i) => i.k)).toEqual(['n1', 'n2'])
    const led = inboxSections(items, (i) => i.d, (i) => i.k === 'n2')
    expect(led.map((s) => s.dest)).toEqual(['nothing', 'rules', 'policy', 'pool'])
    expect(led[0].items.map((i) => i.k)).toEqual(['n2', 'n1'])
  })
})
