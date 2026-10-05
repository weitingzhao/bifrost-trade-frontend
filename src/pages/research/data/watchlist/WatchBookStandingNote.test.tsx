// @vitest-environment jsdom
/**
 * Signed out the hypotheses answer 401, and every watched name used to read
 * "N of N without a thesis" in red — a claim about theses nobody read.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WatchBookStandingNote } from './WatchBookTable'

describe('WatchBookStandingNote', () => {
  it('counts names without a thesis when the hypotheses were read', () => {
    render(<WatchBookStandingNote names={12} withoutThesis={3} aging={0} />)
    expect(screen.getByText('3 of 12 without a thesis')).toBeTruthy()
  })

  it('reads «—» when they were not', () => {
    render(<WatchBookStandingNote names={12} withoutThesis={null} aging={0} />)
    expect(screen.getByText('— of 12 without a thesis')).toBeTruthy()
    expect(screen.queryByText('12 of 12 without a thesis')).toBeNull()
  })
})
