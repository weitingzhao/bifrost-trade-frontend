/**
 * When this objective runs next — the design's first KPI.
 *
 * `Research Objective.dc.html` prints `13:30Z · in 2h 10m`, and the number is
 * the objective's own cadence rather than anything a run reports. This side
 * stores the cadence as a **named slot** (`daily_open`, `daily_eod`, `weekly`,
 * `adhoc`), so the clock time is a property of the slot, not of the row, and
 * it lives here beside the one table that already names them.
 *
 * Only `daily_open` has a stated time — `SCHEDULES` calls it *weekdays 13:30
 * UTC*, which is the US cash open. The others resolve to a marked absence
 * rather than a guess: `daily_eod` has no stated close time on this side,
 * `weekly` has no stated weekday, and `adhoc` runs only when you press the
 * button. A made-up minute on a page about when a machine acts would be worse
 * than a dash.
 */

/** UTC hour and minute, when the slot states one. */
const SLOT_TIME: Record<string, { h: number; m: number } | null> = {
  daily_open: { h: 13, m: 30 },
  daily_eod: null,
  weekly: null,
  adhoc: null,
}

export interface NextRun {
  /** `13:30Z`, or `—` when the slot does not state a time. */
  at: string
  /** `in 2h 10m`, or why there is no countdown. */
  sub: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Weekdays only: `daily_open` is *weekdays* 13:30 UTC, so Saturday waits. */
function nextWeekdayAt(now: Date, h: number, m: number): Date {
  const at = new Date(now)
  at.setUTCHours(h, m, 0, 0)
  if (at.getTime() <= now.getTime()) at.setUTCDate(at.getUTCDate() + 1)
  while (at.getUTCDay() === 0 || at.getUTCDay() === 6) at.setUTCDate(at.getUTCDate() + 1)
  return at
}

export function nextRun(schedule: string, status: string, now: number): NextRun {
  if (status !== 'active') return { at: '—', sub: 'archived' }
  const slot = SLOT_TIME[schedule]
  if (slot === undefined) return { at: '—', sub: `unknown schedule · ${schedule}` }
  if (slot === null) {
    return {
      at: '—',
      sub: schedule === 'adhoc' ? 'Run now only' : `${schedule} · no stated time`,
    }
  }
  const at = nextWeekdayAt(new Date(now), slot.h, slot.m)
  const mins = Math.max(0, Math.round((at.getTime() - now) / 60_000))
  const h = Math.floor(mins / 60)
  return {
    at: `${pad(slot.h)}:${pad(slot.m)}Z`,
    sub: h >= 24 ? `in ${Math.floor(h / 24)}d ${h % 24}h` : h > 0 ? `in ${h}h ${mins % 60}m` : `in ${mins}m`,
  }
}
