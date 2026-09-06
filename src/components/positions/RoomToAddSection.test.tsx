import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { RoomToAddSection } from './RoomToAddSection'
import { computeRoomToAdd } from '@/utils/roomToAdd'
import { fixture, NOW } from '@/utils/roomToAdd.fixture'

function renderSection(ceiling = 0.5) {
  const f = fixture()
  const room = computeRoomToAdd({ ...f, ceiling, nowSec: NOW })
  const onCeilingChange = vi.fn()
  render(<RoomToAddSection room={room} coverRows={f.coverRows} ceiling={ceiling} onCeilingChange={onCeilingChange} />)
  return { onCeilingChange }
}

describe('RoomToAddSection', () => {
  it('is always open, answers in its header, and draws each step as a premium ladder and a pressure bar', () => {
    renderSection()
    // No disclosure: nothing to expand, and the figures are on screen from the start.
    expect(screen.queryByRole('button', { expanded: true })).toBeNull()
    expect(screen.getByTestId('room-stats')).toHaveTextContent('+0 calls · +2 puts · +56 on margin · ≈ +$58.1k/cycle')

    const now = screen.getByTestId('room-row-now')
    expect(now).toHaveTextContent('5 calls · 1 puts')
    expect(now).toHaveTextContent('$5,990')
    expect(now).toHaveTextContent('27%')
    const backed = screen.getByTestId('room-row-backed')
    expect(backed).toHaveTextContent('+0 calls · +2 puts · no new margin')
    expect(backed).toHaveTextContent('+$2,333')
    const margin = screen.getByTestId('room-row-margin')
    expect(margin).toHaveTextContent('+ Margin to 50%')
    expect(margin).toHaveTextContent('+56 puts on margin')
    expect(margin).toHaveTextContent('+$55,720')

    // The ladder accumulates: each step's meter reads the total up to it, on one scale.
    const total = 5990 + 2333 + 55720
    expect(screen.getByTestId('ladder-now')).toHaveAttribute('aria-valuenow', '5990')
    expect(screen.getByTestId('ladder-backed')).toHaveAttribute('aria-valuenow', String(5990 + 2333))
    expect(screen.getByTestId('ladder-margin')).toHaveAttribute('aria-valuenow', String(total))
    expect(screen.getByTestId('ladder-margin')).toHaveAttribute('aria-valuemax', String(total))
    expect(screen.getAllByRole('meter')).toHaveLength(6)
    expect(within(margin).getByRole('meter', { name: '+ Margin to 50%: pressure after' })).toHaveAttribute('aria-valuenow', '50')
  })

  it('each step has its own ?, naming the contracts, legs and broker fields behind that row', () => {
    renderSection()
    fireEvent.click(screen.getByRole('button', { name: 'How Now is computed' }))
    let block = screen.getByTestId('explanation')
    expect(block).toHaveAccessibleName('How Now — the book in scope is computed')
    const rows = () => within(block).getAllByTestId('derivation-row').map((r) => r.getAttribute('data-var'))
    expect(rows()).toEqual(['CallsNow', 'PutsNow', 'NetPremium', 'PressureNow'])

    // "5 calls" opens into the account and symbol lines it was summed from.
    fireEvent.click(within(block).getAllByTestId('var-link').find((b) => b.getAttribute('data-var') === 'CallsNow') as HTMLElement)
    let card = screen.getByTestId('variable-card')
    expect(card).toHaveTextContent('U1 NVDA')
    expect(card).toHaveTextContent('strike 245')
    expect(within(card).getByTestId('variable-items')).toHaveTextContent('U1 NVDAstrike 2455')

    // The premium opens into the legs, credits and debits apart.
    fireEvent.click(within(block).getAllByTestId('var-link').find((b) => b.getAttribute('data-var') === 'NetPremium') as HTMLElement)
    card = screen.getByTestId('variable-card')
    expect(card).toHaveTextContent('U1 NVDA 245C 11/20/26')
    expect(card).toHaveTextContent('sold 5 × $9.99/share × 100')
    expect(card).toHaveTextContent('+$4,995.00')

    // Pressure opens into the broker fields, per account.
    fireEvent.click(within(block).getAllByTestId('var-link').find((b) => b.getAttribute('data-var') === 'PressureNow') as HTMLElement)
    card = screen.getByTestId('variable-card')
    expect(card).toHaveTextContent('excess $730,000.00 ÷ NLV $1,000,000.00 = cushion 0.7300')

    // The bars are explained on every step, not only in the legend line.
    expect(block).toHaveTextContent('Wide bar - premium per cycle, cumulative')
    expect(block).toHaveTextContent('Thin bar - pressure after this step')

    // A second ? swaps the block to that step; clicking the open one closes it.
    fireEvent.click(screen.getByRole('button', { name: 'How + Margin to 50% is computed' }))
    block = screen.getByTestId('explanation')
    expect(block).toHaveAccessibleName('How Margin — headroom to 50% is computed')
    expect(rows()).toEqual([
      'MarginPuts',
      'HeadroomLeft',
      'Headroom',
      // The backed puts take Reg T margin first, so they are inside this walk too.
      'Puts',
      'CashFree',
      'CashPerPut',
      'PutsNow',
      'MarginPerPut',
      'MarginIncome',
      'PremiumPerPut',
      'PressureAfter',
    ])
    fireEvent.click(screen.getByRole('button', { name: 'How + Margin to 50% is computed' }))
    expect(screen.queryByTestId('explanation')).toBeNull()
  })

  it('the ceiling is a setting on the section, and the header ? walks the whole model', () => {
    const { onCeilingChange } = renderSection()
    const input = screen.getByLabelText('Pressure ceiling for the margin step, percent')
    expect(input).toHaveValue(50)
    fireEvent.change(input, { target: { value: '60' } })
    expect(onCeilingChange).toHaveBeenCalledWith(0.6)

    fireEvent.click(screen.getByRole('button', { name: 'How Room to add is computed' }))
    const block = screen.getByTestId('explanation')
    const vars = within(block).getAllByTestId('derivation-row').map((r) => r.getAttribute('data-var'))
    expect(vars).toContain('CallsNow')
    expect(vars).toContain('Income')
    expect(vars).toContain('PressureAfter')
    fireEvent.keyDown(screen.getByLabelText('Room to add'), { key: 'Escape' })
    expect(screen.queryByTestId('explanation')).toBeNull()
  })
})
