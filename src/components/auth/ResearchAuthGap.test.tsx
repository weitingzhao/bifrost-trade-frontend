// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { ResearchHttpError } from '@/lib/auth/researchHttpError'
import { researchAuthStore } from '@/lib/auth/researchUser'
import { RESEARCH_AUTH_EXPIRED_LINE, RESEARCH_AUTH_NOT_SET_LINE, ResearchAuthGap } from './ResearchAuthGap'

describe('ResearchAuthGap', () => {
  beforeEach(() => {
    researchAuthStore.clear()
  })

  it('shows a grey Set user empty state for 401 with no token, and no Retry', () => {
    render(<ResearchAuthGap error={new ResearchHttpError(401, 'sessions HTTP 401')} onRetry={vi.fn()} />)
    expect(screen.getByText(RESEARCH_AUTH_NOT_SET_LINE)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Set user' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
    expect(screen.queryByText('Failed to load data')).toBeNull()
    const root = screen.getByText(RESEARCH_AUTH_NOT_SET_LINE).closest('div')
    expect(root?.className ?? '').not.toMatch(/destructive/)
  })

  it('shows red Retry with different copy when a token is still refused', () => {
    researchAuthStore.setCredentials('tok_stale', 'owner')
    render(<ResearchAuthGap error={new ResearchHttpError(401, 'sessions HTTP 401')} onRetry={vi.fn()} />)
    expect(screen.getByText(RESEARCH_AUTH_EXPIRED_LINE)).toBeTruthy()
    expect(screen.queryByText(RESEARCH_AUTH_NOT_SET_LINE)).toBeNull()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
    expect(screen.getByText('Failed to load data')).toBeTruthy()
  })

  it('keeps a 500 as the ordinary failed alert', () => {
    render(<ResearchAuthGap error={new ResearchHttpError(500, 'engine down')} onRetry={vi.fn()} />)
    expect(screen.getByText('Failed to load data')).toBeTruthy()
    expect(screen.getByText('engine down')).toBeTruthy()
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy()
    expect(screen.queryByText(RESEARCH_AUTH_NOT_SET_LINE)).toBeNull()
  })
})
