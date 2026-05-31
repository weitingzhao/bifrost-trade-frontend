/** Route prefixes where the global market status bar is shown (Legacy: live / strategy / replay / research). */
export const GLOBAL_MARKET_STRIP_PREFIXES = [
  '/market',
  '/portfolio',
  '/strategy',
  '/research',
] as const

export function shouldShowGlobalMarketStrip(pathname: string): boolean {
  return GLOBAL_MARKET_STRIP_PREFIXES.some(p => pathname.startsWith(p))
}
