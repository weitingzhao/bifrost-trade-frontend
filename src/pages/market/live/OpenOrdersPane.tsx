import { Activity, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatusLamp } from '@/components/StatusLamp'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import {
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTableNumCell,
} from '@/components/data-display'
import type { OpenOrder } from '@/types/market'
import type { StatusResponse } from '@/types/monitor'
import { fmtSince, fmtTs, parseOptionContractKey } from '@/lib/format'
import { fmtUsd } from '@/utils/positions'
import { liveTable } from './liveTableClasses'
import {
  liveEmptyHintClass,
  liveFreshnessBadgeClass,
  liveIconBtnClass,
  liveOpenOrdersSectionClass,
  liveOpenOrdersSubtitleClass,
  liveOpenOrdersWrapClass,
  livePaneClass,
  livePaneHeaderActionsClass,
  livePaneHeaderRowClass,
  livePaneTitleClass,
  livePaneTitleRowClass,
  liveSourceHintClass,
} from './liveUi'

interface Props {
  optOrders: OpenOrder[]
  stkOrders: OpenOrder[]
  ordersLamp: string
  openOrdersUpdatedAt: number | null
  status: StatusResponse | undefined
}

export function OpenOrdersPane({
  optOrders,
  stkOrders,
  ordersLamp,
  openOrdersUpdatedAt,
  status,
}: Props) {
  const navigate = useNavigate()
  const hb = status?.account_sync_daemon?.heartbeat
  const lampTitle = `Open orders lamp: green when Account Sync Daemon is healthy and heartbeat is fresh.${
    hb?.last_ts != null ? ` Last heartbeat ${fmtSince(hb.last_ts)} ago.` : ''
  }${openOrdersUpdatedAt != null ? ` Last UI read (GET /open-orders): ${fmtSince(openOrdersUpdatedAt)} ago.` : ''}`

  const total = optOrders.length + stkOrders.length

  return (
    <div className={livePaneClass}>
      <div className={livePaneHeaderRowClass}>
        <div className={livePaneTitleRowClass}>
          <StatusLamp lamp={ordersLamp} title={lampTitle} />
          <h2 className={livePaneTitleClass}>
            Open Orders
            <InfoTooltip text="Unfilled orders from PostgreSQL (daemon_open_orders). The Account Sync Daemon writes this table from the IB account stream. This page polls GET /open-orders every few seconds for UI updates. Account ID is the IB account that placed each order." />
          </h2>
        </div>
        <div className={livePaneHeaderActionsClass}>
          {openOrdersUpdatedAt != null && (
            <span className={liveFreshnessBadgeClass} title={`DB polled at ${fmtTs(openOrdersUpdatedAt)}`}>
              <Clock className="h-2.5 w-2.5 opacity-70" aria-hidden />
              <span>{fmtSince(openOrdersUpdatedAt)} ago</span>
            </span>
          )}
          <button
            type="button"
            className={liveIconBtnClass}
            onClick={() => navigate('/settings/subscribe')}
            title="Open Subscribe page (IB Event Subscribe — account agent stream)"
            aria-label="Open Subscribe page"
          >
            <Activity className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className={liveSourceHintClass}>Source: DB table daemon_open_orders</p>

      {total === 0 ? (
        <p className={liveEmptyHintClass}>No open orders</p>
      ) : (
        <div className={liveOpenOrdersWrapClass}>
          {optOrders.length > 0 && (
            <div className={liveOpenOrdersSectionClass}>
              <h3 className={liveOpenOrdersSubtitleClass}>Option (OPT)</h3>
              <div className={liveTable.shell}>
                <table className={liveTable.table} aria-label="Open orders Option">
                  <DenseTableHeader className={liveTable.stickyThead}>
                  <DenseTableHeadRow>
                    <DenseTableHead>Account ID</DenseTableHead>
                    <DenseTableHead>Symbol</DenseTableHead>
                    <DenseTableHead>Expiry</DenseTableHead>
                    <DenseTableHead align="right">Strike</DenseTableHead>
                    <DenseTableHead>Opt side</DenseTableHead>
                    <DenseTableHead>Side</DenseTableHead>
                    <DenseTableHead align="right">Qty</DenseTableHead>
                    <DenseTableHead align="right">Limit</DenseTableHead>
                    <DenseTableHead>Status</DenseTableHead>
                    <DenseTableHead align="right">Filled / Rem</DenseTableHead>
                    <DenseTableHead align="right">Submit</DenseTableHead>
                    <DenseTableHead align="right">Since</DenseTableHead>
                  </DenseTableHeadRow>
                </DenseTableHeader>
                <DenseTableBody>
                  {optOrders.map((o, i) => {
                    const optParts = parseOptionContractKey(o.contract_key)
                    const submitTs =
                      o.updated_ts != null && Number.isFinite(Number(o.updated_ts))
                        ? Number(o.updated_ts)
                        : null
                    return (
                      <DenseTableRow key={o.order_id ?? o.perm_id ?? i}>
                        <DenseTableCell>{o.account_id ?? '—'}</DenseTableCell>
                        <DenseTableCell className={liveTable.symbolCell}>{o.symbol ?? '—'}</DenseTableCell>
                        <DenseTableCell>{optParts.expiry}</DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {optParts.strike === '—' ? '—' : fmtUsd(Number(optParts.strike))}
                        </DenseTableCell>
                        <DenseTableCell>{optParts.rightLabel}</DenseTableCell>
                        <DenseTableCell>{o.action ?? '—'}</DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {o.total_quantity != null ? Math.round(Number(o.total_quantity)) : '—'}
                        </DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {o.limit_price != null ? fmtUsd(Number(o.limit_price)) : '—'}
                        </DenseTableCell>
                        <DenseTableCell>{o.status ?? '—'}</DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {o.filled != null && o.remaining != null
                            ? `${Math.round(Number(o.filled))} / ${Math.round(Number(o.remaining))}`
                            : '—'}
                        </DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {submitTs != null ? fmtTs(submitTs) : '—'}
                        </DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {submitTs != null ? `${fmtSince(submitTs)} ago` : '—'}
                        </DenseTableCell>
                      </DenseTableRow>
                    )
                  })}
                </DenseTableBody>
                </table>
              </div>
            </div>
          )}

          {stkOrders.length > 0 && (
            <div className={liveOpenOrdersSectionClass}>
              <h3 className={liveOpenOrdersSubtitleClass}>Stock (STK)</h3>
              <div className={liveTable.shell}>
                <table className={liveTable.table} aria-label="Open orders Stock">
                  <DenseTableHeader className={liveTable.stickyThead}>
                  <DenseTableHeadRow>
                    <DenseTableHead>Account ID</DenseTableHead>
                    <DenseTableHead>Symbol</DenseTableHead>
                    <DenseTableHead>Side</DenseTableHead>
                    <DenseTableHead align="right">Qty</DenseTableHead>
                    <DenseTableHead align="right">Limit</DenseTableHead>
                    <DenseTableHead>Status</DenseTableHead>
                    <DenseTableHead align="right">Filled / Rem</DenseTableHead>
                    <DenseTableHead align="right">Submit</DenseTableHead>
                    <DenseTableHead align="right">Since</DenseTableHead>
                  </DenseTableHeadRow>
                </DenseTableHeader>
                <DenseTableBody>
                  {stkOrders.map((o, i) => {
                    const submitTs =
                      o.updated_ts != null && Number.isFinite(Number(o.updated_ts))
                        ? Number(o.updated_ts)
                        : null
                    return (
                      <DenseTableRow key={o.order_id ?? o.perm_id ?? i}>
                        <DenseTableCell>{o.account_id ?? '—'}</DenseTableCell>
                        <DenseTableCell className={liveTable.symbolCell}>{o.symbol ?? '—'}</DenseTableCell>
                        <DenseTableCell>{o.action ?? '—'}</DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {o.total_quantity != null ? Math.round(Number(o.total_quantity)) : '—'}
                        </DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {o.limit_price != null ? fmtUsd(Number(o.limit_price)) : '—'}
                        </DenseTableCell>
                        <DenseTableCell>{o.status ?? '—'}</DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {o.filled != null && o.remaining != null
                            ? `${Math.round(Number(o.filled))} / ${Math.round(Number(o.remaining))}`
                            : '—'}
                        </DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {submitTs != null ? fmtTs(submitTs) : '—'}
                        </DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {submitTs != null ? `${fmtSince(submitTs)} ago` : '—'}
                        </DenseTableCell>
                      </DenseTableRow>
                    )
                  })}
                </DenseTableBody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
