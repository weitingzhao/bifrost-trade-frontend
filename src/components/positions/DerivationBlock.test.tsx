import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { DerivationBlock } from './DerivationBlock'
import { holdingsOf, marginDerivation } from '@/utils/marginDerivation'
import { rollupMargin } from '@/utils/marginPressure'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { LivePositionRow } from '@/types/positions'

const HOST = {
  account_id: 'U17123565',
  summary: {
    NetLiquidation: '644944.21',
    EquityWithLoanValue: '682554.57',
    MaintMarginReq: '214021.13',
    InitMarginReq: '214021.13',
    ExcessLiquidity: '468859.46',
    AvailableFunds: '468533.44',
    Cushion: '0.726977',
    BuyingPower: '1874133.76',
  },
} as unknown as IbAccountSnapshot

function renderBlock() {
  const onClose = vi.fn()
  const d = marginDerivation(rollupMargin([HOST]).accounts[0], 'Host')
  const utils = render(<DerivationBlock derivation={d} onClose={onClose} />)
  return { ...utils, onClose }
}

const rowNames = () => screen.getAllByTestId('derivation-row').map((r) => r.getAttribute('data-var'))
const linkIn = (scope: HTMLElement, name: string) =>
  within(scope)
    .getAllByTestId('var-link')
    .find((b) => b.getAttribute('data-var') === name) as HTMLElement

describe('DerivationBlock', () => {
  it('shows the computed chain as rows and the broker fields once beneath', () => {
    renderBlock()
    expect(rowNames()).toEqual(['Pressure', 'Cushion', 'ExcessLiquidity', 'BuyingPower', 'AvailableFunds'])
    const fields = screen.getByTestId('derivation-fields')
    expect(fields).toHaveTextContent('IB fields')
    expect(within(fields).getAllByTestId('var-link').map((b) => b.getAttribute('data-var'))).toEqual([
      'EquityWithLoanValue',
      'MaintMarginReq',
      'NetLiquidation',
      'InitMarginReq',
    ])
    const verdicts = screen.getAllByTestId('verdict').map((v) => v.textContent)
    expect(verdicts).toEqual(['✓ agrees', '≈ Δ $326.02 (0.07%)', '✓ agrees', '✓ agrees'])
    expect(screen.queryByTestId('variable-card')).toBeNull()
  })

  it('opens a variable on click, walks to its inputs from inside the card, and closes on Esc', () => {
    const { onClose } = renderBlock()
    const rows = screen.getByTestId('derivation-rows')
    fireEvent.click(linkIn(rows, 'ExcessLiquidity'))
    let card = screen.getByTestId('variable-card')
    expect(card).toHaveAccessibleName('ExcessLiquidity explained')
    expect(card).toHaveTextContent('$468,859.46')
    expect(card).toHaveTextContent('EquityWithLoanValue $682,554.57')
    expect(card).toHaveTextContent('MaintMarginReq $214,021.13')
    expect(card).toHaveTextContent('→ $468,533.44')
    expect(card).toHaveTextContent('≈ Δ $326.02 (0.07%)')
    expect(card).toHaveTextContent('feeds Cushion')

    // An input named inside the card is itself a link to its own card.
    fireEvent.click(linkIn(card, 'EquityWithLoanValue'))
    card = screen.getByTestId('variable-card')
    expect(card).toHaveAccessibleName('EquityWithLoanValue explained')
    expect(card).toHaveTextContent('sits above NetLiquidation')
    expect(card).toHaveTextContent('feeds ExcessLiquidity · AvailableFunds')

    // Esc closes the card first, then the block.
    fireEvent.keyDown(card, { key: 'Escape' })
    expect(screen.queryByTestId('variable-card')).toBeNull()
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByTestId('explanation'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking the open variable again closes its card', () => {
    renderBlock()
    const rows = screen.getByTestId('derivation-rows')
    fireEvent.click(linkIn(rows, 'Cushion'))
    expect(screen.getByTestId('variable-card')).toHaveAccessibleName('Cushion explained')
    expect(linkIn(rows, 'Cushion')).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(linkIn(rows, 'Cushion'))
    expect(screen.queryByTestId('variable-card')).toBeNull()
  })

  it('lists the holdings behind a summed variable inside its card', () => {
    const rows = [
      { account_id: 'U17123565', symbol: 'NVDA', secType: 'STK', position: 500.67, price: 228.45, category: 'Option leg' },
      { account_id: 'U17123565', symbol: 'SGOV', secType: 'STK', position: 570.88, price: 100.43, category: 'Cash' },
      { account_id: 'U17123565', symbol: 'NVDA', secType: 'OPT', position: -5, right: 'C', strike: 245, lastTradeDateOrContractMonth: '20261120' },
    ] as LivePositionRow[]
    const d = marginDerivation(rollupMargin([HOST]).accounts[0], 'Host', holdingsOf(rows, 'U17123565', () => null))
    render(<DerivationBlock derivation={d} onClose={() => {}} />)
    const rowsEl = screen.getByTestId('derivation-rows')
    expect(screen.getAllByTestId('derivation-row').map((r) => r.getAttribute('data-var'))).toContain('StockValue')
    fireEvent.click(linkIn(rowsEl, 'StockValue'))
    const items = screen.getByTestId('variable-items')
    expect(items).toHaveTextContent('NVDA')
    expect(items).toHaveTextContent('500.67 sh × $228.45 · mark')
    expect(items).toHaveTextContent('SGOV')
    // StockValue is a sum over rows, not over variables, so its card feeds nowhere the option side is;
    // walk to OptionValue from the tree instead.
    fireEvent.click(linkIn(rowsEl, 'OptionValue'))
    expect(screen.getByTestId('variable-card')).toHaveAccessibleName('OptionValue explained')
    expect(screen.getByTestId('variable-items')).toHaveTextContent('NVDA 245C 11/20/26')
    expect(screen.getByTestId('variable-items')).toHaveTextContent('-5 contracts · mark not in snapshot')
  })

  it('weights the value, quiets the operators, and dims a line that adds nothing', () => {
    const d = marginDerivation(rollupMargin([HOST]).accounts[0], 'Host')
    d.variables.Pressure.items = [
      { label: 'U1', sub: 'excess ÷ NLV', value: '27%' },
      { label: 'U2', sub: 'nothing to add', value: '+0', dim: true },
    ]
    render(<DerivationBlock derivation={d} onClose={() => {}} />)
    const rows = screen.getByTestId('derivation-rows')
    // The figure being explained carries the weight, not the badge beside it.
    const value = within(screen.getAllByTestId('derivation-row')[0]).getByText('27%')
    expect(value.className).toContain('font-semibold')
    fireEvent.click(linkIn(rows, 'Pressure'))
    const items = screen.getByTestId('variable-items')
    expect(within(items).getByText('U2')).toHaveAttribute('data-dim', 'true')
    expect(within(items).getByText('U1')).not.toHaveAttribute('data-dim')
  })
})
