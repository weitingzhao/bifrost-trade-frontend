import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { RoomToAddSection } from './RoomToAddSection'
import { computeRoomToAdd } from '@/utils/roomToAdd'
import { fixture, NOW } from '@/utils/roomToAdd.fixture'

function renderSection(ceiling = 0.5) {
  const f = fixture()
  const room = computeRoomToAdd({ ...f, ceiling, nowSec: NOW })
  const onCeilingChange = vi.fn()
  render(
    <RoomToAddSection open onToggle={() => {}} room={room} coverRows={f.coverRows} ceiling={ceiling} onCeilingChange={onCeilingChange} />,
  )
  return { onCeilingChange }
}

describe('RoomToAddSection', () => {
  it('keeps its title whole, answers in the header, and draws each step as a premium ladder and a pressure bar', () => {
    renderSection()
    expect(screen.getByText('Room to add')).toHaveClass('shrink-0')
    expect(screen.getByTestId('room-stats')).toHaveTextContent('+0 calls · +2 puts · +56 on margin · ≈ +$58.1k/cycle')

    const now = screen.getByTestId('room-row-now')
    expect(now).toHaveTextContent('Now')
    expect(now).toHaveTextContent('5 calls · 1 puts')
    expect(now).toHaveTextContent('$5,990')
    expect(now).toHaveTextContent('27%')
    const backed = screen.getByTestId('room-row-backed')
    expect(backed).toHaveTextContent('+0 calls · +2 puts · no new margin')
    expect(backed).toHaveTextContent('+$2,333')
    expect(backed).toHaveTextContent('28%')
    const margin = screen.getByTestId('room-row-margin')
    expect(margin).toHaveTextContent('+ Margin to 50%')
    expect(margin).toHaveTextContent('+56 puts on margin')
    expect(margin).toHaveTextContent('+$55,720')
    expect(margin).toHaveTextContent('50%')

    // The ladder accumulates: each step's meter reads the total up to it, on one scale.
    const total = 5990 + 2333 + 55720
    expect(screen.getByTestId('ladder-now')).toHaveAttribute('aria-valuenow', '5990')
    expect(screen.getByTestId('ladder-backed')).toHaveAttribute('aria-valuenow', String(5990 + 2333))
    expect(screen.getByTestId('ladder-margin')).toHaveAttribute('aria-valuenow', String(total))
    expect(screen.getByTestId('ladder-margin')).toHaveAttribute('aria-valuemax', String(total))
    // Three steps, two meters each.
    expect(screen.getAllByRole('meter')).toHaveLength(6)
    expect(within(margin).getByRole('meter', { name: '+ Margin to 50%: pressure after' })).toHaveAttribute('aria-valuenow', '50')
  })

  it('the ceiling is a setting on the section, and ? opens the derivation', () => {
    const { onCeilingChange } = renderSection()
    const input = screen.getByLabelText('Pressure ceiling for the margin step, percent')
    expect(input).toHaveValue(50)
    fireEvent.change(input, { target: { value: '60' } })
    expect(onCeilingChange).toHaveBeenCalledWith(0.6)
    fireEvent.click(screen.getByRole('button', { name: 'How Room to add is computed' }))
    const block = screen.getByTestId('explanation')
    expect(block).toHaveAccessibleName('How Room to add is computed')
    expect(within(block).getAllByTestId('derivation-row').map((r) => r.getAttribute('data-var'))).toContain('MarginPuts')
  })
})
