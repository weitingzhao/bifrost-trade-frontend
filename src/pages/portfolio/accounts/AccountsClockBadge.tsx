import { cn } from '@/lib/utils'
import type { ClockReading } from '@/utils/accountsClocks'
import { accountsUi, clockToneDot, clockToneText } from './accountsUi'

export function AccountsClockBadge({ reading }: { reading: ClockReading }) {
  return (
    <span className={accountsUi.clockChip} title={reading.title}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', clockToneDot(reading.pullTone))} />
      <span className="whitespace-nowrap">{reading.name}</span>
      <span className={cn('font-mono font-normal whitespace-nowrap', clockToneText(reading.pullTone))}>
        {reading.pull}
      </span>
      <span className={accountsUi.clockSep} aria-hidden>
        ·
      </span>
      <span className={cn('font-mono font-normal whitespace-nowrap', clockToneText(reading.recTone))}>
        {reading.rec}
      </span>
    </span>
  )
}
