// @vitest-environment jsdom
/**
 * Signed out, the candidate-outcome rows answer 401 (Research step 4). The
 * track record says the Research user is not set — not a red failure, and not
 * "Nothing has settled", a claim about a record nobody read.
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RESEARCH_AUTH_NOT_SET_LINE } from '@/components/auth/ResearchAuthGap'
import { HttpError } from '@/lib/http'

vi.mock('@/hooks/useSourceTrackRecord', async (orig) => ({
  ...(await orig<typeof import('@/hooks/useSourceTrackRecord')>()),
  useSourceTrackRecord: () => ({ rows: [], loading: false, error: new HttpError(401, 'Outcome rows HTTP 401') }),
}))

import { JudgeTrackRecord } from './JudgeTrackRecord'

describe('JudgeTrackRecord — signed out', () => {
  it('names the missing user and claims nothing about the record', () => {
    render(
      <MemoryRouter>
        <JudgeTrackRecord />
      </MemoryRouter>,
    )
    expect(screen.getByText(RESEARCH_AUTH_NOT_SET_LINE)).toBeTruthy()
    expect(screen.queryByText(/Nothing has settled/)).toBeNull()
    expect(screen.queryByText('Failed to load data')).toBeNull()
  })
})
