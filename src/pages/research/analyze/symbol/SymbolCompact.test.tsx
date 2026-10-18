import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { SymbolFaces } from './useSymbolFaces'
import { SymbolCompact } from './SymbolCompact'

// The blocks are stubs that name themselves: this test reads the face's order
// and which blocks the compact page gets, not what each block reads.
vi.mock('./SymbolIdentity', () => ({
  SymbolIdentity: ({ page }: { page?: boolean }) => <div data-testid="block">{page ? 'identity:page' : 'identity'}</div>,
}))
vi.mock('./SymbolHeldBar', () => ({ SymbolHeldBar: () => <div data-testid="block">held</div> }))
vi.mock('./SymbolAdjustedOnlyNote', () => ({ SymbolAdjustedOnlyNote: () => <div data-testid="block">adjusted</div> }))
vi.mock('@/components/symbolChart/SymbolPriceChart', () => ({ SymbolPriceChart: () => <div data-testid="block">chart</div> }))
vi.mock('./SymbolTradesList', () => ({ SymbolTradesList: () => <div data-testid="block">trades</div> }))
vi.mock('./SymbolSinceSnapshot', () => ({
  SymbolSinceSnapshot: ({ variant }: { variant?: string }) => <div data-testid="block">{`since:${variant ?? 'rail'}`}</div>,
}))
vi.mock('./SymbolVerdictPanel', () => ({ SymbolVerdictPanel: () => <div data-testid="block">verdict</div> }))
vi.mock('./SymbolNarrativePanel', () => ({ SymbolNarrativePanel: () => <div data-testid="block">narrative</div> }))
vi.mock('./SymbolChainFace', () => ({ SymbolChainFace: () => <div data-testid="block">chain</div> }))
vi.mock('@/pages/research/analyze/payoff/PayoffBody', () => ({ PayoffBody: () => <div data-testid="block">payoff</div> }))
vi.mock('./compactVolEarnings', () => ({ useVolFoldEarnings: () => undefined }))

const faces: SymbolFaces = {
  views: [],
  record: { rows: [], best: null } as unknown as SymbolFaces['record'],
  drove: null,
  decisive: { n: 0, of: 0 },
  held: false,
  watched: false,
  earnings: null,
  loading: false,
  failed: [],
}

function face(props: { page?: boolean; active?: Parameters<typeof SymbolCompact>[0]['active'] }) {
  render(
    <MemoryRouter>
      <SymbolCompact
        symbol="ZZA"
        faces={faces}
        thesis="No lens is decisive on this name today"
        active={props.active ?? 'overview'}
        setTab={() => {}}
        lampFor={() => null}
        page={props.page}
      />
    </MemoryRouter>,
  )
  return {
    blocks: screen.getAllByTestId('block').map((b) => b.textContent),
    tabs: within(screen.getByRole('button', { name: 'Overview' }).parentElement as HTMLElement)
      .getAllByRole('button')
      .map((b) => b.textContent),
  }
}

describe('SymbolCompact', () => {
  it('keeps the panel face as it was', () => {
    const { blocks, tabs } = face({})
    expect(blocks).toEqual(['identity', 'chart', 'trades', 'verdict', 'narrative'])
    expect(tabs).toEqual(['Overview', 'Volatility', 'Dealer', 'Scenario', 'Flow', 'Chain', 'Payoff'])
  })

  it('reads in the design’s compact order, without the builders or the option faces', () => {
    const { blocks, tabs } = face({ page: true })
    expect(blocks).toEqual(['identity:page', 'held', 'adjusted', 'chart', 'trades', 'since:moved', 'narrative'])
    expect(tabs).toEqual(['Overview', 'Volatility', 'Dealer', 'Scenario', 'Flow'])
  })

  it('lands a compact link to an option face on Overview', () => {
    const { blocks } = face({ page: true, active: 'chain' })
    expect(blocks).not.toContain('chain')
    expect(blocks).toContain('since:moved')
  })
})
