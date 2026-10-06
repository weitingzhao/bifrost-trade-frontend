import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { AiDraft } from '@/api/researchDrafts'
import { expiredInfo } from '@/lib/harness/expiredDrafts'
import { ExpiredDraftCard, type ExpiredItem } from './InboxDecisionList'

const draft = {
  id: 'd2x',
  kind: 'hypothesis_draft',
  status: 'expired',
  scope: 'global',
  generated_by: 'vol-reader',
  linked_action_id: null,
  created_at: '2026-10-04T12:00:00Z',
  expires_at: null,
  payload: { title: 'PLTR: IV crush after the print', expired: { reason: 'superseded', superseded_by: 'd2', at: '2026-10-05T14:00:00Z' } },
} as unknown as AiDraft

describe('ExpiredDraftCard (design Rev .156)', () => {
  it('is inert: an expired tag, the reason, Open newer → and no Approve or Dismiss', () => {
    const onOpenNewer = vi.fn()
    const onPutAway = vi.fn()
    const item: ExpiredItem = { key: 'expired:d2x', draft, info: expiredInfo(draft), newerKey: 'draft:d2' }
    render(<ExpiredDraftCard item={item} onOpenNewer={onOpenNewer} onPutAway={onPutAway} />)
    expect(screen.getByText('expired')).toBeTruthy()
    expect(screen.getByText('A newer draft replaced it')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Approve/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Dismiss$/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Open newer →' }))
    expect(onOpenNewer).toHaveBeenCalledWith('draft:d2')
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss earlier' }))
    expect(onPutAway).toHaveBeenCalled()
  })

  it('draws no Open newer when the newer card is not on the page', () => {
    const item: ExpiredItem = { key: 'expired:d2x', draft, info: expiredInfo(draft), newerKey: null }
    render(<ExpiredDraftCard item={item} onOpenNewer={() => {}} onPutAway={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Open newer →' })).toBeNull()
  })
})
