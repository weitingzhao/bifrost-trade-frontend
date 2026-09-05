import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MarginByAccountStrip } from './MarginByAccountStrip'
import { rollupMargin } from '@/utils/marginPressure'

// Shape and values taken from the live DEV snapshot on 2026-09-05.
const HOST = {
  account_id: 'U17123565',
  summary: {
    NetLiquidation: '644944.21',
    MaintMarginReq: '214021.13',
    ExcessLiquidity: '468859.46',
    Cushion: '0.726977',
    BuyingPower: '1874133.76',
  },
}
const SECONDARY = {
  account_id: 'U8829175',
  summary: {
    NetLiquidation: '376390.56',
    MaintMarginReq: '93875.02',
    ExcessLiquidity: '285479.08',
    Cushion: '0.758465',
    BuyingPower: '1141916.31',
  },
}
/** Funded, but the broker sent no Cushion and no ExcessLiquidity. */
const BLIND = {
  account_id: 'U99000001',
  summary: { NetLiquidation: '120000.00', MaintMarginReq: '90000.00' },
}
const BOTH = { host: true, secondary: true }

function renderStrip(accounts: Parameters<typeof rollupMargin>[0], filter = BOTH) {
  return render(
    <MarginByAccountStrip
      margin={rollupMargin(accounts)}
      hostId={HOST.account_id}
      secondaryId={SECONDARY.account_id}
      accountFilter={filter}
    />
  )
}

describe('MarginByAccountStrip', () => {
  it('keeps the anchor and warns when no funded account reported margin', () => {
    const { container } = renderStrip([])
    const root = container.querySelector('#positions-margin')
    expect(root).not.toBeNull()
    expect(root).toHaveAttribute('aria-label', 'Margin by account')
    expect(screen.getByText('n/a — no funded account reported margin')).toBeInTheDocument()
    expect(screen.queryByRole('meter')).toBeNull()
    expect(screen.getByText('cockpit pressure: both accounts')).toBeInTheDocument()
  })

  it('draws one bar per account, host first, on the broker’s numbers', () => {
    renderStrip([SECONDARY, HOST])
    const meters = screen.getAllByRole('meter')
    expect(meters).toHaveLength(2)
    expect(meters[0]).toHaveAttribute('aria-label', 'HOST margin pressure')
    expect(meters[0]).toHaveAttribute('aria-valuenow', '27')
    expect(meters[1]).toHaveAttribute('aria-label', 'Secondary margin pressure')
    expect(meters[1]).toHaveAttribute('aria-valuenow', '24')

    const fills = screen.getAllByTestId('pressure-fill')
    expect(fills[0]).toHaveClass('bg-profit')
    expect(fills[0]).toHaveStyle({ width: '27%' })

    const hostRow = screen.getByText('HOST').closest('[data-account]') as HTMLElement
    expect(within(hostRow).getByText('27%')).toBeInTheDocument()
    expect(
      within(hostRow).getByText('· cushion 73% · excess $468.9k · BP $1.87M')
    ).toBeInTheDocument()
    expect(hostRow.title).toContain('NetLiquidation $644,944.21')
    expect(hostRow.title).toContain('Cushion 0.7270')
  })

  it('colours a stretched account as loss and a heavy one as warning', () => {
    renderStrip([
      { account_id: HOST.account_id, summary: { NetLiquidation: '1000', Cushion: '0.2' } },
      { account_id: SECONDARY.account_id, summary: { NetLiquidation: '1000', Cushion: '0.4' } },
    ])
    const fills = screen.getAllByTestId('pressure-fill')
    expect(fills[0]).toHaveClass('bg-loss')
    expect(fills[1]).toHaveClass('bg-warning')
  })

  it('shows a missing cushion as unknown — no bar, an explicit warning, never green', () => {
    renderStrip([HOST, BLIND])
    expect(screen.getAllByRole('meter')).toHaveLength(1)
    const blindRow = screen.getByText(BLIND.account_id).closest('[data-account]') as HTMLElement
    expect(within(blindRow).getByText('n/a — broker reported no cushion')).toHaveClass(
      'text-warning'
    )
    expect(within(blindRow).queryByRole('meter')).toBeNull()
    expect(blindRow.title).toContain('Cushion —')
    expect(blindRow.title).toContain('ExcessLiquidity —')
  })

  it('dims an account the filter has toggled off and says so in the title', () => {
    renderStrip([HOST, SECONDARY], { host: true, secondary: false })
    const secondaryRow = screen.getByText('Secondary').closest('[data-account]') as HTMLElement
    expect(secondaryRow).toHaveClass('opacity-50')
    expect(secondaryRow.title.split('\n')[0]).toBe('not in scope')
    expect(secondaryRow).toHaveAttribute('data-in-scope', 'false')
    const hostRow = screen.getByText('HOST').closest('[data-account]') as HTMLElement
    expect(hostRow).not.toHaveClass('opacity-50')
    expect(hostRow.title.startsWith('not in scope')).toBe(false)
  })
})
