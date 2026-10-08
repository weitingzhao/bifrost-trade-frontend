// @vitest-environment jsdom
/**
 * Best regime: the highest 5-day hit rate that clears the sample floor.
 * Under the floor the cell is an em dash, never 0.
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { CandidateOutcomeSummary } from '@/api/research/candidateOutcome'

const useSourceTrackRecord = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/useSourceTrackRecord', async (orig) => {
  const actual = await orig<typeof import('@/hooks/useSourceTrackRecord')>()
  return { ...actual, useSourceTrackRecord }
})

import { JudgeTrackRecord } from './JudgeTrackRecord'

function summary(by_regime: CandidateOutcomeSummary['by_regime']): CandidateOutcomeSummary {
  return {
    source: 'harness',
    days: 365,
    candidates: 40,
    pending: 0,
    horizons: [
      {
        horizon_days: 1,
        settled: 40,
        judged: 40,
        hits: 20,
        hit_rate: 0.5,
        avg_return: 0,
        avg_benchmark: 0,
        avg_excess: 0,
      },
      {
        horizon_days: 5,
        settled: 40,
        judged: 40,
        hits: 22,
        hit_rate: 0.55,
        avg_return: 0,
        avg_benchmark: 0,
        avg_excess: 0.01,
      },
    ],
    by_regime,
  }
}

function renderRow(by_regime: CandidateOutcomeSummary['by_regime']) {
  useSourceTrackRecord.mockReturnValue({
    rows: [{ source: 'harness', summary: summary(by_regime) }],
    loading: false,
    error: null,
  })
  return render(
    <MemoryRouter>
      <JudgeTrackRecord />
    </MemoryRouter>,
  )
}

describe('JudgeTrackRecord — best regime', () => {
  it('names the regime with the highest hit rate above the floor', () => {
    renderRow([
      { regime: 'range', horizon_days: 5, settled: 65, judged: 65, hits: 25, hit_rate: 0.385, avg_excess: 0 },
      { regime: 'trending', horizon_days: 5, settled: 31, judged: 31, hits: 24, hit_rate: 0.774, avg_excess: 0.02 },
      { regime: 'trending', horizon_days: 1, settled: 46, judged: 46, hits: 40, hit_rate: 0.99, avg_excess: 0 },
    ])
    const cell = screen.getByTitle(/trending · 77% at 5d · 31 settled/)
    expect(cell.textContent).toBe('trending')
  })

  it('shows an em dash when no regime clears the floor', () => {
    renderRow([
      { regime: 'range', horizon_days: 5, settled: 3, judged: 3, hits: 2, hit_rate: 0.67, avg_excess: 0 },
      { regime: 'trending', horizon_days: 5, settled: 4, judged: 4, hits: 4, hit_rate: 1, avg_excess: 0 },
    ])
    const cell = screen.getByTitle('fewer than 5 settled in any regime')
    expect(cell.textContent).toBe('—')
    expect(screen.queryByText('0')).toBeNull()
  })
})
