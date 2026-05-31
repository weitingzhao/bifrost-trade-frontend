/** Convert NY wall-clock date/time to UTC ms (America/New_York). */

export function utcMsForNyWallClock(ymd: string, hour24: number, minute: number): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((ymd || '').trim())
  if (!m) return null
  const y = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10) - 1
  const d = parseInt(m[3], 10)
  const guessUtc = Date.UTC(y, mo, d, hour24, minute, 0, 0)
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  for (let offsetH = -14; offsetH <= 14; offsetH += 1) {
    const candidate = guessUtc + offsetH * 3600_000
    const parts = fmt.formatToParts(new Date(candidate))
    const py = parts.find(p => p.type === 'year')?.value
    const pm = parts.find(p => p.type === 'month')?.value
    const pd = parts.find(p => p.type === 'day')?.value
    const ph = parts.find(p => p.type === 'hour')?.value
    const pmin = parts.find(p => p.type === 'minute')?.value
    if (
      py === String(y) &&
      pm === String(mo + 1).padStart(2, '0') &&
      pd === String(d).padStart(2, '0') &&
      ph === String(hour24).padStart(2, '0') &&
      pmin === String(minute).padStart(2, '0')
    ) {
      return candidate
    }
  }
  return null
}
