// @vitest-environment jsdom
/**
 * The menu bar's Objective chip when the objectives read is refused. A 401 with
 * no Research user is "not signed in", not "No objective" (Design 2026-09-15
 * Q2=A via `classifyResearchAuthError`, the `ResearchAuthGap` wording).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/http'
import { RESEARCH_AUTH_NOT_SET_LINE } from '@/components/auth/ResearchAuthGap'
import { researchAuthStore } from '@/lib/auth/researchUser'

const { objState } = vi.hoisted(() => ({ objState: { error: null as unknown } }))

vi.mock('@/api/research/harness', () => ({
  fetchObjectives: () => (objState.error ? Promise.reject(objState.error) : Promise.resolve({ items: [] })),
  fetchAutopilotStanding: () => Promise.resolve({ objectives: [] }),
}))

const { ObjectiveControl } = await import('./ObjectiveControl')

function renderChip() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ObjectiveControl />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** The menu-bar trigger, not the popover's own Switch buttons. */
const chip = () => screen.getAllByRole('button').find((b) => b.hasAttribute('aria-haspopup'))!

afterEach(() => {
  cleanup()
  researchAuthStore.clear()
  objState.error = null
})

describe('Objective chip when the objectives read is refused', () => {
  it('reads Research user not set on a 401 with no Research user, not No objective', async () => {
    researchAuthStore.clear()
    objState.error = new HttpError(401, 'Research API HTTP 401')
    renderChip()
    await waitFor(() => expect(chip().textContent).toContain('Research user not set'))
    expect(chip().textContent).not.toContain('No objective')
    expect(chip().getAttribute('data-tip')).toContain(RESEARCH_AUTH_NOT_SET_LINE)

    // The popover offers the way in rather than "No objective is in force".
    if (chip().getAttribute('aria-expanded') !== 'true') fireEvent.click(chip())
    expect(await screen.findByText(RESEARCH_AUTH_NOT_SET_LINE)).toBeTruthy()
    expect(screen.queryByText(/No objective is in force/)).toBeNull()
    // The shell's one-popover store outlives the render: put it down.
    fireEvent.click(chip())
  })

  it('reads a dash, not No objective, when the read failed for another reason', async () => {
    objState.error = new HttpError(500, 'Research API HTTP 500')
    renderChip()
    await waitFor(() => expect(chip().textContent).toContain('—'))
    expect(chip().textContent).not.toContain('No objective')
  })

  it('still says No objective when the read answered and none is in force', async () => {
    renderChip()
    await waitFor(() => expect(chip().textContent).toContain('No objective'))
  })
})
