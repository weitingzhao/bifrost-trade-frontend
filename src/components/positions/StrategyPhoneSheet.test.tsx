import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { OpenOptionPosition } from '@/types/positions'
import { StrategyPhoneSheet, type StrategySheetRow } from './StrategyPhoneSheet'

const openTrade = vi.fn()
let known: ReadonlySet<number> | null = new Set([124, 125])
vi.mock('@/layout/tradeGo', () => ({ useOpenTrade: () => openTrade }))
vi.mock('@/hooks/useTradeIndex', () => ({ useTradeIndex: () => known }))

/** An invented short put — the sheet only formats what the row hands it. */
const leg = {
  symbol: 'XYZ',
  expiry: '20991218',
  strike: 40,
  right: 'P',
  qty: -2,
  unrealized_pnl: 120,
  account_id: 'U0000001',
  contract_key: 'XYZ|OPT|20991218|40|P',
} as unknown as OpenOptionPosition

function row(over: Partial<StrategySheetRow> = {}): StrategySheetRow {
  return {
    name: 'Income on XYZ',
    nameInk: 'text-foreground',
    sub: '#124 · wheel',
    tradeId: 124,
    tradeList: [124, 999, 125],
    facts: [
      { k: 'Days to expiry', v: '30d' },
      { k: 'Option P&L · open', v: '$120.00' },
    ],
    legs: [leg],
    cover: [{ symbol: 'XYZ', accountId: 'U0000001', direction: 'short', required: 100, held: 0 }],
    ...over,
  }
}

function renderSheet(r: StrategySheetRow | null, onOpenChange = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={['/portfolio/positions']}>
      <Routes>
        <Route path="/portfolio/positions" element={<StrategyPhoneSheet open onOpenChange={onOpenChange} row={r} />} />
        <Route path="/trade/expiration" element={<p>Expiry desk</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const footer = () => document.body.querySelector('[data-slot="dialog-footer"]') as HTMLElement

describe('StrategyPhoneSheet', () => {
  beforeEach(() => {
    openTrade.mockReset()
    known = new Set([124, 125])
  })

  it('has two ways out and no more: the trade, and Roll or close to the Expiry desk', () => {
    renderSheet(row())
    const names = within(footer())
      .getAllByRole('button')
      .map((b) => b.textContent)
    expect(names).toEqual(['Trade #124', 'Roll or close →'])
  })

  it('inks the trade number as a trade token: mono, in the trade colour', () => {
    renderSheet(row())
    const tok = within(footer()).getByText('#124')
    expect(tok.tagName).toBe('SPAN')
    expect(tok).toHaveClass('font-mono', 'text-[var(--sk-trade)]')
  })

  it('does not offer a trade the book does not hold', () => {
    known = new Set([125])
    renderSheet(row())
    const names = within(footer())
      .getAllByRole('button')
      .map((b) => b.textContent)
    expect(names).toEqual(['Roll or close →'])
  })

  it('Roll or close goes to the Expiry desk, where an order would confirm — the sheet sends nothing', () => {
    const onOpenChange = vi.fn()
    renderSheet(row(), onOpenChange)
    fireEvent.click(within(footer()).getByRole('button', { name: 'Roll or close →' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.getByText('Expiry desk')).toBeInTheDocument()
  })

  it('opens the trade with the rows the book holds to step through', () => {
    renderSheet(row())
    fireEvent.click(within(footer()).getByRole('button', { name: 'Trade #124' }))
    expect(openTrade).toHaveBeenCalledWith(124, { list: [124, 125], from: 'Positions · strategies' })
  })

  it('reads the row: its columns, each leg on a line, and what covers the short side', () => {
    renderSheet(row())
    expect(screen.getByText('Days to expiry')).toBeInTheDocument()
    expect(screen.getByText('Options (1)')).toBeInTheDocument()
    expect(screen.getByText('XYZ 40P')).toBeInTheDocument()
    expect(screen.getByText(/Short 2 · UN \$120\.00 · U0000001/)).toBeInTheDocument()
    expect(screen.getByText('Coverage')).toBeInTheDocument()
    expect(screen.getByText(/required 100 · held 0 · Naked · -100/)).toBeInTheDocument()
    expect(screen.getByText(/Positions never sends an order/)).toBeInTheDocument()
  })

  it('stays shut with no row to read', () => {
    renderSheet(null)
    expect(document.body.querySelector('[data-slot="bottom-sheet"]')).toBeNull()
  })
})
