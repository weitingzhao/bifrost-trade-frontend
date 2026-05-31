/** Build deep-link URL for Option Discovery from a position row. */
export function buildDiscoveryUrl(symbol: string, expiration?: string | null): string {
  const params = new URLSearchParams()
  const sym = symbol.trim().toUpperCase()
  if (sym) params.set('symbol', sym)
  const exp = expiration?.trim()
  if (exp) params.set('expiration', exp)
  const q = params.toString()
  return q ? `/research/discovery?${q}` : '/research/discovery'
}
