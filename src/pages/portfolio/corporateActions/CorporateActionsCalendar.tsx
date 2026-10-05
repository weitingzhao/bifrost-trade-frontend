/**
 * Corporate Actions · the Next 30 days calendar — book and watchlist, every
 * event declared inside the window, and (measured 2026-09-26) the ones
 * declared past it, listed under a line rather than dropped.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtIsoDateToken } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  CALENDAR_DAYS,
  CORPORATE_ACTIONS_UNRECORDED,
  narrowToSymbol,
  type BookEvent,
  type FeedReach,
} from './corporateActionsModel'
import { AMBER_EDGE, amountLabel, FOOT, fmtShares } from './corporateActionsFormat'
import { KindTag, Ticker } from './corporateActionsMarks'

type Show = 'all' | 'book' | 'reshaping'

function shown(list: readonly BookEvent[], show: Show, bookSymbols: ReadonlySet<string>, symbol: string): BookEvent[] {
  const named = narrowToSymbol(list, symbol)
  if (show === 'book') return named.filter((e) => bookSymbols.has(e.symbol))
  if (show === 'reshaping') return named.filter((e) => e.touchesAContract)
  return named
}

function EventRow({ e, bookSymbols }: { e: BookEvent; bookSymbols: ReadonlySet<string> }) {
  const held = bookSymbols.has(e.symbol)
  return (
    <tr>
      <td className={cn(positionsUi.td, 'pl-2 text-left')}>
        <Ticker symbol={e.symbol} />
        {held ? null : (
          <span className="ml-1.5 font-sans text-dense-meta font-normal text-muted-foreground">watchlist</span>
        )}
      </td>
      <td className={cn(positionsUi.td, 'text-left font-sans')}>
        <KindTag e={e} />
      </td>
      <td className={cn(positionsUi.td, 'text-foreground')}>
        {fmtIsoDateToken(e.exDate ?? '')}
        {e.daysAway != null ? (
          <span className="ml-1.5 text-dense-meta text-muted-foreground">in {e.daysAway}d</span>
        ) : null}
      </td>
      <td className={cn(positionsUi.td, 'text-secondary-foreground')}>{amountLabel(e)}</td>
      <td className={cn(positionsUi.td, e.shares ? 'text-foreground' : 'text-muted-foreground')}>
        {e.shares ? fmtShares(e.shares) : held ? 'legs only' : 'not held'}
      </td>
      <td className={cn(positionsUi.td, 'text-left font-sans', e.touchesAContract ? 'text-warning' : 'text-muted-foreground')}>
        {e.touchesAContract ? 'yes — see above' : 'no open leg'}
      </td>
      <td className={cn(positionsUi.td, 'text-left font-sans text-muted-foreground')}>
        {e.kind === 'dividend' ? (
          <Link to="/portfolio/transfer" className={positionsUi.link}>
            cash → Transfer &amp; Pay
          </Link>
        ) : (
          <Link to="/portfolio/positions" className={positionsUi.link}>
            Positions
          </Link>
        )}
      </td>
    </tr>
  )
}

export function CorporateActionsCalendar({
  ahead,
  beyond,
  reach,
  bookSymbols,
  symbol = '',
  onClearSymbol,
}: {
  /** Declared inside the window, nearest first. */
  ahead: readonly BookEvent[]
  /** Declared past the window, nearest first. */
  beyond: readonly BookEvent[]
  reach: FeedReach
  bookSymbols: ReadonlySet<string>
  /** The top bar's symbol (`?symbol=`): the rows narrow to it. */
  symbol?: string
  onClearSymbol?: () => void
}) {
  // The Show filter belongs to this panel alone, so it stays in its head (§17.3).
  const [show, setShow] = useState<Show>('all')
  const rows = useMemo(() => shown(ahead, show, bookSymbols, symbol), [ahead, show, bookSymbols, symbol])
  const later = useMemo(() => shown(beyond, show, bookSymbols, symbol), [beyond, show, bookSymbols, symbol])
  const empty = ahead.length === 0

  return (
    <section
      className={positionsUi.panel}
      style={empty ? AMBER_EDGE : undefined}
      aria-label={`Next ${CALENDAR_DAYS} days`}
    >
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.panelTitle}>Next {CALENDAR_DAYS} days</span>
        <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
          {empty
            ? 'nothing declared inside the window, which is not nothing coming'
            : `${rows.length} of ${ahead.length} events`}
        </span>
        {empty ? (
          <DenseTag variant="warning" size="cell">
            {reach.ahead === 0 ? '⚠ none declared ahead' : `⚠ none inside ${CALENDAR_DAYS} days`}
          </DenseTag>
        ) : null}
        <span className="ml-auto inline-flex items-center gap-2">
          <span className={positionsUi.cap}>Show</span>
          <SegmentControl
            size="xs"
            ariaLabel="Which events"
            value={show}
            onChange={(v) => setShow(v as Show)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'book', label: 'Book only' },
              { value: 'reshaping', label: 'Reshaping' },
            ]}
          />
        </span>
      </header>
      {empty ? (
        <p className="m-0 px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty">
          {reach.ahead === 0
            ? `${reach.rows} rows reached ${reach.covered} of the ${reach.asked} names this book touches or watches, and not one of them is dated after today. The pull that fetched them asks the whole market for a −7 / +60 day window every night, so this is not the feed failing to look ahead — none of these issuers has declared its next ex-date yet.`
            : `${reach.rows} rows reached ${reach.covered} of the ${reach.asked} names this book touches or watches; ${reach.ahead} ${reach.ahead === 1 ? 'is' : 'are'} dated after today, all past the ${CALENDAR_DAYS}-day window and listed under the line below. Nothing inside the window has been declared yet — which is not the same as nothing coming.`}
        </p>
      ) : null}
      <div className={cn('overflow-x-auto', empty && 'border-t border-border')}>
        {/* §14.6: seven columns, held at 980 — above the design's 900 floor. The shape stays drawn
            when no event is dated ahead, the way the other marked bands keep theirs. */}
        <table className="w-full min-w-[980px] table-fixed border-collapse">
          <colgroup>
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '22%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className={cn(positionsUi.th, 'text-left')}>Symbol</th>
              <th className={cn(positionsUi.th, 'text-left')}>Event</th>
              <th className={positionsUi.th}>Ex / effective</th>
              <th className={positionsUi.th}>Amount · ratio</th>
              <th className={positionsUi.th}>Held</th>
              <th className={cn(positionsUi.th, 'text-left')}>Reshapes a contract</th>
              <th className={cn(positionsUi.th, 'text-left')}>Where it lands</th>
            </tr>
          </thead>
          <tbody>
            {empty ? (
              <tr>
                <td className={cn(positionsUi.td, 'pl-2 text-left')}>
                  <span className="inline-flex h-4 items-center px-1.25 font-mono text-dense-micro font-bold tracking-[0.04em] text-muted-foreground mat-tag">
                    NO EVENT IN {CALENDAR_DAYS} DAYS
                  </span>
                </td>
                {['event', 'date', 'amount', 'held', 'reshapes'].map((k) => (
                  <td key={k} className={cn(positionsUi.td, 'text-muted-foreground')}>
                    —
                  </td>
                ))}
                <td className={cn(positionsUi.td, 'text-left font-sans whitespace-normal text-muted-foreground')}>
                  nothing to place — no ex-date inside the window has been declared on these names yet
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className={cn(positionsUi.td, 'pl-2 text-left font-sans text-muted-foreground')}>
                  {symbol && shown(ahead, 'all', bookSymbols, symbol).length === 0 ? (
                    <>
                      Nothing declared for {symbol} inside the window
                      {later.length > 0 ? ' — the next is listed below the line' : ''}.{' '}
                      {onClearSymbol ? (
                        <button type="button" className={positionsUi.link} onClick={onClearSymbol}>
                          Clear {symbol}
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      No event in the window matches this filter.{' '}
                      <button type="button" className={positionsUi.link} onClick={() => setShow('all')}>
                        Show all
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((e) => <EventRow key={e.key} e={e} bookSymbols={bookSymbols} />)
            )}
            {later.length > 0 ? (
              <>
                <tr>
                  <td colSpan={7} className={cn(positionsUi.td, 'pl-2 pt-2.5 text-left font-sans')}>
                    <span className={positionsUi.cap}>Declared past {CALENDAR_DAYS} days</span>
                  </td>
                </tr>
                {later.map((e) => (
                  <EventRow key={e.key} e={e} bookSymbols={bookSymbols} />
                ))}
              </>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className={cn(FOOT, 'm-0')}>{CORPORATE_ACTIONS_UNRECORDED.watchlist}</p>
    </section>
  )
}
