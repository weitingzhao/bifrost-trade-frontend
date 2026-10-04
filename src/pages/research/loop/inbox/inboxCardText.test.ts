import { describe, expect, it } from 'vitest'
import type { AiDraft, DraftKind } from '@/api/researchDrafts'
import { buildInboxCards } from '@/lib/harness/inboxCards'
import { splitHeadline } from '@/lib/harness/draftHeadline'
import { cardMeta, cardWrites, describeDraft, quickApproveHint, recordToast } from './inboxCardText'

// Invented fixtures.
let n = 0
function draft(kind: DraftKind, payload: Record<string, unknown>, at: string, scope = 'global'): AiDraft {
  n += 1
  return { id: `t${n}`, kind, payload, scope, status: 'pending', generated_by: 'x', linked_action_id: null, created_at: `2026-03-${at}T00:00:00Z`, expires_at: null }
}
const items = (syms: string[]) => syms.map((s) => ({ id: `c-${s}`, symbol: s }))

describe('the folded row says where Approve would write (Rev .144)', () => {
  it('names the pool and the hypotheses a batch opens', () => {
    const [card] = buildInboxCards([draft('candidate_batch', { objective_id: 'o', items: items(['AA', 'BB', 'CC']) }, '01', 'objective:o')])
    expect(quickApproveHint(card)).toBe('Approve → Pool (3) · 3 hypotheses')
  })

  it('names a patch’s merge, or that it would write nothing', () => {
    const live = draft('policy_suggestion', { suggestion: { max_candidates: 5 }, current_policy: { max_candidates: 8 } }, '01', 'objective:o')
    expect(quickApproveHint(buildInboxCards([live])[0])).toBe('Approve → merge policy (1 field)')
    const noop = draft('policy_suggestion', { suggestion: { max_candidates: 8 }, current_policy: { max_candidates: 8 } }, '01', 'objective:p')
    const [card] = buildInboxCards([noop])
    expect(quickApproveHint(card)).toBe('Approve writes nothing')
    expect(cardWrites(card)).toBe(false)
  })

  it('names the Playbook for a note', () => {
    const [card] = buildInboxCards([draft('playbook_note', { note_md: 'x' }, '01', 'playbook')])
    expect(quickApproveHint(card)).toBe('Approve → Playbook')
    expect(cardWrites(card)).toBe(true)
  })
})

describe('the meta line and the fold', () => {
  it('says what a call holds and how many earlier drafts it answers', () => {
    const cards = buildInboxCards([
      draft('decision_draft', { hypothesis_id: 'h', verdict: 'watch' }, '03'),
      draft('decision_draft', { hypothesis_id: 'h', verdict: 'avoid' }, '01'),
      draft('order_intent', { hypothesis_id: 'h', strategy_template: 'Long Call' }, '02'),
    ])
    const head = splitHeadline('ABC STAGE_2A PIVOT — holds')
    expect(cardMeta(cards[0], head)).toBe('Stage 2A pivot · verdict + vehicle · +1 earlier')
    expect(cardWrites(cards[0])).toBe(false)
    expect(recordToast(cards[0], head)).toBe('Answer recorded on ABC (3 drafts) — nothing written, never an order (D10)')
  })

  it('counts an objective’s earlier runs and lists their names', () => {
    const older = draft('candidate_batch', { objective_id: 'o', items: items(['AA', 'BB', 'CC', 'DD', 'EE']) }, '01', 'objective:o')
    const cards = buildInboxCards([older, draft('candidate_batch', { objective_id: 'o', items: items(['FF']) }, '02', 'objective:o')])
    expect(cardMeta(cards[0], splitHeadline('Explorer'))).toBe('+1 earlier run')
    expect(describeDraft(older)).toBe('AA · BB · CC · DD +1')
  })
})
