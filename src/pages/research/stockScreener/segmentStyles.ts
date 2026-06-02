/** Maps group / segment keys to Tailwind classes (Legacy ssp-* parity). */
export const SEGMENT = {
  techGroupHeader: {
    vol: 'text-violet-400 border-b-violet-400/35',
    price52: 'text-emerald-400 border-b-emerald-400/35',
    sma: 'text-sky-400 border-b-sky-400/35',
    price: 'text-amber-400 border-b-amber-400/35',
  } as Record<string, string>,
  techChip: {
    vol: 'border-l-2 border-l-violet-400/60',
    price52: 'border-l-2 border-l-emerald-400/60',
    sma: 'border-l-2 border-l-sky-400/60',
    price: 'border-l-2 border-l-amber-400/60',
  } as Record<string, string>,
  fundGroupHeader: {
    eps: 'text-sky-300 border-b-sky-300/35',
    rev: 'text-lime-500 border-b-lime-500/35',
  } as Record<string, string>,
  fundChip: {
    eps: 'border-l-2 border-l-sky-300/55',
    rev: 'border-l-2 border-l-lime-500/55',
  } as Record<string, string>,
  extCard: {
    quality: 'border-l-[3px] border-l-sky-300/55',
    balance: 'border-l-[3px] border-l-lime-500/55',
    cashflow: 'border-l-[3px] border-l-emerald-400/55',
    valuation: 'border-l-[3px] border-l-amber-400/55',
    profitability: 'border-l-[3px] border-l-violet-400/55',
    efficiency: 'border-l-[3px] border-l-orange-400/55',
    sentiment: 'border-l-[3px] border-l-pink-400/55',
  } as Record<string, string>,
  extTitle: {
    quality: 'text-sky-300',
    balance: 'text-lime-500',
    cashflow: 'text-emerald-400',
    valuation: 'text-amber-400',
    profitability: 'text-violet-400',
    efficiency: 'text-orange-400',
    sentiment: 'text-pink-400',
  } as Record<string, string>,
  extChip: {
    quality: 'border-l-2 border-l-sky-300/50',
    balance: 'border-l-2 border-l-lime-500/50',
    cashflow: 'border-l-2 border-l-emerald-400/50',
    valuation: 'border-l-2 border-l-amber-400/50',
    profitability: 'border-l-2 border-l-violet-400/50',
    efficiency: 'border-l-2 border-l-orange-400/50',
    sentiment: 'border-l-2 border-l-pink-400/50',
  } as Record<string, string>,
  tierCard: {
    momentum: 'border-l-[3px] border-l-amber-500/55',
    structure: 'border-l-[3px] border-l-emerald-400/55',
    sentiment: 'border-l-[3px] border-l-pink-400/55',
  } as Record<string, string>,
  tierTitle: {
    momentum: 'text-amber-500',
    structure: 'text-emerald-400',
    sentiment: 'text-pink-400',
  } as Record<string, string>,
  tierChip: {
    momentum: 'border-l-2 border-l-amber-500/60',
    structure: 'border-l-2 border-l-emerald-400/60',
    sentiment: 'border-l-2 border-l-pink-400/60',
  } as Record<string, string>,
  tierScoreVal: {
    momentum: 'text-amber-500',
    structure: 'text-emerald-400',
    sentiment: 'text-pink-400',
  } as Record<string, string>,
  tierCountBadge: {
    momentum: 'bg-amber-500/20 text-amber-500',
    structure: 'bg-emerald-400/20 text-emerald-400',
    sentiment: 'bg-pink-400/20 text-pink-400',
  } as Record<string, string>,
  momGroupHeader: {
    oscillator: 'text-amber-500 border-b-amber-500/35',
    roc: 'text-orange-400 border-b-orange-400/35',
    rs: 'text-amber-400 border-b-amber-400/35',
    trend: 'text-emerald-400 border-b-emerald-400/35',
  } as Record<string, string>,
}
