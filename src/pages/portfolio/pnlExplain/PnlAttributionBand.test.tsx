import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AttributionSums, PnlAttributionResponse } from '@/lib/schemas/snapshots'
import { PnlAttributionBand } from './PnlAttributionBand'
import { PNL_UNRECORDED } from './pnlExplainModel'

/**
 * TD-138 ratchet: once the snapshot route answers with a read session, P&L
 * Explain stops saying the snapshot does not exist. Values are invented.
 */
function sums(over: Partial<AttributionSums> = {}): AttributionSums {
  return {
    held_pnl: 50,
    delta_pnl: 40,
    gamma_pnl: -2,
    vega_pnl: 6,
    theta_pnl: 3,
    unexplained: 3,
    rows: 3,
    read_rows: 2,
    unread_rows: 1,
    unread_held_pnl: 0,
    mark_anomaly_rows: 0,
    mark_anomaly_unexplained: 0,
    greeks_quality: { vendor: 1, degraded: 1, missing: 0 },
    status: { ok: 2, opened_in_session: 1, closed_in_session: 0, no_mark: 0 },
    ...over,
  }
}

const READ: PnlAttributionResponse = {
  items: [],
  count: 3,
  sessions: [
    { snapshot_date: '2031-03-03', prior_date: '2031-02-28', status: 'no_prior_snapshot', totals: null },
    { snapshot_date: '2031-03-04', prior_date: '2031-03-03', status: 'ok', days: 1, totals: sums() },
  ],
  by_trade: [],
  by_symbol: [{ ...sums(), symbol: 'ZZZ' }],
  totals: sums(),
}

function renderBand(attr: PnlAttributionResponse | null | undefined) {
  return render(
    <PnlAttributionBand attr={attr} loading={false} failed={false} windowLabel="Quarter" windowPnl={120} legNames={[]} />,
  )
}

describe('PnlAttributionBand', () => {
  it('reads the session pair: figures, the Greek quality tag, and no not-wired text', () => {
    const { container } = renderBand(READ)
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/Nothing stores one/)
    expect(text).not.toMatch(/needs the daily snapshot/)
    expect(text).not.toMatch(/no session pair read/)
    expect(screen.getByText(/1 session read · 1 without a prior snapshot/)).toBeInTheDocument()
    expect(screen.getByText('DEG 1')).toBeInTheDocument()
    expect(screen.getByText(/Not read: 03MAR31/)).toBeInTheDocument()
  })

  it('keeps the marked shape and says why when the API does not serve the route', () => {
    renderBand(null)
    expect(screen.getByTestId('attribution-unread-reason')).toHaveTextContent(PNL_UNRECORDED.notServed)
    expect(screen.getByText(/no session pair read/)).toBeInTheDocument()
  })

  it('says the window has no session pair rather than that nothing is stored', () => {
    renderBand({ ...READ, sessions: [READ.sessions[0]], totals: sums({ read_rows: 0 }) })
    expect(screen.getByTestId('attribution-unread-reason')).toHaveTextContent(PNL_UNRECORDED.noPair)
  })

  it('flags a mark under intrinsic and how much of the residual sits on it', () => {
    renderBand({ ...READ, totals: sums({ mark_anomaly_rows: 1, mark_anomaly_unexplained: 3 }) })
    expect(screen.getByText(/mark under intrinsic at\s+one close/)).toBeInTheDocument()
  })
})
