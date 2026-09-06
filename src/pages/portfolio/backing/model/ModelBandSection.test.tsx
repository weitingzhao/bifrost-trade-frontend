import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ModelBandSection, type ModelBandProps } from './ModelBandSection'
import { modelBandScopeSentence } from './modelBandScope'
import { buildModelAnalysisResponse } from './modelAnalysis.fixture'

const accounts = {
  hostId: 'U111',
  secondaryId: 'U222',
  hostSelectable: true,
  secondarySelectable: true,
  hasSnapshotAccounts: true,
  initialAccountId: 'U111',
}
const both = { accountId: 'U111', side: 'host' as const, locked: false, scopeHasBoth: true }
const lockedHost = { accountId: 'U111', side: 'host' as const, locked: true, scopeHasBoth: false }

function renderBand(over: Partial<ModelBandProps> = {}) {
  const props: ModelBandProps = {
    accounts,
    account: both,
    onSideChange: vi.fn(),
    filterSymbol: '',
    data: buildModelAnalysisResponse(),
    isLoading: false,
    isFetching: false,
    error: null,
    onRefresh: vi.fn(),
    table: { open: false, expandedSymbol: null, onToggle: vi.fn(), onToggleSymbol: vi.fn() },
    ...over,
  }
  const utils = render(
    <TooltipProvider>
      <ModelBandSection {...props} />
    </TooltipProvider>,
  )
  return { ...utils, props, band: screen.getByTestId('model-band') }
}

describe('ModelBandSection', () => {
  it('with both accounts in scope: a switchable control on Host, and the sentence says it reads one of two', () => {
    const { props } = renderBand()
    const host = screen.getByRole('button', { name: 'Host' })
    expect(host).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Secondary' }))
    expect(props.onSideChange).toHaveBeenCalledWith('secondary')
    expect(screen.getByTestId('model-scope')).toHaveTextContent(
      'Model figures are for Host U111 only — this band reads one account at a time and never sums the two.',
    )
  })
  it('with one account in scope: a read-only tag, no switch, and the sentence says it follows the page', () => {
    renderBand({ account: lockedHost })
    expect(screen.queryByRole('button', { name: 'Secondary' })).toBeNull()
    expect(screen.getByTestId('model-account-tag')).toHaveTextContent('Host')
    expect(screen.getByTestId('model-scope')).toHaveTextContent('Following the page scope: Host U111.')
  })
  it('renders the summary strip open and the two collapsibles collapsed', () => {
    const { band } = renderBand()
    expect(within(band).getByRole('status', { name: 'Account summary' })).toHaveTextContent('$1,000,000.00')
    expect(screen.getByRole('button', { name: /Account Stress Matrix/ })).toHaveAttribute('aria-expanded', 'false')
    const table = screen.getByRole('button', { name: /Per underlying/ })
    expect(table).toHaveAttribute('aria-expanded', 'false')
    expect(table).toHaveTextContent('2 symbols · 1 undefined risk')
    expect(screen.queryByRole('table', { name: 'Model analysis per underlying' })).toBeNull()
  })
  it('an open table with an expanded symbol shows that symbol on its CAR panel', () => {
    const { props } = renderBand({ table: { open: true, expandedSymbol: 'NVDA', onToggle: vi.fn(), onToggleSymbol: vi.fn() } })
    const table = screen.getByRole('table', { name: 'Model analysis per underlying' })
    expect(within(table).getByRole('button', { name: 'Collapse NVDA details' })).toBeInTheDocument()
    expect(document.getElementById('car-heading-NVDA')).not.toBeNull()
    expect(document.getElementById('car-heading-DDOG')).toBeNull()
    fireEvent.click(within(table).getByRole('button', { name: 'Expand DDOG details' }))
    expect(props.table.onToggleSymbol).toHaveBeenCalledWith('DDOG')
  })
  it('the page symbol scope narrows the table and its header count, the way the rest of the page narrows', () => {
    renderBand({ filterSymbol: 'DD', table: { open: true, expandedSymbol: null, onToggle: vi.fn(), onToggleSymbol: vi.fn() } })
    expect(screen.getByRole('button', { name: /Per underlying/ })).toHaveTextContent('1 of 2 symbols · 1 undefined risk')
    const table = screen.getByRole('table', { name: 'Model analysis per underlying' })
    expect(within(table).queryByRole('button', { name: /NVDA details/ })).toBeNull()
    expect(within(table).getByRole('button', { name: 'Expand DDOG details' })).toBeInTheDocument()
  })
  it('a scope no modelled symbol matches says so instead of an empty table', () => {
    renderBand({ filterSymbol: 'TSLA', table: { open: true, expandedSymbol: null, onToggle: vi.fn(), onToggleSymbol: vi.fn() } })
    expect(screen.getByRole('button', { name: /Per underlying/ })).toHaveTextContent('0 of 2 symbols')
    expect(screen.getByText('No modelled symbol matches TSLA')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Model analysis per underlying' })).toBeNull()
  })
  it('loading shows the fixed-height skeletons and no data; an error shows the alert with retry', () => {
    const { rerender } = renderBand({ data: undefined, isLoading: true, isFetching: true })
    expect(screen.getByTestId('model-loading')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Account summary' })).toBeNull()
    expect(screen.getByRole('button', { name: /Loading…/ })).toBeDisabled()

    const onRefresh = vi.fn()
    rerender(
      <TooltipProvider>
        <ModelBandSection
          accounts={accounts}
          account={both}
          onSideChange={vi.fn()}
          filterSymbol=""
          data={undefined}
          isLoading={false}
          isFetching={false}
          error={new Error('Portfolio /portfolio/model-analysis: 503')}
          onRefresh={onRefresh}
          table={{ open: false, expandedSymbol: null, onToggle: vi.fn(), onToggleSymbol: vi.fn() }}
        />
      </TooltipProvider>,
    )
    expect(screen.getByText(/model-analysis: 503/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
  it('an empty account summary prints dashes instead of crashing', () => {
    renderBand({ data: buildModelAnalysisResponse({ account_summary: {}, per_underlying: [] }) })
    const strip = screen.getByRole('status', { name: 'Account summary' })
    expect(strip).toHaveTextContent('Net Liquidation—')
    expect(screen.getByText('No positions found for U111')).toBeInTheDocument()
  })
  it('no account in scope: no control, no request implied, and the sentence says so', () => {
    renderBand({ account: { accountId: '', side: null, locked: true, scopeHasBoth: false }, data: undefined })
    expect(screen.queryByTestId('model-account-tag')).toBeNull()
    expect(screen.getByRole('button', { name: /Refresh/ })).toBeDisabled()
    expect(screen.getByTestId('model-scope')).toHaveTextContent('No account in scope — turn on Host or Secondary above.')
  })
})

describe('modelBandScopeSentence', () => {
  it('names a locked side that the snapshot does not carry', () => {
    expect(modelBandScopeSentence({ accountId: '', side: 'host', locked: true, scopeHasBoth: false }, accounts)).toBe(
      'Host U111 is not in the current snapshot — nothing to model.',
    )
    expect(modelBandScopeSentence({ accountId: '', side: null, locked: false, scopeHasBoth: true }, accounts)).toBe(
      'Neither Host nor Secondary is in the current snapshot — nothing to model.',
    )
  })
})
