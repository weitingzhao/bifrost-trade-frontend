import { useMemo } from 'react'
import {
  classifyExpiration,
  expirationDaysFromToday,
  expirationKindLabel,
} from '@/utils/optionDiscovery/expirationMeta'
import { cn } from '@/lib/utils'

export type OdChainExpiryBubblePickerProps = {
  options: string[]
  value: string
  onChange: (expiration: string) => void
  disabled?: boolean
  stripId?: string
  'aria-label'?: string
}

export function OdChainExpiryBubblePicker({
  options,
  value,
  onChange,
  disabled = false,
  stripId: stripIdProp,
  'aria-label': ariaLabel = 'Chain and quotes expiration date',
}: OdChainExpiryBubblePickerProps) {
  const effective = useMemo(() => {
    if (options.length === 0) return ''
    return options.includes(value) ? value : options[0]
  }, [options, value])

  const isDisabled = disabled || options.length === 0

  return (
    <div
      id={stripIdProp}
      className="flex min-w-0 flex-wrap gap-1.5"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map(exp => {
        const kind = classifyExpiration(exp)
        const sel = exp === effective
        return (
          <button
            key={exp}
            type="button"
            role="radio"
            aria-checked={sel}
            className={cn(
              'inline-flex flex-col items-center gap-0.5 rounded-full border px-2.5 py-1',
              'border-border/80 bg-secondary text-foreground transition-colors',
              'hover:border-primary/35 hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              sel && 'border-primary/55 bg-accent/15',
            )}
            disabled={isDisabled}
            onClick={() => onChange(exp)}
            title={`${exp} · ${expirationDaysFromToday(exp)}`}
          >
            <span className="inline-flex flex-nowrap items-baseline whitespace-nowrap">
              <span className="text-xs font-semibold tabular-nums">{exp}</span>
              <span className="text-muted-foreground text-[0.65rem]" aria-hidden>
                {' '}
                ·{' '}
              </span>
              <span className="text-[0.65rem] text-muted-foreground tabular-nums">
                {expirationDaysFromToday(exp)}
              </span>
            </span>
            <span className="flex gap-0.5" aria-hidden>
              {kind === 'weeklies' && (
                <span
                  className="rounded px-1 text-[0.6rem] font-bold bg-sky-500/20 text-sky-400"
                  title={expirationKindLabel(kind)}
                >
                  W
                </span>
              )}
              {kind === 'quarterlies' && (
                <span
                  className="rounded px-1 text-[0.6rem] font-bold bg-violet-500/20 text-violet-400"
                  title={expirationKindLabel(kind)}
                >
                  Q
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
