/**
 * ＋ Plan this — exit verb from Symbol / Chain into Trade › Plans.
 *
 * Queues an advisory handoff (source · rule · contract) and opens Plans.
 * D10-safe: no order placement, no `ib:operator:cmd`.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { plansPath, pushPlanHandoff } from '@/lib/planHandoff'

export interface PlanThisButtonProps {
  symbol: string
  source: string
  sourceLabel: string
  rule?: string | null
  contract?: string | null
  note?: string | null
  className?: string
  /** Dense text button (default) or a primary accent for the page header. */
  variant?: 'default' | 'primary'
}

export function PlanThisButton({
  symbol,
  source,
  sourceLabel,
  rule,
  contract,
  note,
  className,
  variant = 'default',
}: PlanThisButtonProps) {
  const navigate = useNavigate()
  const [flash, setFlash] = useState(false)
  const sym = symbol.trim().toUpperCase()
  const disabled = !sym

  function onClick() {
    if (disabled) return
    const item = pushPlanHandoff({
      symbol: sym,
      source,
      sourceLabel,
      rule,
      contract,
      note,
    })
    setFlash(true)
    window.setTimeout(() => setFlash(false), 1200)
    navigate(plansPath(item.id))
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={variant === 'primary' ? 'default' : 'outline'}
      disabled={disabled}
      onClick={onClick}
      className={cn('h-7 gap-1 px-2 text-dense-meta', className)}
      title={
        disabled
          ? 'Pick a symbol first'
          : `Queue a plan draft for ${sym} (advisory — observe-only)`
      }
    >
      {flash ? 'Queued →' : '＋ Plan this'}
    </Button>
  )
}
