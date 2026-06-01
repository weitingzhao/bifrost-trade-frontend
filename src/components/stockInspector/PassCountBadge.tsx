import { cn } from '@/lib/utils'
import styles from './stock-inspector.module.css'
import { passBadgeTone } from './stockInspectorUtils'

interface Props {
  prefix: string
  count: number | null
  total: number
}

export function PassCountBadge({ prefix, count, total }: Props) {
  const tone = passBadgeTone(count, total)
  return (
    <span
      className={cn(styles.passBadge, {
        [styles.passBadgeFull]: tone === 'full',
        [styles.passBadgePartial]: tone === 'partial',
        [styles.passBadgePoor]: tone === 'poor',
        [styles.passBadgeUnknown]: tone === 'unknown',
      })}
    >
      {prefix} {count ?? '—'}/{total}
    </span>
  )
}
