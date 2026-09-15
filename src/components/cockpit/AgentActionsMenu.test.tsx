// @vitest-environment jsdom
/**
 * Composer Run ▾ must only list actions that produce a draft. Inbox /
 * Autopilot / Save as Hypothesis were navigation — they left this menu (C2-a3).
 */
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/useCockpitPins', () => ({
  useCockpitPins: () => ({ focusedHypothesisId: null, hypothesisIds: [] }),
}))
vi.mock('@/hooks/useResearchDrafts', () => ({
  useRunMorningAgent: () => ({ isPending: false, mutate: vi.fn() }),
  useRunEodAgent: () => ({ isPending: false, mutate: vi.fn() }),
}))
vi.mock('@/hooks/useLoopHarness', () => ({
  useActiveObjectives: () => ({ data: { items: [] } }),
  useAwaitingRuns: () => ({ data: { items: [] } }),
  useRunObjective: () => ({ isPending: false, mutate: vi.fn() }),
  useCurateRun: () => ({ isPending: false, mutate: vi.fn() }),
}))

import { AgentActionsMenu } from './AgentActionsMenu'

describe('AgentActionsMenu', () => {
  beforeAll(() => {
    HTMLElement.prototype.hasPointerCapture = () => false
    HTMLElement.prototype.setPointerCapture = () => {}
    HTMLElement.prototype.releasePointerCapture = () => {}
  })

  it('is Run, and lists only draft-producing actions', async () => {
    render(
      <MemoryRouter>
        <AgentActionsMenu />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: 'Agent actions' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Run' }))
    // userEvent in case pointer polyfill needs it
    if (!screen.queryByText('Morning Prep')) {
      await userEvent.click(screen.getByRole('button', { name: 'Run' }))
    }
    expect(await screen.findByText('Morning Prep')).toBeTruthy()
    expect(screen.getByText('EOD Review')).toBeTruthy()
    expect(screen.getByText('Run active objective')).toBeTruthy()
    expect(screen.getByText('Curator on latest awaiting')).toBeTruthy()
    expect(screen.getByText('Event query')).toBeTruthy()
    expect(screen.queryByText('Open Decision Inbox')).toBeNull()
    expect(screen.queryByText('Open Autopilot')).toBeNull()
    expect(screen.queryByText('Save as Hypothesis')).toBeNull()
  })
})
