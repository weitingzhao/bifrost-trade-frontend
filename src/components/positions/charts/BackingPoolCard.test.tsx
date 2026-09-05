import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BackingPoolCard } from './BackingPoolCard'
import type { BaseLayer, BookVsBase } from '@/utils/bookVsBase'

function layer(overrides: Partial<BaseLayer> & Pick<BaseLayer, 'role' | 'label'>): BaseLayer {
  return {
    marketValue: 0,
    shares: 0,
    symbols: [],
    note: '',
    used: null,
    ...overrides,
  }
}

/** Only `base` matters to the card; the gauges are filled with inert values. */
function makeBook(base: BaseLayer[]): BookVsBase {
  return {
    pressure: { level: 0, pct: null, cushion: null },
    backing: {
      level: 0,
      callsCovered: 0,
      callsTotal: 0,
      nakedCalls: 0,
      putCashNeeded: 0,
      cashLike: 0,
      putsCashCovered: null,
    },
    risk: {
      level: 0,
      counts: { itm: 0, near7d: 0, zeroDte: 0, past: 0, unpriced: 0, tightest: null },
    },
    potential: { sharesFree: 0, moreCalls: 0, unusedBuyingPower: null, thetaPerDay: null },
    demand: { putCash: 0, callShares: 0 },
    supply: { cashLike: 0, buyingPower: null, sharesHeld: 0, sharesFree: 0 },
    base,
  }
}

const STOCKS = layer({
  role: 'stocks',
  label: 'Stocks',
  marketValue: 10_000,
  shares: 100,
  symbols: ['NVDA'],
  note: '60 backing calls · 40 free',
  used: 0.6,
  backingValue: 6_000,
  freeValue: 4_000,
})
const INCOME = layer({
  role: 'income',
  label: 'Income ETFs',
  marketValue: 5_000,
  symbols: ['PFF', 'BALI'],
  note: 'Yield, not option collateral — counted in buying power only',
})
const CASH = layer({
  role: 'cash',
  label: 'Cash and SGOV',
  marketValue: 5_000,
  symbols: ['SGOV'],
  note: 'Covers every put obligation in cash',
  used: 0.4,
  backingValue: 2_000,
  freeValue: 3_000,
})

/** Ring slices in ring order; the first circle is the empty track. */
function slices(container: HTMLElement): SVGCircleElement[] {
  return Array.from(container.querySelectorAll<SVGCircleElement>('circle')).slice(1)
}

describe('BackingPoolCard', () => {
  it('shows the empty state when nothing in the base is priced', () => {
    render(
      <BackingPoolCard
        book={makeBook([
          layer({ role: 'stocks', label: 'Stocks' }),
          layer({ role: 'income', label: 'Income ETFs' }),
          layer({ role: 'cash', label: 'Cash and SGOV' }),
        ])}
      />
    )
    expect(screen.getByText('No base holdings to show.')).toBeInTheDocument()
    expect(document.querySelector('svg')).toBeNull()
  })

  it('renders the ring centre and one legend row per layer', () => {
    render(<BackingPoolCard book={makeBook([STOCKS, INCOME, CASH])} />)

    // (6,000 + 2,000) / 20,000
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.getByText('of $20.0k in use')).toBeInTheDocument()

    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByText('$10,000')).toBeInTheDocument()
    expect(screen.getByText('100 sh')).toBeInTheDocument()
    expect(screen.getByText('60% in use')).toBeInTheDocument()
    expect(screen.getByText('SGOV')).toBeInTheDocument()
    expect(screen.getByText('PFF')).toBeInTheDocument()
    expect(screen.getByText('BALI')).toBeInTheDocument()
    // The role note is a hover on the layer label; Base holdings prints it in full.
    expect(screen.getByText(STOCKS.label)).toHaveAttribute('title', STOCKS.note)
    expect(screen.getByText(INCOME.label)).toHaveAttribute('title', INCOME.note)

    // Income ETFs carry exactly the Owner's wording; the in-use column stays a dash.
    expect(screen.getByText('via buying power, not as cash')).toBeInTheDocument()
    expect(screen.getByTitle('Income ETFs · via buying power, not as cash')).toBeInTheDocument()
    const incomeRow = screen.getByText('Income ETFs').closest('tr')!
    expect(incomeRow.lastElementChild).toHaveTextContent('—')

    // Five slices, ring order matches the legend order.
    expect(slices(document.body)).toHaveLength(5)
  })

  it('shows unknown stock value as a dash and a warning, never as zero', () => {
    const unpricedStocks = {
      ...layer({
        role: 'stocks',
        label: 'Stocks',
        shares: 250,
        symbols: ['RKLB'],
        note: 'No shares held — every short call is naked',
      }),
      unpricedShares: 250,
    }
    render(<BackingPoolCard book={makeBook([unpricedStocks, INCOME, CASH])} />)

    const stocksRow = screen.getByText('Stocks').closest('tr')!
    expect(stocksRow.children[1]).toHaveTextContent('—')
    expect(stocksRow.children[3]).toHaveTextContent('—')
    expect(screen.getByText('250 sh unpriced — not counted')).toHaveClass('text-warning')
    expect(screen.queryByText('$0')).toBeNull()

    // 2,000 / 10,000, starred: the stock layer is missing from the denominator.
    expect(screen.getByText('20%*')).toBeInTheDocument()
    expect(screen.getByText('of $10.0k in use')).toBeInTheDocument()

    // No stock slice was drawn.
    expect(slices(document.body)).toHaveLength(3)
  })

  it('flags a layer that is held but has no price', () => {
    const unpricedIncome = layer({ role: 'income', label: 'Income ETFs', symbols: ['PFF'] })
    render(<BackingPoolCard book={makeBook([STOCKS, unpricedIncome, CASH])} />)
    const row = screen.getByText('Income ETFs').closest('tr')!
    expect(row.children[1]).toHaveTextContent('—')
    expect(screen.getByText('unpriced — not counted')).toHaveClass('text-warning')
    expect(screen.getByText('PFF')).toBeInTheDocument()
  })

  it('maps a slice click to its target', () => {
    const onSegmentClick = vi.fn()
    render(
      <BackingPoolCard book={makeBook([STOCKS, INCOME, CASH])} onSegmentClick={onSegmentClick} />
    )
    const [calls, stocksFree, puts, cashFree, income] = slices(document.body)

    fireEvent.click(calls)
    fireEvent.click(stocksFree)
    fireEvent.click(puts)
    fireEvent.click(cashFree)
    fireEvent.click(income)

    expect(onSegmentClick.mock.calls.map((c) => c[0])).toEqual([
      'calls',
      'free',
      'puts',
      'free',
      'income',
    ])
  })

  it('keeps the ring inert when no click handler is given', () => {
    render(<BackingPoolCard book={makeBook([STOCKS, INCOME, CASH])} />)
    expect(document.querySelectorAll('circle.cursor-pointer')).toHaveLength(0)
    expect(() => fireEvent.click(slices(document.body)[0])).not.toThrow()
  })
})
