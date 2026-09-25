// @vitest-environment jsdom
/**
 * The head's one duty to the shell (§16.12): say whether the page's name is
 * on screen, and say nothing once the page is gone.
 */
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageHead, PAGEHEAD_EVENT } from './PageHead'

describe('PageHead', () => {
  it('reports its title on screen, and clears the report when the page leaves', () => {
    const seen: (string | null)[] = []
    const on = (e: Event) => seen.push((e as CustomEvent<string | null>).detail)
    window.addEventListener(PAGEHEAD_EVENT, on)
    const { unmount } = render(<PageHead title="Backtest" info="What the page is for." />)
    expect(document.documentElement.dataset.pagehead).toBe('in')
    unmount()
    expect(document.documentElement.dataset.pagehead).toBeUndefined()
    expect(seen).toEqual(['in', null])
    window.removeEventListener(PAGEHEAD_EVENT, on)
  })

  it('keeps the description off screen until asked', () => {
    const { getByRole, queryByRole } = render(<PageHead title="Positions" info="What is in the book." />)
    expect(getByRole('heading', { name: 'Positions' })).toBeTruthy()
    expect(queryByRole('note')).toBeNull()
  })
})
