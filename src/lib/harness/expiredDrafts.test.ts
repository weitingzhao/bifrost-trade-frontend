import { describe, expect, it } from 'vitest'
import type { AiDraft } from '@/api/researchDrafts'
import { expiredInfo, expiredLine, recentExpired } from './expiredDrafts'

const draft = (over: Partial<AiDraft> & { payload?: Record<string, unknown> }): AiDraft =>
  ({
    id: 'd1',
    kind: 'hypothesis_draft',
    status: 'expired',
    payload: {},
    expires_at: null,
    created_at: '2026-10-01T12:00:00Z',
    generated_by: 'agent',
    ...over,
  }) as AiDraft

describe('expired drafts (design Rev .156)', () => {
  it('reads why from payload.expired: replaced names the newer draft', () => {
    const d = draft({ payload: { expired: { reason: 'superseded', superseded_by: 'd2', at: '2026-10-05T14:00:00Z' } } })
    expect(expiredInfo(d)).toEqual({ why: 'replaced', by: 'd2', at: '2026-10-05T14:00:00Z' })
    expect(expiredLine(expiredInfo(d))).toBe('A newer draft replaced it')
  })

  it('a due draft says the day, in the design’s order', () => {
    const d = draft({ payload: { expired: { reason: 'due', at: '2026-10-05T14:00:00Z' } } })
    expect(expiredInfo(d).why).toBe('due')
    expect(expiredLine(expiredInfo(d))).toBe('Expired Mon 5 Oct')
  })

  it('keeps only the last three days, newest first, and drops undated rows', () => {
    const now = new Date('2026-10-06T12:00:00Z')
    const rows = [
      draft({ id: 'old', payload: { expired: { at: '2026-09-30T12:00:00Z' } } }),
      draft({ id: 'a', payload: { expired: { at: '2026-10-04T12:00:00Z' } } }),
      draft({ id: 'b', payload: { expired: { at: '2026-10-06T10:00:00Z' } } }),
      draft({ id: 'nodate' }),
      draft({ id: 'pending', status: 'pending', payload: { expired: { at: '2026-10-06T10:00:00Z' } } }),
    ]
    expect(recentExpired(rows, now).map((d) => d.id)).toEqual(['b', 'a'])
  })
})
