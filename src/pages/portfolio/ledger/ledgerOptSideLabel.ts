export function sideLabel(ex: { side?: string | null }): string {
  const s = (ex.side ?? '').toUpperCase()
  if (s === 'BOT' || s === 'BUY' || s === 'B') return 'Buy'
  if (s === 'SLD' || s === 'SELL' || s === 'S') return 'Sell'
  return (ex.side ?? '').trim() || '—'
}
