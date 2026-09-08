/**
 * Where a name goes when you want to look at it yourself.
 *
 * The Autopilot hands the Owner a rated candidate; the next question is
 * always "let me see that for myself", and until now that meant reading the
 * symbol off a memo, switching seats by hand, opening a hub and typing it in
 * again. These are the stops that answer that question, each one a route the
 * Workbench already has, with the symbol and the session's date carried in
 * the query string the hubs already read (`useResearchContext`).
 *
 * Crossing here also changes the seat: arriving on a Workbench page with an
 * Autopilot menu is the same disorientation the seats exist to remove.
 */
import type { ResearchSeat } from '@/lib/research/seat'

export interface SymbolStop {
  id: string
  label: string
  /** Why this stop, for the Owner deciding which one to open. */
  why: string
  to: string
  /** The posture this stop belongs to — arriving switches the menu to it. */
  seat: ResearchSeat
}

function withSymbol(path: string, symbol: string, date?: string | null): string {
  const q = new URLSearchParams()
  q.set('symbol', symbol)
  if (date) q.set('date', date)
  return `${path}${path.includes('?') ? '&' : '?'}${q.toString()}`
}

/**
 * The Workbench stops for one symbol, in the order a candidate is usually
 * questioned: is the price where the memo says, how is its volatility priced,
 * who is on the other side, what has this signal been worth before.
 */
export function workbenchStops(symbolRaw: string, date?: string | null): SymbolStop[] {
  const symbol = symbolRaw.trim().toUpperCase()
  if (!symbol) return []
  return [
    {
      id: 'vol-regime',
      label: 'Vol Regime',
      why: 'IV rank, VRP and skew — whether its volatility is priced rich or cheap right now.',
      to: withSymbol('/research/vol-regime?view=iv-rank', symbol, date),
      seat: 'workbench',
    },
    {
      id: 'dealer-levels',
      label: 'Dealer Levels',
      why: 'Gamma and the put wall — the levels that pin or accelerate a move.',
      to: withSymbol('/research/dealer-levels', symbol, date),
      seat: 'workbench',
    },
    {
      id: 'scenario',
      label: 'Scenario Model',
      why: 'The forecast path and the playbook for this regime.',
      to: withSymbol('/research/scenario', symbol, date),
      seat: 'workbench',
    },
    {
      id: 'discovery',
      label: 'Option Discovery',
      why: 'The chain itself — strikes, greeks and what a structure would cost.',
      to: withSymbol('/research/discovery', symbol, date),
      seat: 'workbench',
    },
    {
      id: 'signal-decay',
      label: 'Signal Decay',
      why: 'What this kind of signal has actually been worth on this name.',
      to: `/research/signal-decay/${encodeURIComponent(symbol)}`,
      seat: 'workbench',
    },
  ]
}
