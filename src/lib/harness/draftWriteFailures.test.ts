import { describe, expect, it } from 'vitest'
import { HttpError } from '@/lib/http'
import {
  DRAFT_EXPIRED_LINE,
  DRAFT_SUPERSEDED_LINE,
  draftExpiredLine,
  settledLine,
} from './draftWriteFailures'

/** Research 0.166.0's 409 for an expired draft (made-up ids). */
function expired(reason: string): HttpError {
  return new HttpError(409, 'Drafts API HTTP 409', {
    body: {
      detail: {
        code: 'draft_expired',
        draft_id: 'drf_x',
        kind: 'candidate_batch',
        reason,
        expired_at: '2026-10-04T12:00:00Z',
        expires_at: '2026-10-04T12:00:00Z',
        superseded_by: reason === 'superseded' ? 'drf_y' : null,
        message: `draft expired (${reason}); it can no longer be approved or dismissed`,
      },
    },
  })
}

describe('draftExpiredLine', () => {
  it('reads a superseded draft as replaced', () => {
    expect(draftExpiredLine(expired('superseded'))).toBe(DRAFT_SUPERSEDED_LINE)
  })

  it('reads every other expiry reason as expired', () => {
    for (const r of ['due', 'hypothesis_inactive', 'objective_missing', 'batch_closed', 'manual', 'expired']) {
      expect(draftExpiredLine(expired(r))).toBe(DRAFT_EXPIRED_LINE)
    }
  })

  it('keeps a status conflict a failure — its detail is a string', () => {
    const e = new HttpError(409, 'HTTP 409', { body: { detail: 'draft status is approved, expected pending' } })
    expect(draftExpiredLine(e)).toBeNull()
    expect(draftExpiredLine(new HttpError(409, 'HTTP 409'))).toBeNull()
    expect(draftExpiredLine(new HttpError(409, 'HTTP 409', { body: { detail: { code: 'other' } } }))).toBeNull()
  })

  it('leaves every other error a failure', () => {
    expect(draftExpiredLine(new HttpError(500, 'HTTP 500'))).toBeNull()
    expect(draftExpiredLine(new HttpError(401, 'HTTP 401'))).toBeNull()
    expect(draftExpiredLine(new Error('network'))).toBeNull()
  })
})

describe('settledLine', () => {
  const r = (landed: number, failed: number, expiredN: number, line: string | null = DRAFT_EXPIRED_LINE) => ({
    landed: Array.from({ length: landed }, (_, i) => `l${i}`),
    failed: Array.from({ length: failed }, (_, i) => `f${i}`),
    expired: Array.from({ length: expiredN }, (_, i) => `e${i}`),
    expiredLine: expiredN ? line : null,
  })
  it('is quiet when everything landed', () => expect(settledLine('Approved', 2, r(2, 0, 0))).toBeNull())
  it('says expired on its own for one draft', () =>
    expect(settledLine('Approved', 1, r(0, 0, 1, DRAFT_SUPERSEDED_LINE))).toBe(DRAFT_SUPERSEDED_LINE))
  it('counts expired among several', () =>
    expect(settledLine('Recorded', 3, r(2, 0, 1, DRAFT_SUPERSEDED_LINE))).toBe(
      'Recorded 2 of 3 · 1 expired — a newer draft replaced it',
    ))
  it('keeps the failures on the card', () =>
    expect(settledLine('Dismissed', 3, r(1, 2, 0))).toBe('Dismissed 1 of 3 — the rest stay on the card'))
})
