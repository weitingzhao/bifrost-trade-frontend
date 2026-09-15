// @vitest-environment jsdom
/**
 * The empty state's starters: This page / The book / The loop.
 * The book is TRADE_QUESTIONS — the same catalogue as Trading Copilot.
 */
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { starterToolCaption } from '@/lib/copilot/starterGroupOrder'
import { TRADE_QUESTIONS } from '@/lib/copilot/tradePrompts'
import { writeCopilotPromptLang } from '@/lib/copilot/promptLang'
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
  it('shows the three groups in default order', () => {
    const { container } = renderChips()
    const groups = ['This page', 'The book', 'The loop']
    for (const g of groups) expect(screen.getByText(g)).toBeTruthy()
    expect(groupOrder(container)).toEqual(['page', 'book', 'loop'])
    const counts = groups.map(
      (g) => within(screen.getByLabelText(g)).getAllByRole('button').length,
    )
    expect(counts).toEqual([1, TRADE_QUESTIONS.length, 5])
  })

  it('leads with The book on Portfolio, same TRADE_QUESTIONS catalogue', () => {
    const { container } = renderChips('/portfolio/positions')
    expect(groupOrder(container)).toEqual(['book', 'page', 'loop'])
    const groups = ['The book', 'This page', 'The loop']
    const counts = groups.map(
      (g) => within(screen.getByLabelText(g)).getAllByRole('button').length,
    )
    expect(counts).toEqual([TRADE_QUESTIONS.length, 1, 5])
  })

  it('The book is TRADE_QUESTIONS — labels and tools, not the old 7', () => {
    renderChips()
    const book = screen.getByLabelText('The book')
    expect(within(book).getAllByRole('button')).toHaveLength(TRADE_QUESTIONS.length)
    for (const q of TRADE_QUESTIONS) {
      expect(within(book).getByText(q.label.en)).toBeTruthy()
      expect(within(book).getByText(starterToolCaption(q.tools)!)).toBeTruthy()
    }
    expect(within(book).queryByText('盘前简报')).toBeNull()
  })

  it("links The book's header to the full catalogue", () => {
    renderChips()
    const link = screen.getByRole('link', { name: /all starters/i })
    expect(link.getAttribute('href')).toBe('/research/copilot/trading')
  })

  it('keeps English labels when the prompt language is zh, and puts the Chinese prompt on title', () => {
    writeCopilotPromptLang('zh')
    renderChips()
    const book = screen.getByLabelText('The book')
    for (const q of TRADE_QUESTIONS) {
      expect(within(book).getByText(q.label.en)).toBeTruthy()
      expect(within(book).queryByText(q.label.zh)).toBeNull()
    }
    const first = TRADE_QUESTIONS[0]
    expect(within(book).getByRole('button', { name: new RegExp(first.label.en) }).getAttribute('title')).toBe(
      first.prompt.zh,
    )
    expect(screen.getByText('One symbol, every lens')).toBeTruthy()
    expect(screen.queryByText('标的全景')).toBeNull()
  })
})
