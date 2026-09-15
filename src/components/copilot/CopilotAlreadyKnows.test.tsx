// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copilotViewStore } from '@/store/copilotViewStore'
import { CopilotAlreadyKnows } from './CopilotAlreadyKnows'

vi.mock('@/components/cockpit/CopilotContextPopover', () => ({
  CopilotContextPopover: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

describe('CopilotAlreadyKnows', () => {
  afterEach(() => {
    copilotViewStore.clear()
  })

  it('shows page / symbol / date from the registered view', () => {
    copilotViewStore.register({
      originPage: '/portfolio/positions',
      originLabel: 'Positions',
      symbol: 'NVDA',
      date: '2026-09-14',
    })
    render(<CopilotAlreadyKnows />)
    expect(screen.getByText('It already knows')).toBeTruthy()
    expect(screen.getByText('Positions')).toBeTruthy()
    expect(screen.getByText('NVDA')).toBeTruthy()
    expect(screen.getByText('2026-09-14')).toBeTruthy()
  })

  it('keeps the heading and + when nothing is registered — does not guess a page', () => {
    render(<CopilotAlreadyKnows />)
    expect(screen.getByText('It already knows')).toBeTruthy()
    expect(screen.getByTitle('Set session context')).toBeTruthy()
    expect(screen.queryByText('page')).toBeNull()
  })
})
