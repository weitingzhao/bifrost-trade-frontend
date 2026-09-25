// @vitest-environment jsdom
/**
 * The §17.1 contract as this app relies on it (`@bifrost/ui` `ViewState`).
 * The pages decide which state; these hold what each state promises.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ViewState } from '@bifrost/ui'

describe('ViewState', () => {
  it('lays a failed refresh over the data as a strip, never in place of it', () => {
    const { container } = render(<ViewState kind="stale" layout="block" title="Couldn’t refresh positions" onAction={() => {}} />)
    const el = container.querySelector('[data-sr-state="stale"]')
    expect(el?.getAttribute('role')).toBe('alert')
    // Asked for a block, still a strip: a stale state keeps the data on screen.
    expect(el?.querySelector('[data-sr-state]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('offers Retry on a failure and hands the press to the page', async () => {
    const retry = vi.fn()
    render(<ViewState kind="failed" title="Couldn’t load the limit book" detail="No limit was evaluated." onAction={retry} />)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(screen.getByText('No limit was evaluated.')).toBeTruthy()
  })

  it('marks loading busy and draws no action', () => {
    const { container } = render(<ViewState kind="loading" title="Loading margin" />)
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('names the reset a filtered state offers, and draws none without a handler', () => {
    const { rerender } = render(<ViewState kind="filtered" onAction={() => {}} actionTitle="Resets accounts · symbol" />)
    expect(screen.getByRole('button', { name: 'Clear filters' }).getAttribute('title')).toBe('Resets accounts · symbol')
    rerender(<ViewState kind="filtered" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('keeps every state but the two failures grey', () => {
    for (const kind of ['empty', 'filtered', 'signedout', 'notwired'] as const) {
      const { container, unmount } = render(<ViewState kind={kind} />)
      expect(container.querySelector('[role="img"]')?.className, kind).toMatch(/bg-lamp-gray/)
      unmount()
    }
  })
})
