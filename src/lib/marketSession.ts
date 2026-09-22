/**
 * Which part of the trading session it is, in the market's own zone.
 *
 * Moved out of `pages/home/today/todayModel.ts` when Live became the second
 * reader (§14.2). A page in `pages/market/` may not import from
 * `pages/home/`, and more to the point two pages disagreeing about whether it
 * is still the closing auction is exactly the kind of split a shared rule
 * prevents.
 */

export type MarketSessionSegment = 'pre' | 'rth' | 'close'

/**
 * Which part of the session a wall-clock `HH:MM` falls in.
 *
 * After the bell the answer is `pre` rather than `close`: the last half hour
 * is over, and the next thing that needs a decision is the next open. Marking
 * Pre-close as the live window at ten at night would put the reader's eye on a
 * deadline that has already passed.
 */
export function sessionSegment(hhmm: string): MarketSessionSegment {
  if (hhmm < '09:30') return 'pre'
  if (hhmm < '15:30') return 'rth'
  if (hhmm < '16:00') return 'close'
  return 'pre'
}

/** What to call the moment, in the register the Home strip uses. */
export function sessionLabel(hhmm: string): string {
  if (hhmm < '04:00') return 'overnight'
  if (hhmm < '09:30') return 'pre-open'
  if (hhmm < '15:30') return 'regular hours'
  if (hhmm < '16:00') return 'closing auction'
  return 'after hours'
}

/** The short tag the tape wears: `RTH`, `PRE`, `CLOSE`, `AH`. */
export function sessionTag(hhmm: string): string {
  if (hhmm < '04:00') return 'OVERNIGHT'
  if (hhmm < '09:30') return 'PRE'
  if (hhmm < '15:30') return 'RTH'
  if (hhmm < '16:00') return 'CLOSE'
  return 'AH'
}

/**
 * Now as `HH:MM` in New York.
 *
 * Read once by the caller and held in state — a render must not watch a
 * moving hand, and the session a page organises itself by is the market's,
 * not the machine's.
 */
export function etWallClock(now: Date = new Date()): string {
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/New_York',
  })
}
