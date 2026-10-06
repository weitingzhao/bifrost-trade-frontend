// @vitest-environment jsdom
/**
 * TD-179: No model's Earnings sort is live — enabled, and it hands the choice
 * back to the page.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RankDrawer } from './RankDrawer'
import type { WeightSet } from './stockScreenView'

const WEIGHTS: WeightSet = { sepa: {}, premium: {} }

describe('RankDrawer — No model sort', () => {
  it('enables Earnings and reports the pick', () => {
    const onNoneSort = vi.fn()
    render(
      <RankDrawer model="none" weights={WEIGHTS} onWeights={() => {}} noneSort="sym" onNoneSort={onNoneSort} source="" />,
    )
    const earn = screen.getByRole('button', { name: 'Earnings' })
    expect(earn).not.toBeDisabled()
    fireEvent.click(earn)
    expect(onNoneSort).toHaveBeenCalledWith('earn')
  })
})
