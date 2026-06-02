import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import type { InstanceDetailData } from '@/hooks/useInstanceDetailData'
import type { Execution } from '@/types/positions'
import { buildOptExecutionGroups, type OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { adjustedRealizedPnlForOptGroup } from '@/utils/ledger/ledgerOptHelpers'
import { pnlColorClass } from '@/utils/dailyChange'
import styles from './InstanceDetail.module.css'
import {
  instanceDetailBlockClass,
  instanceExecHintClass,
  instanceExecTabActiveClass,
  instanceExecTabClass,
  instanceExecTabsClass,
  instanceMutedClass,
  instanceSectionTitleClass,
} from './instanceDetailUi'

type ExecTab = 'performance_book' | 'tws_raw'

function isBuySide(e: Execution): boolean {
  const s = (e.side ?? '').toUpperCase()
  return s === 'BUY' || s === 'BOT' || s === 'B'
}

function isSellSide(e: Execution): boolean {
  const s = (e.side ?? '').toUpperCase()
  return s === 'SELL' || s === 'SLD' || s === 'S'
}

function formatStrike(strike: number | null | undefined): string {
  if (strike == null || !Number.isFinite(strike)) return '—'
  return Number.isInteger(strike) ? String(strike) : strike.toFixed(2).replace(/\.?0+$/, '')
}

function contractLabel(g: OptExecutionGroup): string {
  const sym = (g.symbol ?? '').trim().split(/\s+/)[0] ?? ''
  const r = (g.option_right ?? '').toString().toUpperCase().slice(0, 1) || '—'
  return `${sym} ${g.expiry ?? '—'} ${formatStrike(g.strike)} ${r}`.trim()
}

function fmtFillDate(e: Execution, tab: ExecTab): string {
  if (e.trade_date) return e.trade_date.slice(0, 10)
  if (tab === 'tws_raw' && e.time != null) {
    return new Date(e.time * 1000).toLocaleDateString('en-US')
  }
  return '—'
}


function GroupBlock({
  group,
  tab,
  linkByOptionId,
}: {
  group: OptExecutionGroup
  tab: ExecTab
  linkByOptionId: InstanceDetailData['optionStockLinkByOptionId']
}) {
  const buyComm = group.trades
    .filter(isBuySide)
    .reduce((s, e) => s + Math.abs(Number(e.commission) || 0), 0)
  const sellComm = group.trades
    .filter(isSellSide)
    .reduce((s, e) => s + Math.abs(Number(e.commission) || 0), 0)
  const buyRaw = (group.buy_avg_price ?? 0) * group.buy_volume * 100
  const sellRaw = (group.sell_avg_price ?? 0) * group.sell_volume * 100
  const gross = sellRaw - buyRaw
  const comm = buyComm + sellComm
  const net = linkByOptionId
    ? adjustedRealizedPnlForOptGroup(group, linkByOptionId)
    : group.realized_pnl

  const buyFills = group.trades.filter(isBuySide)
  const sellFills = group.trades.filter(isSellSide)
  const openNet = Math.abs(group.net_qty) >= 1e-9

  return (
    <div key={group.contract_key} className={styles.matchWrap}>
      <table className={styles.matchTable}>
        <thead>
          <tr>
            <th className={styles.thBuy}>Buy</th>
            <th>Contract / net</th>
            <th className={styles.thSell}>Sell</th>
            <th className={styles.tdSell}>Group PnL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={styles.tdNums}>
              <div className={styles.thBuy}>Qty {group.buy_volume || '—'}</div>
              <div>Avg {group.buy_avg_price != null ? group.buy_avg_price.toFixed(2) : '—'}</div>
              <div>{fmtUsd(buyRaw)}</div>
            </td>
            <td className={styles.contractCenter}>
              <div className={styles.contractLink}>{contractLabel(group)}</div>
              <div className={styles.netBadge}>
                <span>Net {group.net_qty}</span>
                <span className={openNet ? styles.netStatusOpen : styles.netStatusFlat}>
                  {openNet ? 'Open' : 'Flat'}
                </span>
              </div>
            </td>
            <td className={cn(styles.tdNums, styles.tdSell)}>
              <div className={styles.thSell}>Qty {group.sell_volume || '—'}</div>
              <div>Avg {group.sell_avg_price != null ? group.sell_avg_price.toFixed(2) : '—'}</div>
              <div>{fmtUsd(sellRaw)}</div>
              <div className={instanceMutedClass}>Comm {fmtUsd(-comm)}</div>
            </td>
            <td className={cn(styles.tdNums, styles.tdSell)}>
              <div>Gross {fmtUsd(gross)}</div>
              <div className={instanceMutedClass}>Comm {fmtUsd(-comm)}</div>
              <div className={cn('font-semibold', pnlColorClass(net))}>Net {fmtUsd(net)}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {(buyFills.length > 0 || sellFills.length > 0) && (
        <div className={styles.fillsWrap}>
          <div>
            <div className={cn(styles.fillsHeader, styles.fillsBuy)}>
              Buy fills ({buyFills.length})
            </div>
            {buyFills.map((f) => (
              <div key={f.account_executions_id ?? `${f.trade_date}-${f.price}`} className={styles.fillsRow}>
                <span>{fmtFillDate(f, tab)}</span>
                <span style={{ textAlign: 'right' }}>{Math.abs(Number(f.quantity ?? f.qty) || 0)}</span>
                <span style={{ textAlign: 'right' }}>{Number(f.price).toFixed(2)}</span>
                <span style={{ textAlign: 'right' }} className={instanceMutedClass}>
                  {fmtUsd(-(Number(f.commission) || 0))}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.fillsColSell}>
            <div className={cn(styles.fillsHeader, styles.fillsSell)}>
              Sell fills ({sellFills.length})
            </div>
            {sellFills.map((f) => (
              <div key={f.account_executions_id ?? `${f.trade_date}-${f.price}-s`} className={styles.fillsRow}>
                <span>{fmtFillDate(f, tab)}</span>
                <span style={{ textAlign: 'right' }}>{Math.abs(Number(f.quantity ?? f.qty) || 0)}</span>
                <span style={{ textAlign: 'right' }}>{Number(f.price).toFixed(2)}</span>
                <span style={{ textAlign: 'right' }} className={instanceMutedClass}>
                  {fmtUsd(-(Number(f.commission) || 0))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface Props {
  data: InstanceDetailData
  hideSectionTitle?: boolean
}

export function InstanceExecutionsSection({ data, hideSectionTitle = false }: Props) {
  const [tab, setTab] = useState<ExecTab>('performance_book')
  const activeRows = tab === 'performance_book' ? data.executionsFinal : data.executionsTws

  const groups = useMemo(() => buildOptExecutionGroups(activeRows), [activeRows])

  const totals = useMemo(() => {
    if (groups.length === 0) return null
    let gross = 0
    let comm = 0
    let net = 0
    for (const g of groups) {
      const buyRaw = (g.buy_avg_price ?? 0) * g.buy_volume * 100
      const sellRaw = (g.sell_avg_price ?? 0) * g.sell_volume * 100
      gross += sellRaw - buyRaw
      const buyComm = g.trades.filter(isBuySide).reduce((s, e) => s + Math.abs(Number(e.commission) || 0), 0)
      const sellComm = g.trades.filter(isSellSide).reduce((s, e) => s + Math.abs(Number(e.commission) || 0), 0)
      comm += buyComm + sellComm
      net += data.optionStockLinkByOptionId
        ? adjustedRealizedPnlForOptGroup(g, data.optionStockLinkByOptionId)
        : g.realized_pnl
    }
    return { gross, comm, net }
  }, [groups, data.optionStockLinkByOptionId])

  const Wrapper = hideSectionTitle ? 'div' : 'section'
  const wrapperProps = hideSectionTitle
    ? { 'aria-label': 'Executions' as const }
    : { className: instanceDetailBlockClass, 'aria-label': 'Executions' as const }

  return (
    <Wrapper {...wrapperProps}>
      {!hideSectionTitle ? <h3 className={instanceSectionTitleClass}>Executions</h3> : null}

      <div className={instanceExecTabsClass} role="tablist" aria-label="Execution source">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'performance_book'}
          className={cn(instanceExecTabClass, tab === 'performance_book' && instanceExecTabActiveClass)}
          onClick={() => setTab('performance_book')}
        >
          Performance book
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'tws_raw'}
          className={cn(instanceExecTabClass, tab === 'tws_raw' && instanceExecTabActiveClass)}
          onClick={() => setTab('tws_raw')}
        >
          TWS client
        </button>
      </div>

      <p className={instanceExecHintClass}>
        {tab === 'performance_book'
          ? 'Final book: contract buy/sell match; fill-level rows follow each contract.'
          : 'TWS raw: positive qty with Side; fills listed under each contract.'}
      </p>

      {data.execLoading ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : activeRows.length === 0 ? (
        <p className={instanceMutedClass}>No executions for this instance in this source.</p>
      ) : (
        <div className="space-y-0">
          {groups.map((g) => (
            <GroupBlock
              key={`${g.contract_key}-${g.strike}`}
              group={g}
              tab={tab}
              linkByOptionId={data.optionStockLinkByOptionId}
            />
          ))}

          {totals != null && (
            <div className={styles.totalsRow}>
              <span>
                Total gross <strong className={styles.tdNums}>{fmtUsd(totals.gross)}</strong>
              </span>
              <span>
                Comm <strong className={styles.tdNums}>{fmtUsd(-totals.comm)}</strong>
              </span>
              <span>
                Net{' '}
                <strong className={cn(styles.tdNums, pnlColorClass(totals.net))}>{fmtUsd(totals.net)}</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </Wrapper>
  )
}
