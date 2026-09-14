// @vitest-environment jsdom
/**
 * The digest is read, not approved (Design 2026-09-13 ③ / 2026-09-14 ④): its
 * Approve wrote nothing and the recorded answer had no reader. These tests pin
 * the card's action row per kind — digest gets Mark read + Dismiss only, while
 * the briefings whose Approve conditionally writes (EOD verdict, morning
 * brief — Owner option A, 2026-09-13) keep the button.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DraftCard } from './DraftCard'
import type { AiDraft, DraftKind } from '@/api/researchDrafts'

function makeDraft(kind: DraftKind, payload: Record<string, unknown> = {}): AiDraft {
  return {
    id: `draft-${kind}`,
    kind,
    payload,
    scope: 'global',
    status: 'pending',
    generated_by: 'eod_agent',
    linked_action_id: null,
    created_at: '2026-09-14T12:00:00Z',
    expires_at: null,
  }
}

function renderCard(draft: AiDraft, opts: { onToggleRead?: () => void } = {}) {
  // The digest body reaches useQuery (lens registry) — give it a quiet client.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DraftCard
          draft={draft}
          onApprove={() => {}}
          onDismiss={() => {}}
          onToggleRead={opts.onToggleRead}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DraftCard action row', () => {
  it('daily digest offers Mark read and Dismiss, never Approve', () => {
    renderCard(makeDraft('daily_digest', { markdown: 'Today…' }), {
      onToggleRead: () => {},
    })
    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull()
    expect(screen.queryByText(/approve only records your answer/i)).toBeNull()
    expect(screen.getByRole('button', { name: /mark read/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeTruthy()
  })

  it('EOD verdict keeps its conditional Approve', () => {
    renderCard(
      makeDraft('eod_verdict', {
        hypothesis_id: 'h-1',
        proposed_status: 'validated',
        rationale: 'held through earnings',
      }),
    )
    expect(screen.getByRole('button', { name: /approve/i })).toBeTruthy()
  })

  it('morning brief keeps Approve', () => {
    renderCard(makeDraft('morning_brief', { markdown: 'Brief' }))
    expect(screen.getByRole('button', { name: /approve/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeTruthy()
  })
})
