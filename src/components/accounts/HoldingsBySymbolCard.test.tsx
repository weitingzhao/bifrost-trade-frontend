import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { HoldingsBySymbolCard } from './HoldingsBySymbolCard'
import type { LivePositionRow } from '@/types/positions'
import type { QuoteItem } from '@/types/market'

function row(over: Partial<LivePositionRow>): LivePositionRow {
  return { account_id: 'U1', secType: 'STK', position: 100, ...over }
}

function renderCard(
  stocks: LivePositionRow[],
  opts: {
    quotesBySymbol?: Record<string, QuoteItem>
    quotesByCk?: Record<string, QuoteItem>
    activeSymbol?: string
    onSymbolClick?: (symbol: string) => void
  } = {},
) {
  const onSymbolClick = opts.onSymbolClick ?? vi.fn()
  const utils = render(
    <HoldingsBySymbolCard
      stocks={stocks}
      quotesBySymbol={opts.quotesBySymbol ?? {}}
      quotesByCk={opts.quotesByCk ?? {}}
      activeSymbol={opts.activeSymbol ?? ''}
      onSymbolClick={onSymbolClick}
    />,
  )
  return { ...utils, onSymbolClick }
}

describe('HoldingsBySymbolCard', () => {
  it('says so when nothing is in scope', () => {
    renderCard([])
    expect(screen.getByText('No holdings in scope.')).toBeInTheDocument()
  })

  it('treats options and flat rows as not in scope', () => {
    renderCard([
      row({ symbol: 'AAPL', secType: 'OPT', price: 2 }),
      row({ symbol: 'MSFT', position: 0, price: 400 }),
    ])
    expect(screen.getByText('No holdings in scope.')).toBeInTheDocument()
  })

  it('leaves an unpriced symbol out of the ring and names it on a warning line', () => {
    const { container } = renderCard([
      row({ symbol: 'NVDA', price: 100 }),
      row({ symbol: 'GHOST', price: null, avgCost: null }),
    ])
    expect(screen.getByText('NVDA')).toBeInTheDocument()
    expect(screen.queryByText('GHOST')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('unpriced: GHOST')
    // Track ring plus one NVDA slice — nothing drawn for the unpriced row.
    expect(container.querySelectorAll('circle')).toHaveLength(2)
    expect(container.querySelector('svg')).toHaveTextContent('$10.0kTOTAL')
  })

  it('shows an empty ring and the warning when every row is unpriced', () => {
    renderCard([row({ symbol: 'GHOST', price: null, avgCost: null })])
    expect(screen.queryByText('No holdings in scope.')).not.toBeInTheDocument()
    expect(screen.queryByText('TOTAL')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('unpriced: GHOST')
  })

  it('walks the price chain: quote by contract key, then by symbol, then avg cost', () => {
    const { container } = renderCard(
      [
        row({ symbol: 'A', price: null, contract_key: 'A-CK', avgCost: 1 }),
        row({ symbol: 'B', price: null, avgCost: 1 }),
        row({ symbol: 'C', price: null, avgCost: 3 }),
      ],
      {
        quotesByCk: { 'A-CK': { last: 5, bid: null, ask: null } },
        quotesBySymbol: { B: { last: 4, bid: null, ask: null } },
      },
    )
    // 100 × (5 + 4 + 3) — ck quote beat avgCost for A, symbol quote for B.
    expect(container.querySelector('svg')).toHaveTextContent('$1.2kTOTAL')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('lists the top five in the legend and folds the rest into tags', () => {
    const { onSymbolClick } = renderCard(
      ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'].map((symbol, i) =>
        row({ symbol, price: 100 - i }),
      ),
    )
    expect(screen.getByText('+2 more')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'S6' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'S7' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'S1' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'S7' }))
    expect(onSymbolClick).toHaveBeenCalledWith('S7')
  })

  it('reports a legend click and a ring click by symbol', () => {
    const { container, onSymbolClick } = renderCard([
      row({ symbol: 'NVDA', price: 100 }),
      row({ symbol: 'AMD', price: 50 }),
    ])
    fireEvent.click(screen.getByText('AMD'))
    expect(onSymbolClick).toHaveBeenCalledWith('AMD')

    // First circle is the track; slices follow in value order.
    const slices = container.querySelectorAll('circle')
    fireEvent.click(slices[1])
    expect(onSymbolClick).toHaveBeenLastCalledWith('NVDA')
  })

  it('marks the active symbol on the overflow tags', () => {
    renderCard(
      ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((symbol, i) => row({ symbol, price: 100 - i })),
      { activeSymbol: 'S6' },
    )
    expect(screen.getByRole('button', { name: 'S6' })).toHaveAttribute('aria-pressed', 'true')
  })
})
