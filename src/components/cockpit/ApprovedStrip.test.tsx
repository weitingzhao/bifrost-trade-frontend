// @vitest-environment jsdom
/**
 * The post-approval strip (Design 2026-09-13 ⑥): what was written, where to
 * check it, gone after a few seconds, no Undo. The wordings pinned here are
 * the three the handoff names — a kind with a destination, a kind whose
 * approval writes nothing, and an `executed` that actually carries an id.
 */
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  APPROVED_STRIP_MS,
  ApprovedStrip,
  approvedStripLine,
  useApprovedStripState,
  type ApprovedDraftResult,
} from './ApprovedStrip'
import type { AiDraft, DraftKind } from '@/api/researchDrafts'

function makeDraft(kind: DraftKind, payload: Record<string, unknown> = {}): AiDraft {
  return {
    id: `draft-${kind}`,
    kind,
    payload,
    scope: 'global',
    status: 'approved',
    generated_by: 'eod_agent',
    linked_action_id: null,
    created_at: '2026-09-14T12:00:00Z',
    expires_at: null,
  }
}

describe('approvedStripLine', () => {
  it('names the destination when the kind has one', () => {
    const line = approvedStripLine(makeDraft('candidate_batch'), undefined)
    expect(line.text).toBe('Approved → Candidate Pool · Hypothesis Board')
    expect(line.viewTo).toBe('/research/loop/candidates')
  })

  it('says only Approved when the approval writes nothing', () => {
    const line = approvedStripLine(makeDraft('decision_draft'), {
      note: 'approved decision_draft (advisory pass-through; no side-effect write)',
    })
    expect(line.text).toBe('Approved')
    expect(line.viewTo).toBeNull()
  })

  it('names the hypothesis id only when executed carries one', () => {
    const draft = makeDraft('eod_verdict', {
      hypothesis_id: 'h-12',
      proposed_status: 'active',
    })
    const withId = approvedStripLine(draft, {
      hypothesis: { id: 'h-12', status: 'active' },
    })
    expect(withId.text).toBe('Approved → hypothesis h-12 set active')
    expect(withId.viewTo).toBe('/research/loop/hypotheses')

    // The server applied nothing (`hypothesis: null` + note): no invented id.
    const withoutId = approvedStripLine(draft, { hypothesis: null, note: 'no status applied' })
    expect(withoutId.text).toBe('Approved → Hypothesis → active')
  })

  it('counts a batch off the server lists, not the payload', () => {
    const line = approvedStripLine(makeDraft('candidate_batch'), {
      promoted: [{}, {}, {}],
      hypotheses: [{}],
    })
    expect(line.text).toBe(
      'Approved → Candidate Pool · Hypothesis Board · 3 promoted · 1 hypothesis opened',
    )
  })
})

function StripHarness({ result }: { result: ApprovedDraftResult | undefined }) {
  const state = useApprovedStripState(result)
  return (
    <MemoryRouter>
      <ApprovedStrip state={state} />
    </MemoryRouter>
  )
}

describe('ApprovedStrip visibility', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows on a fresh approval and leaves after its timeout', () => {
    const result: ApprovedDraftResult = {
      draft: makeDraft('candidate_batch'),
      executed: {},
    }
    const view = render(<StripHarness result={undefined} />)
    expect(screen.queryByRole('status')).toBeNull()

    view.rerender(<StripHarness result={result} />)
    expect(screen.getByRole('status').textContent).toContain('Approved →')

    act(() => vi.advanceTimersByTime(APPROVED_STRIP_MS + 100))
    expect(screen.queryByRole('status')).toBeNull()
  })
})
