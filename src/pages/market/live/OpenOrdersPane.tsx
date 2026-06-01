import { Activity, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatusLamp } from '@/components/StatusLamp'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import type { OpenOrder } from '@/types/market'
import type { StatusResponse } from '@/types/monitor'
import { fmtSince, fmtTs, parseOptionContractKey } from '@/lib/format'
import { fmtUsd } from '@/utils/positions'
import styles from './live.module.css'
import {
  liveEmptyHintClass,
  liveFreshnessBadgeClass,
  liveIconBtnClass,
  liveOpenOrdersPaneClass,
  liveOpenOrdersSectionClass,
  liveOpenOrdersSubtitleClass,
  liveOpenOrdersWrapClass,
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
    <div className={liveOpenOrdersPaneClass}>
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
              <div className={styles.tableWrap}>
                <table className={styles.openOrdersTable} aria-label="Open orders Option">
                  <thead>
                    <tr>
                      <th scope="col">Account ID</th>
                      <th scope="col">Symbol</th>
                      <th scope="col">Expiry</th>
                      <th scope="col">Strike</th>
                      <th scope="col">Opt side</th>
                      <th scope="col">Side</th>
                      <th scope="col">Qty</th>
                      <th scope="col">Limit</th>
                      <th scope="col">Status</th>
                      <th scope="col">Filled / Rem</th>
                      <th scope="col">Submit</th>
                      <th scope="col">Since</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optOrders.map((o, i) => {
                      const optParts = parseOptionContractKey(o.contract_key)
                      const submitTs =
                        o.updated_ts != null && Number.isFinite(Number(o.updated_ts))
                          ? Number(o.updated_ts)
                          : null
                      return (
                        <tr key={o.order_id ?? o.perm_id ?? i}>
                          <td>{o.account_id ?? '—'}</td>
                          <td className={styles.symbolCell}>{o.symbol ?? '—'}</td>
                          <td>{optParts.expiry}</td>
                          <td className={styles.numCell}>
                            {optParts.strike === '—' ? '—' : fmtUsd(Number(optParts.strike))}
                          </td>
                          <td>{optParts.rightLabel}</td>
                          <td>{o.action ?? '—'}</td>
                          <td className={styles.numCell}>
                            {o.total_quantity != null ? Math.round(Number(o.total_quantity)) : '—'}
                          </td>
                          <td className={styles.numCell}>
                            {o.limit_price != null ? fmtUsd(Number(o.limit_price)) : '—'}
                          </td>
                          <td>{o.status ?? '—'}</td>
                          <td className={styles.numCell}>
                            {o.filled != null && o.remaining != null
                              ? `${Math.round(Number(o.filled))} / ${Math.round(Number(o.remaining))}`
                              : '—'}
                          </td>
                          <td className={styles.numCell}>
                            {submitTs != null ? fmtTs(submitTs) : '—'}
                          </td>
                          <td className={styles.numCell}>
                            {submitTs != null ? `${fmtSince(submitTs)} ago` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {stkOrders.length > 0 && (
            <div className={liveOpenOrdersSectionClass}>
              <h3 className={liveOpenOrdersSubtitleClass}>Stock (STK)</h3>
              <div className={styles.tableWrap}>
                <table className={styles.openOrdersTable} aria-label="Open orders Stock">
                  <thead>
                    <tr>
                      <th scope="col">Account ID</th>
                      <th scope="col">Symbol</th>
                      <th scope="col">Side</th>
                      <th scope="col">Qty</th>
                      <th scope="col">Limit</th>
                      <th scope="col">Status</th>
                      <th scope="col">Filled / Rem</th>
                      <th scope="col">Submit</th>
                      <th scope="col">Since</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stkOrders.map((o, i) => {
                      const submitTs =
                        o.updated_ts != null && Number.isFinite(Number(o.updated_ts))
                          ? Number(o.updated_ts)
                          : null
                      return (
                        <tr key={o.order_id ?? o.perm_id ?? i}>
                          <td>{o.account_id ?? '—'}</td>
                          <td className={styles.symbolCell}>{o.symbol ?? '—'}</td>
                          <td>{o.action ?? '—'}</td>
                          <td className={styles.numCell}>
                            {o.total_quantity != null ? Math.round(Number(o.total_quantity)) : '—'}
                          </td>
                          <td className={styles.numCell}>
                            {o.limit_price != null ? fmtUsd(Number(o.limit_price)) : '—'}
                          </td>
                          <td>{o.status ?? '—'}</td>
                          <td className={styles.numCell}>
                            {o.filled != null && o.remaining != null
                              ? `${Math.round(Number(o.filled))} / ${Math.round(Number(o.remaining))}`
                              : '—'}
                          </td>
                          <td className={styles.numCell}>
                            {submitTs != null ? fmtTs(submitTs) : '—'}
                          </td>
                          <td className={styles.numCell}>
                            {submitTs != null ? `${fmtSince(submitTs)} ago` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

