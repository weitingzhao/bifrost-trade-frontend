/**
 * The phone's five tabs (design Rev .163, DESIGN_CONTRACTS §18.4) and which
 * one a route lights. Trade-specific: the five targets are not promoted.
 */
export type PhoneTabId = 'home' | 'trade' | 'portfolio' | 'research' | 'more'

export interface PhoneTab {
  id: PhoneTabId
  label: string
  /** Where the tab goes; More opens a sheet instead. */
  to: string | null
  /** The design's 24px stroke path (`shell-registry.js` TABS). */
  d: string
}

export const PHONE_TABS: readonly PhoneTab[] = [
  { id: 'home', label: 'Home', to: '/home', d: 'M4 11 12 4.5 20 11v9h-5.5v-5.5h-5V20H4z' },
  { id: 'trade', label: 'Trade', to: '/trade/desk', d: 'M4 8.5h14.5L15 5M20 15.5H5.5L9 19' },
  { id: 'portfolio', label: 'Portfolio', to: '/portfolio', d: 'M3.5 8h17v11.5h-17zM9 8V5h6v3M3.5 13h17' },
  { id: 'research', label: 'Research', to: '/research/symbol', d: 'M10.5 16.5a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM15 15l5 5' },
  { id: 'more', label: 'More', to: null, d: '' },
]

/** Pages that read as the day's, not a layer's: they light Home. */
const HOMEISH: ReadonlySet<string> = new Set([
  '/research/events',
  '/research/daily-brief',
  '/review/objectives',
  '/research/event-radar',
  '/market/live',
  '/home/calendar',
])

export function phoneTabOf(pathname: string): PhoneTabId {
  const p = pathname.split(/[?#]/)[0]
  if (!p || p === '/' || p === '/home' || HOMEISH.has(p)) return 'home'
  if (p.startsWith('/trade')) return 'trade'
  if (p.startsWith('/portfolio')) return 'portfolio'
  if (p.startsWith('/research') && p !== '/research/loop/decisions') return 'research'
  return 'more'
}
