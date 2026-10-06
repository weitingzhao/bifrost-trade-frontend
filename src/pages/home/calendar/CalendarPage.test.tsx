// @vitest-environment jsdom
/**
 * The page over invented layers: presets and Custom, a layer switched off,
 * today showing both tenses, a 401 read as unread (not zero), and every item
 * linking to the page that owns it.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { CalendarItem, CalendarLayerId } from '@/lib/calendar/calendarLayers'
import type { CalendarData } from './useCalendarData'

const TODAY = '2031-03-12' // Wednesday

vi.mock('@/lib/freshness', async (orig) => ({
  ...(await orig<typeof import('@/lib/freshness')>()),
  etTodayIso: () => TODAY,
}))

const it_ = (d: string, layer: CalendarLayerId, over: Partial<CalendarItem>): CalendarItem => ({
  key: `${layer}:${d}:${over.text}`,
  d,
  layer,
  cell: '',
  text: 'x',
  syms: [],
  ink: 'soft',
  to: '/',
  ...over,
})

const ITEMS: CalendarItem[] = [
  it_('2031-03-10', 'fills', { text: 'SELL ZZZ 21MAR31 40P ×2', syms: ['ZZZ'], to: '/trade/fills?symbol=ZZZ' }),
  it_(TODAY, 'fills', { text: 'BUY YYY sh ×10', syms: ['YYY'], to: '/trade/42' }),
  it_(TODAY, 'events', { cell: 'CPI', text: 'CPI release', ink: 'macro', to: '/research/events' }),
  it_('2031-03-14', 'expiry', { cell: 'ZZZ 40P', text: '−2 40P', syms: ['ZZZ'], ink: 'contract', to: '/trade/expiration?fri=2031-03-14' }),
  ...['A', 'B', 'C', 'D'].map((n) =>
    it_('2031-03-20', 'events', { cell: `${n}${n} earnings (est.)`, text: `${n}${n} est`, syms: [`${n}${n}`], ink: 'sym', est: true, to: `/research/symbol?symbol=${n}${n}` }),
  ),
  it_('2031-03-11', 'decisions', { text: 'approved · patch', to: '/research/journal?view=day&day=2031-03-11' }),
]

const ready = { state: 'ready' as const, note: null, floor: false }
const DATA: CalendarData = {
  items: ITEMS,
  readings: {
    pnl: ready,
    fills: ready,
    decisions: ready,
    notes: { state: 'signed-out', note: 'Notes are keyed by the research user — sign in to read them.', floor: false },
    dividends: ready,
    events: ready,
    expiry: ready,
    corp: ready,
    horizons: { state: 'signed-out', note: null, floor: false },
    drafts: { state: 'signed-out', note: null, floor: false },
  },
  pnl: new Map([
    ['2031-03-10', { d: '2031-03-10', realized: 120, optionsUnrealized: 0, byTab: {} } as never],
    [TODAY, { d: TODAY, realized: -30, optionsUnrealized: 5, byTab: {} } as never],
  ]),
  holidays: new Map(),
  holidaysState: 'ready',
}
vi.mock('./useCalendarData', () => ({ useCalendarData: () => DATA }))

import CalendarPage from './CalendarPage'

function Where() {
  const l = useLocation()
  return <output data-testid="where">{l.pathname + l.search}</output>
}

function renderAt(url: string) {
  sessionStorage.clear()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <CalendarPage />
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const where = () => screen.getByTestId('where').textContent ?? ''
const cell = (d: string) => document.querySelector<HTMLElement>(`[data-date="${d}"]`)!
const chip = (name: string) => screen.getAllByRole('button').find((b) => b.getAttribute('data-slot') === 'filter-chip' && b.textContent?.startsWith(name))!

describe('Calendar page', () => {
  it('shows past and coming layers in today’s cell, P&L in the corner', () => {
    renderAt('/home/calendar?month=2031-03')
    expect(cell(TODAY).textContent).toContain('1 fill')
    expect(cell(TODAY).textContent).toContain('CPI')
    expect(cell(TODAY).textContent).toContain('−$30')
    expect(cell('2031-03-10').textContent).toContain('+$120')
    // A past day shows no coming layer; a coming day no fill.
    expect(cell('2031-03-14').textContent).toContain('ZZZ 40P')
  })

  it('caps a cell at three lines and says how many more', () => {
    renderAt('/home/calendar?month=2031-03')
    const c = cell('2031-03-20')
    expect(c.textContent).toContain('AA earnings (est.)')
    expect(c.textContent).toContain('CC earnings (est.)')
    expect(c.textContent).not.toContain('DD earnings')
    expect(c.textContent).toContain('+1 more')
  })

  it('switches a layer off, reads the set as Custom, and a preset back', () => {
    renderAt('/home/calendar?month=2031-03')
    expect(chip('Events').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(chip('Events'))
    expect(cell(TODAY).textContent).not.toContain('CPI')
    expect(where()).toContain('layers=pnl%2Cfills%2Cexpiry%2Ccorp')
    expect(screen.getByRole('button', { name: 'Custom' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(where()).toContain('layers=pnl%2Cfills%2Cdecisions%2Cnotes')
    expect(cell('2031-03-11').textContent).toContain('1 decision')
    fireEvent.click(screen.getByRole('button', { name: 'Trading' }))
    expect(where()).not.toContain('layers=')
  })

  it('reads a 401 as unread — a dash and the Research user line, never 0', () => {
    renderAt('/home/calendar?month=2031-03&layers=notes,horizons,drafts,events')
    expect(chip('Notes').textContent).toContain('—')
    expect(chip('Notes').title).toContain('not read — Research user not set')
    const notes = screen.getByTestId('calendar-layer-notes')
    expect(notes.textContent).toContain('Notes · Hypothesis horizons · Draft expiry not read — Research user not set')
    expect(within(notes).getByRole('button', { name: 'Set user' })).toBeTruthy()
  })

  it('links every item in the day panel to its owner, with the key that page reads', () => {
    renderAt(`/home/calendar?month=2031-03&day=${TODAY}`)
    const panel = screen.getByRole('complementary')
    const hrefs = within(panel)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/trade/42')
    expect(hrefs).toContain('/research/events')
    expect(hrefs).toContain(`/research/journal?view=day&day=${TODAY}`)
    // The panel's realized figure, and options U beside it, never added.
    expect(panel.textContent).toContain('Realized P&L')
    expect(panel.textContent).toContain('Options U')
  })

  it('hides P&L and keeps macro events under a carried symbol', () => {
    renderAt('/home/calendar?month=2031-03&symbol=ZZZ')
    expect(screen.getByText(/Scoped to/)).toBeTruthy()
    expect(cell('2031-03-10').textContent).not.toContain('+$120')
    expect(cell('2031-03-10').textContent).toContain('1 fill')
    expect(cell(TODAY).textContent).toContain('CPI')
    expect(cell(TODAY).textContent).not.toContain('1 fill')
  })
})
