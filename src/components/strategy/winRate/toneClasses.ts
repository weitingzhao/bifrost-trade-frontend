import type { ProfitLossTone, WinPctTone } from '@/utils/winRate'

const PROFIT_CLASS = 'text-emerald-600 dark:text-emerald-400'
const LOSS_CLASS = 'text-red-600 dark:text-red-400'
const NEUTRAL_CLASS = 'text-muted-foreground'

export function profitLossToneClass(tone: ProfitLossTone): string {
  switch (tone) {
    case 'positive':
      return PROFIT_CLASS
    case 'negative':
      return LOSS_CLASS
    case 'muted':
    default:
      return NEUTRAL_CLASS
  }
}

export function winPctToneClass(tone: WinPctTone): string {
  switch (tone) {
    case 'positive':
      return PROFIT_CLASS
    case 'negative':
      return LOSS_CLASS
    case 'dim':
    default:
      return NEUTRAL_CLASS
  }
}
