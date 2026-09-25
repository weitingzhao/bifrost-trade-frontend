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

/** The menu bar's four phases (design Rev .60): sunrise · sun · sunset · moon. */
export type MenubarPhase = 'PRE' | 'RTH' | 'POST' | 'CLOSED'

export interface MenubarSession {
  phase: MenubarPhase
  /** Compact time to the next boundary: `6h00` · `42m` · `2d14h`. */
  left: string
  /** What that boundary is, for the tip: `to the open` · `to the close` … */
  toWhat: string
  /** The last 30 minutes of the regular session — the countdown turns amber. */
  closing: boolean
  /** `HH:MM:SS` in New York. */
  clock: string
}

/** New York wall-clock parts of an instant. */
function nyParts(now: Date): { dow: number; h: number; m: number; s: number } {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]))
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)
  return { dow, h: Number(p.hour) % 24, m: Number(p.minute), s: Number(p.second) }
}

function compactLeft(secs: number): string {
  const mins = Math.max(0, Math.ceil(secs / 60))
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h${String(mins % 60).padStart(2, '0')}`
  return `${Math.floor(h / 24)}d${h % 24}h`
}

/**
 * The session the menu bar shows, and the time to its next boundary (design
 * Rev .60 §7): PRE 04:00 → 09:30, RTH → 16:00, POST → 20:00, then CLOSED to
 * the next weekday's 09:30. Weekends are closed; exchange holidays are not
 * modelled — the design says so, and so does the tip.
 */
export function menubarSession(now: Date = new Date()): MenubarSession {
  const { dow, h, m, s } = nyParts(now)
  const t = h * 3600 + m * 60 + s
  const at = (hh: number, mm = 0) => hh * 3600 + mm * 60
  const clock = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  const weekday = dow >= 1 && dow <= 5
  if (weekday && t >= at(4) && t < at(9, 30))
    return { phase: 'PRE', left: compactLeft(at(9, 30) - t), toWhat: 'to the open', closing: false, clock }
  if (weekday && t >= at(9, 30) && t < at(16))
    return { phase: 'RTH', left: compactLeft(at(16) - t), toWhat: 'to the close', closing: at(16) - t <= 1800, clock }
  if (weekday && t >= at(16) && t < at(20))
    return { phase: 'POST', left: compactLeft(at(20) - t), toWhat: 'to the end of after-hours', closing: false, clock }
  // Closed: to the next weekday's open.
  let days = 0
  let d = dow
  if (weekday && t < at(4)) days = 0
  else {
    do {
      days += 1
      d = (d + 1) % 7
    } while (d === 0 || d === 6)
  }
  const secs = days * 86_400 + at(9, 30) - t
  return { phase: 'CLOSED', left: compactLeft(secs), toWhat: 'to the next open', closing: false, clock }
}
