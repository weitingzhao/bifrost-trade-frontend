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
  it('answers in the header and lays the three steps out as rows', () => {
    renderSection()
    expect(screen.getByTestId('room-stats')).toHaveTextContent('backed +0 calls · +2 puts · margin to 50% +56 puts · ≈ +$58,053/cycle')
    const now = screen.getByTestId('room-row-now')
    expect(within(now).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      'Now · entry premium of the book in scope',
      '5',
      '1',
      '$5,990',
      '27% · normal',
    ])
    const backed = screen.getByTestId('room-row-backed')
    expect(backed).toHaveTextContent('+2')
    expect(backed).toHaveTextContent('+$2,333')
    expect(backed).toHaveTextContent('28% · normal')
    const margin = screen.getByTestId('room-row-margin')
    expect(margin).toHaveTextContent('+ Margin to 50%')
    expect(margin).toHaveTextContent('+56')
    expect(margin).toHaveTextContent('+$55,720')
    // 49.9% prints as 50%, and 50% is where the gauge turns heavy.
    expect(margin).toHaveTextContent('50% · heavy')
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
