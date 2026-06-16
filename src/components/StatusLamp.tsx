import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

const DOT_BG: Record<string, string> = {
  green: 'bg-lamp-green shadow-[0_0_5px_var(--color-lamp-green)]',
  yellow: 'bg-lamp-yellow shadow-[0_0_5px_var(--color-lamp-yellow)]',
  red: 'bg-lamp-red shadow-[0_0_5px_var(--color-lamp-red)]',
  gray: 'bg-lamp-gray',
}

/** Pulse icon stroke + glow (legacy ib-broker-service-lamp). */
const PULSE_STYLES: Record<string, string> = {
  green:
    'text-lamp-green [filter:drop-shadow(0_0_4px_var(--color-lamp-green))_drop-shadow(0_0_8px_rgba(74,222,128,0.25))] animate-lamp-pulse-green',
  yellow:
    'text-lamp-yellow [filter:drop-shadow(0_0_4px_var(--color-lamp-yellow))_drop-shadow(0_0_8px_rgba(250,204,21,0.25))]',
  red:
    'text-lamp-red [filter:drop-shadow(0_0_4px_var(--color-lamp-red))_drop-shadow(0_0_8px_rgba(248,113,113,0.25))] animate-lamp-pulse-red',
  gray: 'text-lamp-gray',
}

function normalizeLamp(lamp: string): string {
  if (lamp === 'none') return 'gray'
  return lamp in DOT_BG ? lamp : 'gray'
}

export type StatusLampVariant = 'pulse' | 'dot'

interface StatusLampProps {
  lamp: string
  className?: string
  title?: string
  /** `pulse` = heartbeat icon (default, legacy stream health). `dot` = compact round lamp for tight nav. */
  variant?: StatusLampVariant
}

export function StatusLamp({ lamp, className, title, variant = 'pulse' }: StatusLampProps) {
  const key = normalizeLamp(lamp)

  if (variant === 'dot') {
    return (
      <span
        className={cn(
          'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
          DOT_BG[key] ?? DOT_BG.gray,
          className,
        )}
        title={title}
        role={title ? 'img' : undefined}
        aria-label={title}
        aria-hidden={title ? undefined : true}
      />
    )
  }

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      title={title}
      role="img"
      aria-label={title ?? `${key} status`}
    >
      <Activity
        className={cn('size-3.5 shrink-0', PULSE_STYLES[key] ?? PULSE_STYLES.gray)}
        strokeWidth={2}
        aria-hidden
      />
    </span>
  )
}
