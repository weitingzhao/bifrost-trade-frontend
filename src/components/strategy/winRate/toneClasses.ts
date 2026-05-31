import type { ProfitLossTone, WinPctTone } from '@/utils/winRate'
import styles from '@/pages/strategy/WinRatePage.module.css'

export function kpiToneClass(tone: WinPctTone | ProfitLossTone): string {
  switch (tone) {
    case 'positive':
      return styles.kpiValuePositive
    case 'negative':
      return styles.kpiValueNegative
    case 'dim':
      return styles.kpiValueDim
    case 'muted':
      return styles.kpiValueNeutral
    default:
      return styles.kpiValueNeutral
  }
}
