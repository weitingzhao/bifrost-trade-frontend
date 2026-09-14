// @vitest-environment jsdom
/**
 * The empty state's starters after the Copilot left the seat rail (§11.2.7):
 * three groups — This page / The book / The loop — no seat filtering, nothing
 * deleted, and The book's header carries the one remaining road to the
 * Trading Copilot's full catalogue (Design 2026-09-14 ①).
 */
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { QuickPromptChips } from './QuickPromptChips'

function renderChips() {
  return render(
    <MemoryRouter>
      <QuickPromptChips onPick={() => {}} />
    </MemoryRouter>,
  )
}

describe('QuickPromptChips', () => {
  it('shows the three groups in order, every starter kept', () => {
    renderChips()
    const groups = ['This page', 'The book', 'The loop']
    for (const g of groups) expect(screen.getByText(g)).toBeTruthy()
    // 13 starters as before the regroup — none deleted, none seat-filtered.
    const counts = groups.map(
      (g) => within(screen.getByLabelText(g)).getAllByRole('button').length,
    )
    expect(counts).toEqual([1, 7, 5])
  })

  it("links The book's header to the full catalogue", () => {
    renderChips()
    const link = screen.getByRole('link', { name: /all starters/i })
    expect(link.getAttribute('href')).toBe('/research/copilot/trading')
  })
})
