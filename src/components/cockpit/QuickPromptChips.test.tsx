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

function renderChips(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QuickPromptChips onPick={() => {}} />
    </MemoryRouter>,
  )
}

function groupOrder(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-starter-group]')).map(
    (el) => el.getAttribute('data-starter-group') ?? '',
  )
}

describe('QuickPromptChips', () => {
  it('shows the three groups in order, every starter kept', () => {
    const { container } = renderChips()
    const groups = ['This page', 'The book', 'The loop']
    for (const g of groups) expect(screen.getByText(g)).toBeTruthy()
    expect(groupOrder(container)).toEqual(['page', 'book', 'loop'])
    // 13 starters as before the regroup — none deleted, none seat-filtered.
    const counts = groups.map(
      (g) => within(screen.getByLabelText(g)).getAllByRole('button').length,
    )
    expect(counts).toEqual([1, 7, 5])
  })

  it('leads with The book on Portfolio, counts unchanged', () => {
    const { container } = renderChips('/portfolio/positions')
    expect(groupOrder(container)).toEqual(['book', 'page', 'loop'])
    const groups = ['The book', 'This page', 'The loop']
    const counts = groups.map(
      (g) => within(screen.getByLabelText(g)).getAllByRole('button').length,
    )
    expect(counts).toEqual([7, 1, 5])
  })

  it('names the tools on Entry gates, and does not invent them on the rest of The book', () => {
    renderChips()
    const book = screen.getByLabelText('The book')
    expect(within(book).getByText('trade.strategy.gate_safety')).toBeTruthy()
    expect(within(book).queryAllByText(/trade\./).length).toBe(1)
  })

  it("links The book's header to the full catalogue", () => {
    renderChips()
    const link = screen.getByRole('link', { name: /all starters/i })
    expect(link.getAttribute('href')).toBe('/research/copilot/trading')
  })
})
