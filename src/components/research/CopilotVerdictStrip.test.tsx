// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CopilotVerdictStrip } from './CopilotVerdictStrip'

const fixture = vi.hoisted(() => ({
  verdicts: {
    symbol: 'NVDA',
    generated_at: '2026-09-08T05:00:00+00:00',
    digest: {
      day: '2026-09-08',
      draft_id: 'drf',
      status: 'pending',
      lenses: [
        { lens: 'iv_rank', band: 'cold', value: 18.7, means: 'premium cheap', as_of: '2026-09-04' },
      ],
      proposed: true,
      batches: [
        {
          run_id: 'run_1',
          objective_title: 'Daily Loop Stock Explorer',
          status: 'awaiting_approval',
          auto_accepted: false,
          held_reasons: ['judges did not agree (dissent)'],
        },
      ],
      dissent: null,
      resolution: null,
      line: 'iv_rank cold · held',
    },
    proposals: [
      {
        kind: 'candidate',
        id: 'c1',
        status: 'open',
        state: 'proposed',
        title: 'Candidate · copilot',
        by_copilot: true,
        created_at: '2026-09-08T03:00:00+00:00',
        source: 'copilot',
      },
      {
        kind: 'hypothesis',
        id: 'h1',
        status: 'active',
        state: 'active',
        title: 'NVDA IV extreme short',
        by_copilot: true,
        created_at: '2026-09-07T20:00:00+00:00',
      },
      {
        kind: 'draft',
        id: 'd1',
        status: 'pending',
        state: 'awaiting approval',
        title: 'NVDA short strangle',
        by_copilot: true,
        created_at: '2026-09-07T01:00:00+00:00',
        draft_kind: 'order_intent',
      },
    ],
    counts: { candidate: 1, hypothesis: 1, draft: 1 },
    advisory: 'D10 BLOCKED',
  },
}))

vi.mock('@/hooks/useResearchContext', () => ({ useResearchContext: () => ({ symbol: 'NVDA' }) }))
vi.mock('@/hooks/useSymbolVerdicts', () => ({
  useSymbolVerdicts: () => ({ data: fixture.verdicts, isLoading: false }),
}))
vi.mock('@/components/research/AskCopilotButton', () => ({
  AskCopilotButton: () => <button type="button">Ask Copilot</button>,
}))

function mount() {
  return render(
    <MemoryRouter>
      <CopilotVerdictStrip originPage="hub:vrp" originLabel="Vol Regime · VRP" />
    </MemoryRouter>
  )
}

describe('CopilotVerdictStrip', () => {
  it('shows the decision chips and one summary line; the lens line is the regime row above', () => {
    mount()
    expect(screen.queryByText('iv_rank: Buy premium bias')).toBeNull()
    expect(screen.getByText('Held: judges did not agree (dissent)')).toBeTruthy()
    expect(
      screen.getByText('1 candidate (1 open) · 1 hypothesis (1 active) · 1 draft (1 pending)')
    ).toBeTruthy()
    expect(screen.getByText('2 waiting')).toBeTruthy()
    expect(screen.getByText(/Candidate · proposed \(Copilot\) · 2026-09-08/)).toBeTruthy()
    expect(screen.queryByTestId('copilot-verdict-proposals')).toBeNull()
    expect(screen.queryByText('order intent · awaiting approval')).toBeNull()
  })

  it('unfolds every proposal chip on demand', () => {
    mount()
    const toggle = screen.getByRole('button', { name: /3 proposals/ })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const list = screen.getByTestId('copilot-verdict-proposals')
    expect(list.textContent).toContain('order intent · awaiting approval')
    expect(list.textContent).toContain('Hypothesis · active')
    expect(list.querySelectorAll('a')).toHaveLength(3)
  })
})
