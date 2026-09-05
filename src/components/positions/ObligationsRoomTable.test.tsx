import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ObligationsRoomTable, type ObligationsRoomTableProps } from './ObligationsRoomTable'
import type { ObligationsRow } from '@/utils/obligationsRoom'

const row = (o: Partial<ObligationsRow> & { symbol: string }): ObligationsRow => ({
  accountId: 'U1',
  shortPuts: 0,
  cashIfAssigned: 0,
  coveredCalls: 0,
  nakedCalls: 0,
  sharesHeld: 0,
  sharesBacking: 0,
  sharesSpare: 0,
  moreCalls: 0,
  avgCost: null,
  price: null,
  marketValue: null,
  dailyPnl: null,
  totalPnl: null,
  ...o,
})

function renderTable(over: Partial<ObligationsRoomTableProps> = {}) {
  const props: ObligationsRoomTableProps = {
    rows: [],
    cashLikeTotal: 100_000,
    buyingPower: 400_000,
    sort: 'cash',
    onSortChange: vi.fn(),
    onSymbolClick: vi.fn(),
    ...over,
  }
  return { ...render(<ObligationsRoomTable {...props} />), props }
}

/** The <tr> a symbol's link sits in; the grand total repeats the same words. */
function rowOf(symbol: string): HTMLElement {
  const tr = screen.getByText(symbol).closest('tr')
  if (!tr) throw new Error(`no row for ${symbol}`)
  return tr
}

/** The grand total row, found by its "Total (N names)" label. */
function totalRow(): HTMLElement {
  const tr = screen.getByText(/^Total \(\d+ names?\)$/).closest('tr')
  if (!tr) throw new Error('no grand total row')
  return tr
}

/** Every title attribute in the tree, so a "$0.00" hidden in a tooltip is caught too. */
function allTitles(root: HTMLElement): string {
  return Array.from(root.querySelectorAll('[title]'))
    .map((el) => el.getAttribute('title') ?? '')
    .join('\n')
}

/** Symbols in the order they appear down the table body. */
function symbolOrder(): string[] {
  return screen.getAllByRole('button', { name: /^Open / }).map((el) => el.textContent ?? '')
}

describe('ObligationsRoomTable', () => {
  it('says so when there is nothing in scope', () => {
    renderTable()
    expect(screen.getByText('No option obligations in scope.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an unpriced row as unknown, never as zero', () => {
    const { container } = renderTable({
      rows: [
        row({
          symbol: 'CBRS',
          shortPuts: 2,
          cashIfAssigned: 20_000,
          sharesHeld: 100,
          sharesSpare: 100,
          moreCalls: 1,
          avgCost: 12.5,
          price: null,
          marketValue: null,
        }),
      ],
    })
    // Price and market value in the row read "—" with the reason attached; the
    // sum below says it has no priced rows, in its own words.
    expect(within(rowOf('CBRS')).getAllByTitle('Unpriced — no quote for this symbol')).toHaveLength(2)
    expect(within(totalRow()).getByTitle('No priced rows in scope')).toBeInTheDocument()
    expect(within(totalRow()).getByText('1 unpriced')).toBeInTheDocument()
    // Nothing renders as $0.00 — not in text, not in a tooltip.
    expect(container.textContent).not.toContain('$0.00')
    expect(allTitles(container)).not.toContain('$0.00')
    expect(within(rowOf('CBRS')).getByText('$12.50')).toBeInTheDocument()
  })

  it('flags a priced row whose market value is missing', () => {
    renderTable({
      rows: [row({ symbol: 'AAPL', price: 200, marketValue: null, dailyPnl: 10, totalPnl: 20 })],
    })
    const r = within(rowOf('AAPL'))
    expect(r.getByText('$200.00')).toBeInTheDocument()
    expect(r.getByTitle('Unpriced — no quote for this symbol')).toBeInTheDocument()
    expect(within(totalRow()).getByText('1 unpriced')).toBeInTheDocument()
  })

  it('draws every call naked when the account holds no shares', () => {
    const onNakedClick = vi.fn()
    renderTable({
      onNakedClick,
      rows: [row({ symbol: 'MU', coveredCalls: 3, nakedCalls: 0, sharesHeld: 0 })],
    })
    const bar = screen.getByRole('group', { name: 'Calls: 0 covered, 3 naked, 0 room' })
    const naked = within(bar).getByRole('button', { name: '3 naked calls on MU' })
    fireEvent.click(naked)
    expect(onNakedClick).toHaveBeenCalledWith('MU')
    expect(within(rowOf('MU')).getByText('· 3 naked')).toBeInTheDocument()
    expect(within(totalRow()).getByText('· 3 naked')).toBeInTheDocument()
  })

  it('prints covered · naked · room and tones the cash bar when a row exceeds cash-like', () => {
    renderTable({
      rows: [
        row({
          symbol: 'AAPL',
          shortPuts: 5,
          cashIfAssigned: 150_000,
          coveredCalls: 9,
          nakedCalls: 1,
          sharesHeld: 1_100,
          sharesBacking: 900,
          sharesSpare: 200,
          moreCalls: 2,
          price: 200,
          marketValue: 220_000,
        }),
      ],
    })
    const r = within(rowOf('AAPL'))
    expect(r.getByRole('group', { name: 'Calls: 9 covered, 1 naked, 2 room' })).toBeInTheDocument()
    expect(r.getByText('· 1 naked')).toBeInTheDocument()
    expect(r.getByText('· +2 room')).toBeInTheDocument()
    const cashBar = r.getByRole('img', { name: '150% of cash-like, exceeds cash-like on its own' })
    expect(cashBar.firstElementChild).toHaveClass('bg-warning')
    expect(cashBar.firstElementChild).toHaveStyle({ width: '100%' })
    expect(r.getByText('$150,000.00')).toHaveClass('text-warning')
    expect(r.getByText('$220,000.00')).toBeInTheDocument()
  })

  it('keeps the numbers and the warning when there is no cash-like layer, but drops the bars', () => {
    renderTable({
      cashLikeTotal: 0,
      rows: [row({ symbol: 'AAPL', shortPuts: 1, cashIfAssigned: 20_000 })],
    })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    const cash = within(rowOf('AAPL')).getByText('$20,000.00')
    expect(cash).toHaveClass('text-warning')
    expect(cash.closest('td')).toHaveAttribute('title', 'No cash-like layer — this demand sits entirely on margin.')
  })

  it('renders PnL on one line, without an empty second line', () => {
    renderTable({
      rows: [row({ symbol: 'AAPL', price: 1, marketValue: 100, dailyPnl: 5, totalPnl: -3 })],
    })
    const r = rowOf('AAPL')
    expect(within(r).getByText('$5.00')).toHaveClass('text-profit')
    expect(within(r).getByText('-$3.00')).toHaveClass('text-loss')
    const emptyMeta = Array.from(r.querySelectorAll('.text-dense-meta')).filter((el) => el.textContent === '')
    expect(emptyMeta).toHaveLength(0)
  })

  it('captions a PnL sum that lost a priced row with no PnL figure', () => {
    renderTable({
      rows: [
        row({ symbol: 'AAPL', price: 1, marketValue: 100, dailyPnl: 100, totalPnl: 50 }),
        row({ symbol: 'MU', price: 1, marketValue: 100, dailyPnl: null, totalPnl: null }),
      ],
    })
    const t = within(totalRow())
    expect(t.getByText('$100.00')).toBeInTheDocument()
    expect(t.getByText('$50.00')).toBeInTheDocument()
    expect(t.getAllByText('1 without PnL')).toHaveLength(2)
    expect(t.queryByText(/unpriced/)).not.toBeInTheDocument()
  })

  it('totals cash against buying power and prints the income-ETF rule where it can be read', () => {
    const rows = [
      row({ symbol: 'AAPL', accountId: 'U1', cashIfAssigned: 30_000, coveredCalls: 2, sharesHeld: 200 }),
      row({ symbol: 'MU', accountId: 'U2', cashIfAssigned: 10_000, nakedCalls: 1, moreCalls: 0 }),
    ]
    renderTable({ rows, buyingPower: 400_000 })
    const t = within(totalRow())
    expect(t.getByText('$40,000.00')).toBeInTheDocument()
    expect(t.getByText('10% of BP')).toHaveClass('text-muted-foreground')
    expect(t.getByText('2 covered')).toBeInTheDocument()
    expect(t.getByText('· 1 naked')).toBeInTheDocument()
    expect(t.getByText('· +0 room')).toBeInTheDocument()
    expect(t.getByTitle('Income ETFs count via buying power, not as cash.')).toBeInTheDocument()
    expect(
      screen.getByText('Cash-like $100,000.00 · buying power $400,000.00. Income ETFs count via buying power, not as cash.'),
    ).toBeInTheDocument()
    // Each account is its own group, raw id, in the order the page sent them.
    const groups = screen.getAllByText(/^U[12]$/).map((el) => el.textContent)
    expect(groups).toEqual(['U1', 'U2'])
  })

  it('tells unknown buying power apart from zero buying power', () => {
    const rows = [row({ symbol: 'AAPL', cashIfAssigned: 5_000 })]
    const first = renderTable({ rows, buyingPower: null })
    const dash = within(totalRow()).getByTitle('Buying power not reported by any funded account.')
    expect(dash).toHaveClass('text-warning')
    expect(dash).toHaveTextContent('—')
    expect(screen.getByText(/buying power —\./)).toBeInTheDocument()
    first.unmount()

    renderTable({ rows, buyingPower: 0 })
    const none = within(totalRow()).getByText('no BP')
    expect(none).toHaveClass('text-loss')
    expect(screen.queryByText(/of BP/)).not.toBeInTheDocument()
  })

  it('tones the total against buying power and never rounds a real demand to 0%', () => {
    const first = renderTable({ rows: [row({ symbol: 'AAPL', cashIfAssigned: 600_000 })], buyingPower: 400_000 })
    expect(within(totalRow()).getByText('150% of BP')).toHaveClass('text-loss')
    expect(within(totalRow()).getByText('$600,000.00')).toHaveClass('text-loss')
    first.unmount()

    const second = renderTable({ rows: [row({ symbol: 'AAPL', cashIfAssigned: 240_000 })], buyingPower: 400_000 })
    expect(within(totalRow()).getByText('60% of BP')).toHaveClass('text-warning')
    second.unmount()

    renderTable({ rows: [row({ symbol: 'AAPL', cashIfAssigned: 1_000 })], buyingPower: 400_000 })
    expect(within(totalRow()).getByText('<1% of BP')).toBeInTheDocument()
    expect(screen.queryByText('0% of BP')).not.toBeInTheDocument()
  })

  it('routes header clicks and symbol clicks to the page', () => {
    const { props } = renderTable({
      rows: [row({ symbol: 'AAPL', accountId: 'U9', cashIfAssigned: 1 })],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Calls' }))
    expect(props.onSortChange).toHaveBeenCalledWith('calls')
    fireEvent.click(screen.getByRole('button', { name: 'Room' }))
    expect(props.onSortChange).toHaveBeenCalledWith('spare')
    fireEvent.click(screen.getByRole('button', { name: 'Symbol' }))
    expect(props.onSortChange).toHaveBeenCalledWith('symbol')
    fireEvent.click(screen.getByRole('button', { name: 'Open AAPL in account U9' }))
    expect(props.onSymbolClick).toHaveBeenCalledWith('AAPL', 'U9')
    const cashHead = screen.getByRole('button', { name: 'Cash if assigned ▼' })
    expect(cashHead.closest('th')).toHaveAttribute('aria-sort', 'descending')
    expect(document.querySelectorAll('[aria-sort]')).toHaveLength(1)
  })

  it('gives every sort key a visible head, including room, and reaches them from the keyboard', () => {
    const { props } = renderTable({ rows: [row({ symbol: 'AAPL' })], sort: 'spare' })
    const room = screen.getByRole('button', { name: 'Room ▼' })
    expect(room).toHaveAttribute('type', 'button')
    expect(room).not.toHaveAttribute('tabindex', '-1')
    expect(room.closest('th')).toHaveAttribute('aria-sort', 'descending')
    expect(document.querySelectorAll('[aria-sort]')).toHaveLength(1)
    // Native buttons: Enter / Space are the browser's, so activation is a click.
    room.focus()
    expect(document.activeElement).toBe(room)
    fireEvent.click(room)
    expect(props.onSortChange).toHaveBeenCalledWith('spare')
  })

  it('sorts within each account group and never reshuffles the groups', () => {
    const rows = [
      row({ symbol: 'ZZ', accountId: 'U2', cashIfAssigned: 9 }),
      row({ symbol: 'AA', accountId: 'U2', cashIfAssigned: 1 }),
      row({ symbol: 'MM', accountId: 'U1', cashIfAssigned: 5 }),
      row({ symbol: 'BB', accountId: 'U1', cashIfAssigned: 7 }),
    ]
    const first = renderTable({ rows, sort: 'cash' })
    expect(symbolOrder()).toEqual(['ZZ', 'AA', 'BB', 'MM'])
    first.unmount()

    renderTable({ rows, sort: 'symbol' })
    expect(symbolOrder()).toEqual(['AA', 'ZZ', 'BB', 'MM'])
    const groups = screen.getAllByText(/^U[12]$/).map((el) => el.textContent)
    expect(groups).toEqual(['U2', 'U1'])
  })
})
