import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { AssetMixCard } from './AssetMixCard'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { LivePositionRow } from '@/types/positions'

const stk = (
  symbol: string,
  position: number,
  price: number | null,
  category = 'Stocks',
  account_id = 'U1'
): LivePositionRow =>
  ({ symbol, position, price, category, secType: 'STK', account_id }) as LivePositionRow

const account = (id: string, summary: Record<string, string>): IbAccountSnapshot => ({
  account_id: id,
  summary,
  positions: [],
})

/** The donut centre lives in SVG text; testing-library wants an HTMLElement to scope to. */
const ring = (container: HTMLElement) =>
  within(container.querySelector('svg') as unknown as HTMLElement)

const funded = account('U1', {
  NetLiquidation: '250000',
  TotalCashValue: '20000',
  BuyingPower: '60000',
})

describe('AssetMixCard', () => {
  it('says so when no accounts are in scope', () => {
    render(<AssetMixCard accounts={[]} coreStocks={[]} incomeEtfs={[]} cashLike={[]} />)
    expect(screen.getByText('No accounts in scope.')).toBeInTheDocument()
    expect(screen.queryByText('Asset mix')).not.toBeInTheDocument()
  })

  it('draws every slice, net liq in the centre and BP under it', () => {
    const { container } = render(
      <AssetMixCard
        accounts={[funded]}
        coreStocks={[stk('NVDA', 100, 1000)]}
        incomeEtfs={[stk('PFF', 500, 30, 'Fixed Income')]}
        cashLike={[stk('SGOV', 50, 100, 'Money Market')]}
      />
    )
    expect(ring(container).getByText('$250.0k')).toBeInTheDocument()
    expect(ring(container).getByText('BP $60.0k')).toBeInTheDocument()

    for (const label of ['Stock', 'Fixed income', 'Cash-like', 'Net cash', 'Buying power']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    // 100k + 15k + 5k + 20k + 60k = 200k ring basis; stock is half of it.
    expect(screen.getByText('50.0%')).toBeInTheDocument()
    expect(screen.getByText('$200.0k')).toBeInTheDocument()
    expect(
      screen.getByText('Fixed income counts via buying power, not as cash.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('switches the legend between % and $', () => {
    render(
      <AssetMixCard
        accounts={[funded]}
        coreStocks={[stk('NVDA', 100, 1000)]}
        incomeEtfs={[]}
        cashLike={[]}
      />
    )
    expect(screen.queryByText('$100.0k')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '$' }))
    expect(screen.getByText('$100.0k')).toBeInTheDocument()
    // The basis line follows the mode: full dollars once the legend is in $.
    expect(screen.getByText('$180,000.00')).toBeInTheDocument()
  })

  it('shows missing broker numbers as unknown, never as zero', () => {
    const { container } = render(
      <AssetMixCard
        accounts={[account('U1', {})]}
        coreStocks={[stk('NVDA', 10, 100)]}
        incomeEtfs={[]}
        cashLike={[]}
      />
    )
    expect(ring(container).getByText('—')).toBeInTheDocument()
    expect(ring(container).getByText('BP n/a')).toBeInTheDocument()

    const status = screen.getByRole('status')
    expect(within(status).getByText('Net liq n/a')).toBeInTheDocument()
    expect(within(status).getByText('Net cash n/a')).toBeInTheDocument()
    expect(within(status).getByText('Buying power n/a')).toBeInTheDocument()
    // The missing slices are not in the legend either — no "$0" masquerading as a fact.
    expect(screen.queryByText('Net cash')).not.toBeInTheDocument()
    expect(screen.queryByText('Buying power')).not.toBeInTheDocument()
  })

  it('refuses a partial net liq when one account in scope did not report it', () => {
    const { container } = render(
      <AssetMixCard
        accounts={[funded, account('U2', { TotalCashValue: '5000', BuyingPower: '1000' })]}
        coreStocks={[]}
        incomeEtfs={[]}
        cashLike={[]}
      />
    )
    expect(ring(container).getByText('—')).toBeInTheDocument()
    expect(ring(container).queryByText('$250.0k')).not.toBeInTheDocument()
    expect(screen.getByText('Net liq n/a — 1 of 2 accounts unreported')).toBeInTheDocument()
  })

  it('names unpriced holdings instead of drawing them as complete', () => {
    render(
      <AssetMixCard
        accounts={[funded]}
        coreStocks={[stk('NVDA', 100, 1000), stk('AAPL', 10, null)]}
        incomeEtfs={[stk('BINC', 10, null, 'Fixed Income')]}
        cashLike={[]}
      />
    )
    expect(within(screen.getByRole('status')).getByText('2 unpriced')).toBeInTheDocument()
  })
})
