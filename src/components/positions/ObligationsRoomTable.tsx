/**
 * Obligations and room, per account × symbol.
 *
 * Three Coverage panels used to say this: cash the puts would take, shares
 * behind the calls, spare cover. Each was right and none of them answered
 * the seller's question on its own — for this name, in this account, what is
 * owed and what is left. One row now carries both sides: the puts' cash
 * demand drawn against the cash-like layer, and the calls as a bar of
 * covered | naked | room in contracts.
 *
 * Presentational only. The page derives every number once and hands the rows
 * in; nothing is recomputed here except the bar geometry, so the table cannot
 * disagree with the gauges above it. The one exception is deliberate: an
 * account holding no shares gets every short call drawn naked, whatever the
 * row says, because there is nothing there for a call to be covered by.
 *
 * Missing is never safe. An unpriced symbol shows "—" for price and market
 * value and is flagged as unpriced, not rendered as zero; a sum that lost a
 * contributor says how many it lost; buying power that is unknown and buying
 * power that is zero are two different sentences.
 */
import { Fragment } from 'react'
import { cn } from '@/lib/utils'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  GrandTotalRow,
  GroupHeaderRow,
  InlinePnl,
  SymbolLinkButton,
  denseTable,
  denseTableEntityCell,
  denseTableEntityLink,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtUsd } from '@/utils/positions'
import {
  sortObligations,
  type ObligationsRow,
  type ObligationsSort,
} from '@/utils/obligationsRoom'

export interface ObligationsRoomTableProps {
  rows: readonly ObligationsRow[]
  /** Cash plus cash-like holdings — the layer the put demand is drawn against. */
  cashLikeTotal: number
  /** Broker buying power across funded accounts; null when none reported it. */
  buyingPower: number | null
  sort: ObligationsSort
  onSortChange: (s: ObligationsSort) => void
  onSymbolClick: (symbol: string, accountId: string) => void
  onNakedClick?: (symbol: string) => void
}

const COL_COUNT = 10

/**
 * Owner decision: income ETFs (PFF / BALI / BINC) back puts through the
 * broker's own haircut, never as cash. Printed under the table, not hidden in
 * a tooltip, because the cash-like figure the bars are drawn against would
 * otherwise look smaller than the holdings suggest.
 */
const INCOME_ETF_NOTE = 'Income ETFs count via buying power, not as cash.'

/**
 * Put demand as a share of buying power. Past this it is drawn as a warning;
 * past 100% as a loss, because assignment would then outrun the broker's own
 * line and the remainder is a margin call, not a position.
 */
const BP_HEAVY_SHARE = 0.5

function fmtShares(n: number): string {
  return n.toLocaleString('en-US')
}

/**
 * Puts' cash demand as a share of the cash-like layer. Past 100% the row on
 * its own would exhaust cash and the remainder sits on margin — that is the
 * warning, not the bar being long.
 */
function CashBar({ cash, total }: { cash: number; total: number }) {
  const share = cash / total
  const over = share > 1
  const pct = Math.round(share * 100)
  return (
    <span
      role="img"
      aria-label={`${pct}% of cash-like${over ? ', exceeds cash-like on its own' : ''}`}
      className="mt-0.5 block h-1 w-full overflow-hidden rounded-sm border border-border/60 bg-secondary"
    >
      <span
        className={cn('block h-full', over ? 'bg-warning' : 'bg-muted-foreground/70')}
        style={{ width: `${Math.min(100, share * 100)}%` }}
      />
    </span>
  )
}

/**
 * Short calls in contracts: covered | naked | room. Widths are the counts
 * themselves via flex-grow, so a single naked contract among fifty is still a
 * visible sliver rather than a rounding casualty.
 */
function CallsBar({
  covered,
  naked,
  room,
  symbol,
  onNakedClick,
}: {
  covered: number
  naked: number
  room: number
  symbol: string
  onNakedClick?: (symbol: string) => void
}) {
  const nakedLabel = `${naked} naked call${naked === 1 ? '' : 's'} on ${symbol}`
  return (
    <span
      role="group"
      aria-label={`Calls: ${covered} covered, ${naked} naked, ${room} room`}
      className="mt-0.5 flex h-1.5 w-full gap-px overflow-hidden rounded-sm"
    >
      {covered > 0 ? (
        <span className="block h-full min-w-[3px] bg-profit" style={{ flex: `${covered} 0 0` }} />
      ) : null}
      {naked > 0 ? (
        onNakedClick ? (
          <button
            type="button"
            aria-label={nakedLabel}
            title={`${nakedLabel}\nClick to open the naked calls.`}
            onClick={() => onNakedClick(symbol)}
            className="block h-full min-w-[3px] cursor-pointer bg-loss hover:opacity-80"
            style={{ flex: `${naked} 0 0` }}
          />
        ) : (
          <span
            aria-label={nakedLabel}
            className="block h-full min-w-[3px] bg-loss"
            style={{ flex: `${naked} 0 0` }}
          />
        )
      ) : null}
      {room > 0 ? (
        <span className="block h-full min-w-[3px] bg-muted" style={{ flex: `${room} 0 0` }} />
      ) : null}
    </span>
  )
}

function CallsCounts({ total, naked, room }: { total: number; naked: number; room: number }) {
  return (
    <span className="font-mono tabular-nums">
      <span className={cn(total === 0 && 'text-muted-foreground')}>{total}</span>
      {naked > 0 ? <span className="text-loss">{` · ${naked} naked`}</span> : null}
      {room > 0 ? <span className="text-muted-foreground">{` · +${room} room`}</span> : null}
    </span>
  )
}

/** "—" that says why, so an unknown never reads as a zero. */
function Unknown({ title }: { title: string }) {
  return (
    <span className="text-warning" title={title}>
      —
    </span>
  )
}

const UNPRICED_ROW = 'Unpriced — no quote for this symbol'
const UNPRICED_SUM = 'No priced rows in scope'

/** Caption under a partial sum: how many rows it is missing, and why. */
function MissingNote({ count, what, title }: { count: number; what: string; title: string }) {
  if (count === 0) return null
  return (
    <span className="block text-dense-meta font-normal text-warning" title={title}>
      {count} {what}
    </span>
  )
}

interface Totals {
  puts: number
  cash: number
  covered: number
  naked: number
  more: number
  held: number
  /** Null until at least one row contributed; a sum of nothing is unknown, not zero. */
  marketValue: number | null
  dailyPnl: number | null
  totalPnl: number | null
  /** Rows whose price is unknown; their market value is not in the sum. */
  unpriced: number
  /** Rows with no daily / total PnL figure; a priced row can still lack one. */
  noDaily: number
  noTotal: number
}

function addKnown(sum: number | null, v: number | null): number | null {
  if (v == null) return sum
  return (sum ?? 0) + v
}

function sumRows(rows: readonly ObligationsRow[]): Totals {
  const t: Totals = {
    puts: 0,
    cash: 0,
    covered: 0,
    naked: 0,
    more: 0,
    held: 0,
    marketValue: null,
    dailyPnl: null,
    totalPnl: null,
    unpriced: 0,
    noDaily: 0,
    noTotal: 0,
  }
  for (const r of rows) {
    t.puts += r.shortPuts
    t.cash += r.cashIfAssigned
    t.held += r.sharesHeld
    t.more += r.moreCalls
    // An account with no shares has nothing to cover with, whatever the row says.
    if (r.sharesHeld <= 0) t.naked += r.coveredCalls + r.nakedCalls
    else {
      t.covered += r.coveredCalls
      t.naked += r.nakedCalls
    }
    if (r.price == null || r.marketValue == null) t.unpriced += 1
    else t.marketValue = addKnown(t.marketValue, r.marketValue)
    if (r.dailyPnl == null) t.noDaily += 1
    else t.dailyPnl = addKnown(t.dailyPnl, r.dailyPnl)
    if (r.totalPnl == null) t.noTotal += 1
    else t.totalPnl = addKnown(t.totalPnl, r.totalPnl)
  }
  return t
}

/**
 * Put demand against buying power, as text plus tone. Unknown, zero and a
 * real share are three different facts: a dash for "nobody reported it", a
 * loss-toned "no BP" for "reported and there is none", and the share itself
 * otherwise — never rounded down to 0% while the demand is real.
 */
function bpShare(cash: number, buyingPower: number | null): { text: string; tone: string; title: string } {
  if (buyingPower == null) {
    return {
      text: '—',
      tone: 'text-warning',
      title: 'Buying power not reported by any funded account.',
    }
  }
  if (buyingPower <= 0) {
    return {
      text: 'no BP',
      tone: 'text-loss',
      title: 'Buying power is zero — nothing left to absorb an assignment.',
    }
  }
  const share = cash / buyingPower
  const pct = share > 0 && share < 0.01 ? '<1' : String(Math.round(share * 100))
  const text = `${pct}% of BP`
  if (share >= 1) {
    return { text, tone: 'text-loss', title: 'Put demand exceeds buying power; assignment would breach margin.' }
  }
  if (share >= BP_HEAVY_SHARE) {
    return {
      text,
      tone: 'text-warning',
      title: `Put demand is over ${Math.round(BP_HEAVY_SHARE * 100)}% of buying power.`,
    }
  }
  return { text, tone: 'text-muted-foreground', title: 'Put demand as a share of buying power.' }
}

const SORT_TITLE: Record<ObligationsSort, string> = {
  cash: 'Cash a full put assignment would take, largest first.',
  calls: 'Short calls, most first; naked breaks ties.',
  spare: 'Contracts the spare shares could still back, most first.',
  symbol: 'Symbol, A to Z.',
}

export function ObligationsRoomTable({
  rows,
  cashLikeTotal,
  buyingPower,
  sort,
  onSortChange,
  onSymbolClick,
  onNakedClick,
}: ObligationsRoomTableProps) {
  if (rows.length === 0) {
    return <p className={denseTable.emptyHint}>No option obligations in scope.</p>
  }

  // Accounts keep the order the page handed them in (host first); the sort
  // applies within each account, so a ranking never reshuffles the groups.
  const accountOrder: string[] = []
  const byAccount = new Map<string, ObligationsRow[]>()
  for (const r of rows) {
    const list = byAccount.get(r.accountId)
    if (list) list.push(r)
    else {
      accountOrder.push(r.accountId)
      byAccount.set(r.accountId, [r])
    }
  }

  const totals = sumRows(rows)
  const showCashBars = cashLikeTotal > 0
  const bp = bpShare(totals.cash, buyingPower)

  // Every sort key has a visible control. Native buttons inside the head cell
  // so Enter / Space activate without a hand-rolled key handler, and so the
  // Calls head can carry two of them (Calls · Room) in one column.
  const sortButton = (label: string, key: ObligationsSort) => {
    const active = sort === key
    return (
      <button
        type="button"
        className={cn(denseTable.sortableHead, active && 'text-foreground')}
        title={SORT_TITLE[key]}
        aria-pressed={active}
        onClick={() => onSortChange(key)}
      >
        {label}
        {active ? (key === 'symbol' ? ' ▲' : ' ▼') : ''}
      </button>
    )
  }
  const ariaSort = (...keys: ObligationsSort[]) =>
    keys.includes(sort) ? (sort === 'symbol' ? 'ascending' : 'descending') : undefined

  const renderRow = (r: ObligationsRow) => {
    const unpriced = r.price == null
    const callsTotal = r.coveredCalls + r.nakedCalls
    // No shares held: every short call is naked, whatever the row claims.
    const noShares = r.sharesHeld <= 0
    const covered = noShares ? 0 : r.coveredCalls
    const naked = noShares ? callsTotal : r.nakedCalls
    // Demand with nothing cash-like behind it is on margin whether or not
    // there is a bar to draw; the tone stays when the bar goes.
    const overCash = r.cashIfAssigned > 0 && r.cashIfAssigned > cashLikeTotal
    const cashTitle = !overCash
      ? showCashBars
        ? `${fmtUsd(r.cashIfAssigned)} of ${fmtUsd(cashLikeTotal)} cash-like`
        : undefined
      : showCashBars
        ? `${fmtUsd(r.cashIfAssigned)} of ${fmtUsd(cashLikeTotal)} cash-like — this name alone exceeds it; the rest sits on margin`
        : 'No cash-like layer — this demand sits entirely on margin.'
    return (
      <DenseTableRow key={`${r.accountId}-${r.symbol}`}>
        <DenseTableCell className={denseTableEntityCell}>
          <SymbolLinkButton
            label={r.symbol}
            onClick={() => onSymbolClick(r.symbol, r.accountId)}
            ariaLabel={`Open ${r.symbol} in account ${r.accountId}`}
            variant="stock"
            className={denseTableEntityLink}
          />
        </DenseTableCell>
        <DenseTableCell className={cn(denseTableNumCell, r.shortPuts === 0 && 'text-muted-foreground')}>
          {r.shortPuts}
        </DenseTableCell>
        <DenseTableCell className={denseTableNumCell} title={cashTitle}>
          <span className={cn(overCash && 'text-warning', r.cashIfAssigned === 0 && 'text-muted-foreground')}>
            {fmtUsd(r.cashIfAssigned)}
          </span>
          {showCashBars && r.cashIfAssigned > 0 ? (
            <CashBar cash={r.cashIfAssigned} total={cashLikeTotal} />
          ) : null}
        </DenseTableCell>
        <DenseTableCell
          className="text-right"
          title={
            noShares && callsTotal > 0
              ? 'No shares held in this account — every short call is naked.'
              : `${covered} covered · ${naked} naked · room for ${r.moreCalls} more on ${fmtShares(r.sharesSpare)} spare shares`
          }
        >
          <CallsCounts total={callsTotal} naked={naked} room={r.moreCalls} />
          {callsTotal + r.moreCalls > 0 ? (
            <CallsBar
              covered={covered}
              naked={naked}
              room={r.moreCalls}
              symbol={r.symbol}
              onNakedClick={onNakedClick}
            />
          ) : null}
        </DenseTableCell>
        <DenseTableCell
          className={cn(denseTableNumCell, noShares && 'text-muted-foreground')}
          title={`${fmtShares(r.sharesBacking)} backing calls · ${fmtShares(r.sharesSpare)} spare`}
        >
          {fmtShares(r.sharesHeld)}
        </DenseTableCell>
        <DenseTableCell className={denseTableNumCell}>{fmtUsd(r.avgCost)}</DenseTableCell>
        <DenseTableCell className={denseTableNumCell}>
          {unpriced ? <Unknown title={UNPRICED_ROW} /> : fmtUsd(r.price)}
        </DenseTableCell>
        <DenseTableCell className={denseTableNumCell}>
          {unpriced || r.marketValue == null ? <Unknown title={UNPRICED_ROW} /> : fmtUsd(r.marketValue)}
        </DenseTableCell>
        <DenseTableCell className={denseTableNumCell}>
          <InlinePnl value={r.dailyPnl}>{fmtUsd(r.dailyPnl)}</InlinePnl>
        </DenseTableCell>
        <DenseTableCell className={denseTableNumCell}>
          <InlinePnl value={r.totalPnl}>{fmtUsd(r.totalPnl)}</InlinePnl>
        </DenseTableCell>
      </DenseTableRow>
    )
  }

  const names = rows.length

  return (
    <div>
      <DenseDataTable wrapClassName="border-0">
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead align="left" aria-sort={ariaSort('symbol')}>
              {sortButton('Symbol', 'symbol')}
            </DenseTableHead>
            <DenseTableHead align="right" title="Short put contracts.">
              Puts
            </DenseTableHead>
            <DenseTableHead align="right" aria-sort={ariaSort('cash')}>
              {sortButton('Cash if assigned', 'cash')}
            </DenseTableHead>
            <DenseTableHead align="right" aria-sort={ariaSort('calls', 'spare')}>
              {sortButton('Calls', 'calls')}
              <span className="text-muted-foreground"> · </span>
              {sortButton('Room', 'spare')}
            </DenseTableHead>
            <DenseTableHead align="right" title="Whole long shares in the same account.">
              Held sh
            </DenseTableHead>
            <DenseTableHead align="right">Avg cost</DenseTableHead>
            <DenseTableHead align="right">Price</DenseTableHead>
            <DenseTableHead align="right">Market value</DenseTableHead>
            <DenseTableHead align="right">Daily</DenseTableHead>
            <DenseTableHead align="right">Total</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {accountOrder.map((accountId) => (
            <Fragment key={accountId}>
              <GroupHeaderRow colSpan={COL_COUNT} label={accountId} />
              {sortObligations(byAccount.get(accountId) ?? [], sort).map(renderRow)}
            </Fragment>
          ))}
          <GrandTotalRow labelColSpan={1} label={`Total (${names} ${names === 1 ? 'name' : 'names'})`}>
            <DenseTableCell className={denseTableNumCell}>{totals.puts}</DenseTableCell>
            <DenseTableCell className={denseTableNumCell} title={INCOME_ETF_NOTE}>
              <span className={cn(totals.cash > 0 && bp.tone === 'text-loss' && 'text-loss')}>
                {fmtUsd(totals.cash)}
              </span>
              <span className={cn('block text-dense-meta font-normal', bp.tone)} title={bp.title}>
                {bp.text}
              </span>
            </DenseTableCell>
            <DenseTableCell className="text-right font-mono tabular-nums">
              <span className={cn(totals.covered === 0 && 'text-muted-foreground')}>{totals.covered} covered</span>
              <span className={cn(totals.naked > 0 ? 'text-loss' : 'text-muted-foreground')}>
                {` · ${totals.naked} naked`}
              </span>
              <span className="text-muted-foreground">{` · +${totals.more} room`}</span>
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>{fmtShares(totals.held)}</DenseTableCell>
            <DenseTableCell />
            <DenseTableCell />
            <DenseTableCell className={denseTableNumCell}>
              {totals.marketValue == null ? <Unknown title={UNPRICED_SUM} /> : fmtUsd(totals.marketValue)}
              <MissingNote
                count={totals.unpriced}
                what="unpriced"
                title="Rows without a quote are not in this sum."
              />
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {totals.dailyPnl == null ? (
                <Unknown title="No daily PnL figures in scope" />
              ) : (
                <InlinePnl value={totals.dailyPnl}>{fmtUsd(totals.dailyPnl)}</InlinePnl>
              )}
              <MissingNote
                count={totals.noDaily}
                what="without PnL"
                title="Rows with no daily PnL figure are not in this sum."
              />
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {totals.totalPnl == null ? (
                <Unknown title="No total PnL figures in scope" />
              ) : (
                <InlinePnl value={totals.totalPnl}>{fmtUsd(totals.totalPnl)}</InlinePnl>
              )}
              <MissingNote
                count={totals.noTotal}
                what="without PnL"
                title="Rows with no total PnL figure are not in this sum."
              />
            </DenseTableCell>
          </GrandTotalRow>
        </DenseTableBody>
      </DenseDataTable>
      <p className="mt-1 text-dense-meta text-muted-foreground">
        {`Cash-like ${fmtUsd(cashLikeTotal)} · buying power ${buyingPower == null ? '—' : fmtUsd(buyingPower)}. ${INCOME_ETF_NOTE}`}
      </p>
    </div>
  )
}
