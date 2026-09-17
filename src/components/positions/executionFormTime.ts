/**
 * datetime-local values are a local wall clock with no zone.
 * Fill and parse them with the same zone (the browser's) or an open→save
 * with no edits will rewrite exec_time by the UTC offset.
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Second-precision local value for <input type="datetime-local" step="1">.
 * Minutes were not enough: every PUT sends exec_time, so re-saving a fill only to
 * change its strategy dropped the seconds Flex now reports.
 */
export function epochSecondsToDatetimeLocal(epochSec: number): string {
  const d = new Date(epochSec * 1000)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

/** Parse a datetime-local string as local wall clock → unix seconds. */
export function datetimeLocalToEpochSeconds(value: string): number {
  const ms = new Date(value).getTime()
  if (!Number.isFinite(ms)) {
    throw new Error('Invalid datetime-local value')
  }
  return Math.floor(ms / 1000)
}
