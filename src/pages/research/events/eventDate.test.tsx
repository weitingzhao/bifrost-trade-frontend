/**
 * TD-193 ratchet: a calendar row is shown on its event_date, never on the day
 * the ingest collected it. Fixtures are invented (the fixture rule).
 */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { EventRadarRow } from '@/api/researchEngine'
import { etDaysAgoIso } from '@/lib/freshness'
import { fmtIsoDateToken } from '@/lib/format'
import { eventDayOf, fmtReleaseEt } from './eventDate'

function row(over: Partial<EventRadarRow>): EventRadarRow {
  return {
    event_id: Math.random().toString(36).slice(2),
    batch_id: 'b1',
    collected_at: '2031-03-02',
    event_date: null,
    source: 'fixture',
    subject: 'Fixture subject',
    event_summary: 'An invented event for the date test.',
    affected_symbols: '',
    direction: 0,
    certainty: 1,
    sentiment: 0,
    theme: '',
    importance: 2,
    dropped: false,
    drop_reason: '',
    raw_text: '',
    computed_at: '2031-03-02T00:00:00Z',
    ...over,
  }
}

describe('eventDayOf', () => {
  it('prefers event_date over collected_at', () => {
    expect(eventDayOf(row({ event_date: '2031-03-11' }))).toEqual({ date: '2031-03-11', basis: 'event' })
  })
  it('falls back to collected_at and says so', () => {
    expect(eventDayOf(row({ collected_at: '2031-02-20T09:00:00Z' }))).toEqual({ date: '2031-02-20', basis: 'collected' })
  })
  it('formats a UTC release instant in ET', () => {
    // 12:30Z in March 2031 is after the DST switch (09 Mar) → 08:30 EDT.
    expect(fmtReleaseEt('2031-03-11T12:30:00+00:00')).toBe('08:30 ET')
    expect(fmtReleaseEt(null)).toBeNull()
  })
})

describe('EventsMarketFace forward panel', () => {
  it('shows the event date and the macro release time', async () => {
    const { EventsMarketFace } = await import('./EventsMarketFace')
    const soon = etDaysAgoIso(-5)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <EventsMarketFace
            events={[]}
            themes={[]}
            batches={[]}
            calendar={[
              row({
                subject: 'Fixture forward print',
                origin: 'macro_event_daily',
                event_date: soon,
                release_ts: `${soon}T18:00:00+00:00`,
              }),
            ]}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const tr = screen.getByText('Fixture forward print').closest('tr') as HTMLElement
    expect(tr.textContent).toContain(fmtIsoDateToken(soon))
    expect(tr.textContent).toMatch(/\d{2}:00 ET/)
  })
})
