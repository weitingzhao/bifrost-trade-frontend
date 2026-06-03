import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTableNumCell,
} from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import type { StatusResponse } from '@/types/monitor'
import type { Execution } from '@/types/positions'
import {
  buildPositionRows,
  countOpenOrders,
  executionQty,
  formatExecutionTime,
  formatPositionUpdated,
  fmtDecimal,
  fmtNum,
  getEventAccountIds,
  getSubscribeChannel,
  openOrderRowLamp,
  truncateContractKey,
} from './subscribeUtils'
import {
  subscribeHintClass,
  subscribeInlineCodeClass,
  subscribeRefListClass,
  subscribeSectionTitleClass,
  subscribeSummaryKClass,
  subscribeSummaryLineClass,
  subscribeRedisKeyCellClass,
  subscribeTickerChipsClass,
} from './subscribeUi'

function OpenOrdersSection({ status }: { status: StatusResponse | null | undefined }) {
  const hb = status?.daemon?.heartbeat
  const { streamHostAccountId, hasSecondaryIb } = getEventAccountIds(status)
  const { host, secondary } = countOpenOrders(status)
  const hostLamp = openOrderRowLamp(hb?.daemon_alive, host)
  const secLamp = openOrderRowLamp(hb?.daemon_alive, secondary)

  return (
    <section className="space-y-2">
      <h3 className={subscribeSectionTitleClass}>Open orders</h3>
      <p className={subscribeHintClass}>
        Counts from this status response&apos;s portfolio snapshot (not Redis health).
      </p>
      <DenseDataTable>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead>Source</DenseTableHead>
            <DenseTableHead>Host account</DenseTableHead>
            {hasSecondaryIb && <DenseTableHead>Secondary account</DenseTableHead>}
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          <DenseTableRow>
            <DenseTableCell>Open orders</DenseTableCell>
            <DenseTableCell>
              <span className="inline-flex items-center gap-1.5">
                <StatusLamp
                  lamp={hostLamp === 'none' ? 'gray' : hostLamp}
                  className="h-3 w-3 shrink-0"
                />
                {hb?.daemon_alive ? (
                  <span>
                    <span className="font-mono tabular-nums">{host}</span>
                    {` open order${host === 1 ? '' : 's'}`}
                    {streamHostAccountId ? ` (${streamHostAccountId})` : ''}
                  </span>
                ) : (
                  '—'
                )}
              </span>
            </DenseTableCell>
            {hasSecondaryIb && (
              <DenseTableCell>
                <span className="inline-flex items-center gap-1.5">
                  <StatusLamp
                    lamp={secLamp === 'none' ? 'gray' : secLamp}
                    className="h-3 w-3 shrink-0"
                  />
                  {hb?.daemon_alive ? (
                    <span>
                      <span className="font-mono tabular-nums">{secondary}</span>
                      {` open order${secondary === 1 ? '' : 's'}`}
                    </span>
                  ) : (
                    '—'
                  )}
                </span>
              </DenseTableCell>
            )}
          </DenseTableRow>
        </DenseTableBody>
      </DenseDataTable>
    </section>
  )
}

function RecentExecutionsSection({
  items,
  isLoading,
  isError,
  error,
  onRetry,
}: {
  items: Execution[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  onRetry: () => void
}) {
  return (
    <section className="space-y-2">
      <h3 className={subscribeSectionTitleClass}>Recent executions (DB)</h3>
      <p className={subscribeHintClass}>
        Fill and commission details from the trading API (
        <code className={subscribeInlineCodeClass}>GET /executions</code>, persisted rows), not live
        IB socket frames. Refreshes when status is refetched.
      </p>
      {isError && <QueryErrorAlert error={error} onRetry={onRetry} />}
      {isLoading && !isError && (
        <p className={subscribeHintClass}>Loading executions…</p>
      )}
      {!isLoading && !isError && items.length === 0 && (
        <p className={subscribeHintClass}>
          No execution rows returned (empty or trading API unavailable).
        </p>
      )}
      {items.length > 0 && (
        <DenseDataTable tableClassName="min-w-[48rem]">
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Time</DenseTableHead>
              <DenseTableHead>Account</DenseTableHead>
              <DenseTableHead>Symbol</DenseTableHead>
              <DenseTableHead>Side</DenseTableHead>
              <DenseTableHead align="right">Qty</DenseTableHead>
              <DenseTableHead align="right">Price</DenseTableHead>
              <DenseTableHead align="right">Commission</DenseTableHead>
              <DenseTableHead>Source</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {items.map((ex, i) => (
              <DenseTableRow
                key={
                  ex.account_executions_id != null
                    ? `e-${ex.account_executions_id}`
                    : `e-${i}-${ex.exec_id}-${ex.time}`
                }
              >
                <DenseTableCell>{formatExecutionTime(ex)}</DenseTableCell>
                <DenseTableCell>{ex.account_id ?? '—'}</DenseTableCell>
                <DenseTableCell>{ex.symbol ?? '—'}</DenseTableCell>
                <DenseTableCell>{ex.side ?? '—'}</DenseTableCell>
                <DenseTableCell align="right" className={denseTableNumCell}>
                  {fmtNum(executionQty(ex))}
                </DenseTableCell>
                <DenseTableCell align="right" className={denseTableNumCell}>
                  {fmtDecimal(ex.price, 4)}
                </DenseTableCell>
                <DenseTableCell align="right" className={denseTableNumCell}>
                  {fmtDecimal(ex.commission, 2)}
                </DenseTableCell>
                <DenseTableCell>{ex.source ?? '—'}</DenseTableCell>
              </DenseTableRow>
            ))}
          </DenseTableBody>
        </DenseDataTable>
      )}
    </section>
  )
}

export function SnapshotTab({
  status,
  executions,
  executionsLoading,
  executionsError,
  executionsIsError,
  onRetryExecutions,
}: {
  status: StatusResponse | null | undefined
  executions: Execution[]
  executionsLoading: boolean
  executionsError: Error | null
  executionsIsError: boolean
  onRetryExecutions: () => void
}) {
  const hb = status?.daemon?.heartbeat
  const subscribedTickers = status?.live_ui?.subscribed_tickers ?? []
  const referenceIndices = status?.live_ui?.reference_indices ?? []
  const tickKeyCount = subscribedTickers.length
  const subscribeChannel = getSubscribeChannel(status)
  const { rows: positionRows, showAccountColumn, filterHint } = buildPositionRows(status)

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className={subscribeSectionTitleClass}>Host real-time tickers (daemon)</h3>
        <p className={subscribeHintClass}>
          Symbols the engine reports as subscribed (GET /status{' '}
          <code className={subscribeInlineCodeClass}>live_ui</code>). Pub/sub notify channel:{' '}
          <code className={subscribeInlineCodeClass}>{subscribeChannel}</code>.
        </p>
        {!hb?.daemon_alive && (
          <Alert>
            <AlertDescription>
              Engine heartbeat is stale; ticker list may be outdated.
            </AlertDescription>
          </Alert>
        )}
        <p className={subscribeSummaryLineClass}>
          <span className={subscribeSummaryKClass}>Count</span>
          <span>{tickKeyCount > 0 ? String(tickKeyCount) : '—'}</span>
        </p>
        {subscribedTickers.length > 0 ? (
          <div className={subscribeTickerChipsClass} aria-label="Subscribed tickers">
            {subscribedTickers.map(sym => (
              <Badge key={sym} variant="secondary" className="font-mono text-xs">
                {sym}
              </Badge>
            ))}
          </div>
        ) : (
          <p className={subscribeHintClass}>
            No symbols reported (engine off or no active tick subscriptions).
          </p>
        )}
        {referenceIndices.length > 0 && (
          <div className="mt-3">
            <p className={`${subscribeSummaryKClass} mb-1 text-xs`}>Reference indices</p>
            <ul className={subscribeRefListClass}>
              {referenceIndices.map((ri, i) => (
                <li key={`${ri.symbol}-${i}`}>
                  <code className={subscribeInlineCodeClass}>{ri.symbol}</code>
                  {ri.label ? ` — ${ri.label}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className={subscribeSectionTitleClass}>Position snapshot (from DB)</h3>
        <p className={subscribeHintClass}>
          Synced positions written by the daemon (
          <code className={subscribeInlineCodeClass}>account_positions</code>); aligns with the
          account stream pipeline, not raw Redis notify payloads.{filterHint}
        </p>
        {positionRows.length === 0 ? (
          <p className={subscribeHintClass}>No position rows in this status response.</p>
        ) : (
          <DenseDataTable tableClassName="min-w-[52rem]">
            <DenseTableHeader>
              <DenseTableHeadRow>
                {showAccountColumn && <DenseTableHead>Account</DenseTableHead>}
                <DenseTableHead>Symbol</DenseTableHead>
                <DenseTableHead>Sec type</DenseTableHead>
                <DenseTableHead align="right">Qty</DenseTableHead>
                <DenseTableHead>Contract key</DenseTableHead>
                <DenseTableHead>Position updated</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {positionRows.map(({ accountId, p }, idx) => {
                const ck = (p.contract_key ?? '').toString()
                return (
                  <DenseTableRow key={`${accountId}-${ck || p.symbol || 'row'}-${idx}`}>
                    {showAccountColumn && <DenseTableCell>{accountId || '—'}</DenseTableCell>}
                    <DenseTableCell>{p.symbol || '—'}</DenseTableCell>
                    <DenseTableCell>{p.secType || '—'}</DenseTableCell>
                    <DenseTableCell align="right" className={denseTableNumCell}>
                      {fmtNum(p.position)}
                    </DenseTableCell>
                    <DenseTableCell
                      className={subscribeRedisKeyCellClass}
                      title={ck || undefined}
                    >
                      {ck ? truncateContractKey(ck) : '—'}
                    </DenseTableCell>
                    <DenseTableCell>{formatPositionUpdated(p.updated_at)}</DenseTableCell>
                  </DenseTableRow>
                )
              })}
            </DenseTableBody>
          </DenseDataTable>
        )}
      </section>

      <OpenOrdersSection status={status} />

      <RecentExecutionsSection
        items={executions}
        isLoading={executionsLoading}
        isError={executionsIsError}
        error={executionsError}
        onRetry={onRetryExecutions}
      />
    </div>
  )
}
