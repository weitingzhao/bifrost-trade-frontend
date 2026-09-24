/**
 * The fed Market face cannot be rendered against DEV while the pipeline is
 * unfed, so the walk's proof is here: invented fixtures (never real data —
 * the fixture rule), the design's three blocks, and the filters actually
 * filtering. When the first real batch lands, the page renders this same
 * component with the store's rows.
 */
import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EventsMarketFace } from './EventsMarketFace'
import type { EventRadarRow } from '@/api/researchEngine'

const tomorrow = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10)

function row(over: Partial<EventRadarRow>): EventRadarRow {
  return {
    event_id: Math.random().toString(36).slice(2),
    batch_id: 'b1',
    collected_at: '2026-01-05T10:00:00Z',
    event_date: null,
    source: 'note',
    subject: 'Fixture subject',
    event_summary: 'A wholly invented event for the render test.',
    affected_symbols: 'ZZZA',
    direction: 1,
    certainty: 2,
    sentiment: 0.4,
    theme: 'Fixture theme',
    importance: 3,
    dropped: false,
    drop_reason: '',
    raw_text: '',
    computed_at: '2026-01-05T10:00:00Z',
    ...over,
  }
}

function mount(events: EventRadarRow[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EventsMarketFace
          events={events}
          themes={[
            { theme: 'Fixture theme', count: 2, direction_avg: 1, sentiment_avg: 0.4, bull_count: 2, bear_count: 0, neutral_count: 0 },
          ]}
          batches={[{ batch_id: 'b1', collected_at: '2026-01-05T10:00:00Z' }]}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EventsMarketFace', () => {
  it('renders the three blocks and counts the window', () => {
    mount([row({}), row({ subject: 'Dated fixture', event_date: tomorrow, direction: -1, importance: 1 })])
    expect(screen.getByText('1 theme in the window')).toBeTruthy()
    expect(screen.getByText('1 dated event ahead')).toBeTruthy()
    expect(screen.getByText('what the ingest read')).toBeTruthy()
    expect(screen.getByText('2 of 2 events · 0 touch the book')).toBeTruthy()
  })

  it('filters by importance without touching the themes panel', () => {
    mount([row({}), row({ subject: 'Low imp', importance: 1 })])
    fireEvent.click(screen.getByRole('button', { name: 'High' }))
    expect(screen.getByText('1 of 2 events · 0 touch the book')).toBeTruthy()
    // The themes panel counts the whole window, not the filtered table.
    expect(screen.getByText('1 theme in the window')).toBeTruthy()
  })

  it('a theme row click filters the events table', () => {
    mount([row({}), row({ subject: 'Other-theme row', theme: 'Elsewhere' })])
    fireEvent.click(screen.getAllByText('Fixture theme')[0])
    expect(screen.getByText('1 of 2 events · 0 touch the book')).toBeTruthy()
  })
})
