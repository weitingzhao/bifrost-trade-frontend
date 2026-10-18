// @vitest-environment jsdom
/**
 * Live's reorder menu (design Rev .175, DESIGN_CONTRACTS §18.3): the moves a
 * drag makes, from a right-click or a long-press. The menu calls the page's
 * drop handlers, so the tests run each verb through the real reorder
 * functions and check the order that comes out. Made-up tickers throughout.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import {
  applyOptRowReorder,
  applySymbolReorderInCategory,
  reorderCategoryList,
  type MarketStreamsRow,
  type OptPositionRow,
} from '@/utils/marketStreamsRows'
import { pillMoves, rowMoves, type MoveItem } from './liveMoves'
import { FilterPillBar } from './FilterPillBar'
import { MarketStreamsTable } from './MarketStreamsTable'

const ORDER = ['AAA', 'BBB', 'CCC', 'DDD']

const verbs = (items: MoveItem[]) => items.map((i) => i.label)
const item = (items: MoveItem[], label: string) => {
  const hit = items.find((i) => i.label === label)
  if (!hit) throw new Error(`no ${label}`)
  return hit
}
/** A row move, through the drop handler Market Streams' stock rows use. */
const viaSymbols = (order: string[], m: MoveItem) =>
  applySymbolReorderInCategory({ Core: order }, 'Core', m.from, m.to).Core
/** …through the option rows' handler. */
const viaOptRows = (order: string[], m: MoveItem) => applyOptRowReorder(order, order, m.from, m.to)
/** …and a chip move through the category drop. */
const viaCategories = (order: string[], m: MoveItem) => reorderCategoryList(order, m.from, m.to)

describe('row moves (Move up · Move down · Move to top)', () => {
  it('gives the first row no Move up and no Move to top', () => {
    expect(verbs(rowMoves(ORDER, 'AAA'))).toEqual(['Move down'])
  })

  it('gives the last row no Move down', () => {
    expect(verbs(rowMoves(ORDER, 'DDD'))).toEqual(['Move up', 'Move to top'])
  })

  it('gives a middle row all three, and a group of one none', () => {
    expect(verbs(rowMoves(ORDER, 'BBB'))).toEqual(['Move up', 'Move down', 'Move to top'])
    expect(rowMoves(['AAA'], 'AAA')).toEqual([])
    expect(rowMoves(ORDER, 'ZZZ')).toEqual([])
  })

  it.each([
    ['BBB', 'Move up', ['BBB', 'AAA', 'CCC', 'DDD']],
    ['DDD', 'Move up', ['AAA', 'BBB', 'DDD', 'CCC']],
    ['AAA', 'Move down', ['BBB', 'AAA', 'CCC', 'DDD']],
    ['CCC', 'Move down', ['AAA', 'BBB', 'DDD', 'CCC']],
    ['DDD', 'Move to top', ['DDD', 'AAA', 'BBB', 'CCC']],
    ['BBB', 'Move to top', ['BBB', 'AAA', 'CCC', 'DDD']],
  ])('%s · %s lands where it says, through both row drop handlers', (key, label, want) => {
    const m = item(rowMoves(ORDER, key), label)
    expect(viaSymbols(ORDER, m)).toEqual(want)
    expect(viaOptRows(ORDER, m)).toEqual(want)
  })
})

describe('category chip moves (Move left · Move right)', () => {
  it('gives the first chip only Move right and the last only Move left', () => {
    expect(verbs(pillMoves(ORDER, 'AAA'))).toEqual(['Move right'])
    expect(verbs(pillMoves(ORDER, 'DDD'))).toEqual(['Move left'])
    expect(verbs(pillMoves(ORDER, 'CCC'))).toEqual(['Move left', 'Move right'])
    expect(pillMoves(['AAA'], 'AAA')).toEqual([])
  })

  it.each([
    ['CCC', 'Move left', ['AAA', 'CCC', 'BBB', 'DDD']],
    ['AAA', 'Move right', ['BBB', 'AAA', 'CCC', 'DDD']],
    ['CCC', 'Move right', ['AAA', 'BBB', 'DDD', 'CCC']],
  ])('%s · %s lands where it says, through the category drop', (key, label, want) => {
    expect(viaCategories(ORDER, item(pillMoves(ORDER, key), label))).toEqual(want)
  })
})

function chipBar(onCategoryDrop: (dragged: string, dropTarget: string) => void) {
  render(
    <FilterPillBar
      hasStreamAccounts={false}
      accountViewMode="combine"
      onAccountViewModeChange={() => undefined}
      optPremiumUnit="contract"
      onOptPremiumUnitChange={() => undefined}
      streamCategoryOrder={['Core', 'Swing', 'Hedge']}
      positionCategoryFilters={new Set()}
      onToggleCategory={() => undefined}
      onCategoryDrop={onCategoryDrop}
      categoryOrderSaving={false}
    />,
  )
}

describe('the chip menu calls the category drop', () => {
  it('Move right on the first chip puts the second in front of it', async () => {
    const drop = vi.fn()
    chipBar(drop)
    fireEvent.contextMenu(screen.getByRole('button', { name: /Core/ }))
    expect(screen.queryByRole('menuitem', { name: 'Move left' })).toBeNull()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move right' }))
    expect(drop).toHaveBeenCalledWith('Swing', 'Core')
  })

  it('the last chip offers Move left only', async () => {
    const drop = vi.fn()
    chipBar(drop)
    fireEvent.contextMenu(screen.getByRole('button', { name: /Hedge/ }))
    expect(screen.queryByRole('menuitem', { name: 'Move right' })).toBeNull()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move left' }))
    expect(drop).toHaveBeenCalledWith('Hedge', 'Swing')
  })
})

const stk = (symbol: string): MarketStreamsRow =>
  ({ symbol, qty: 10, avgCost: 1, changePct: null, pnlVsBench: null, pnlCost: null, category: 'Core' }) as MarketStreamsRow
const opt = (strike: number): OptPositionRow => ({
  account_id: 'U0000000',
  contract_key: `AAA|OPT|20991218|${strike}|C`,
  symbol: 'AAA',
  expiry: '20991218',
  strike,
  right: 'C',
  qty: 1,
  avg_cost: null,
})

function streams(
  p: { dragEnabled?: boolean; onSymbolReorder?: () => void; onOptRowReorder?: () => void } = {},
) {
  const rows = ['AAA', 'BBB', 'CCC'].map(stk)
  const optRows = [opt(10), opt(12)]
  render(
    <MemoryRouter>
      <MarketStreamsTable
        hasStreamAccounts={false}
        accountViewMode="combine"
        optPremiumUnit="contract"
        msSortMode={1}
        onCycleSort={() => undefined}
        dragEnabled={p.dragEnabled ?? true}
        categoryOrderFiltered={['Core']}
        sortedRowsByCategory={{ Core: rows }}
        sortedOptRows={optRows}
        unifiedGroupedRows={null}
        filteredRows={rows}
        optPositionRows={optRows}
        marketStreamsDailyTotals={{ totalDailyDollar: 0, totalDailyPct: null }}
        quotesByContractKey={{}}
        benchmarks={{}}
        optionLiveBasisByRow={new Map()}
        streamHostId={null}
        streamSecondaryId={null}
        onSymbolReorder={p.onSymbolReorder ?? (() => undefined)}
        onOptRowReorder={p.onOptRowReorder ?? (() => undefined)}
      />
    </MemoryRouter>,
  )
}

/** A row's Cost cell: a place to press that is not the ticker. */
const costCellOf = (symbol: string) => {
  const row = screen.getByRole('link', { name: symbol }).closest('tr')!
  return row.children[2] as HTMLElement
}

describe('the row menu calls the row drop handlers', () => {
  it('Move down on a stock row puts the next symbol in front of it, within its category', async () => {
    const reorder = vi.fn()
    streams({ onSymbolReorder: reorder })
    fireEvent.contextMenu(costCellOf('AAA'))
    expect(screen.queryByRole('menuitem', { name: 'Move up' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'Move to top' })).toBeNull()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move down' }))
    expect(reorder).toHaveBeenCalledWith('Core', 'BBB', 'AAA')
  })

  it('Move to top on the last stock row drops it on the first', async () => {
    const reorder = vi.fn()
    streams({ onSymbolReorder: reorder })
    fireEvent.contextMenu(costCellOf('CCC'))
    expect(screen.queryByRole('menuitem', { name: 'Move down' })).toBeNull()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move to top' }))
    expect(reorder).toHaveBeenCalledWith('Core', 'CCC', 'AAA')
  })

  it('Move up on the second option row drops it on the first, by basis key', async () => {
    const reorder = vi.fn()
    streams({ onOptRowReorder: reorder })
    const row = screen.getByRole('link', { name: /AAA .* CALL 12/ }).closest('tr')!
    fireEvent.contextMenu(row.children[2])
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move up' }))
    expect(reorder).toHaveBeenCalledWith('u0000000\tAAA|OPT|20991218|12|C', 'u0000000\tAAA|OPT|20991218|10|C')
  })

  it('leaves a press on the ticker to the shell menu', () => {
    streams()
    fireEvent.contextMenu(screen.getByRole('link', { name: 'BBB' }))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('has no moves outside the user’s own order', () => {
    streams({ dragEnabled: false })
    fireEvent.contextMenu(costCellOf('BBB'))
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
