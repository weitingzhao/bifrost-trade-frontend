/**
 * ＋ Plan this — exit verb from Symbol / Chain into Trade › Plans.
 *
 * Writes a real draft on the server (`strategy_plan`) and opens its card. It
 * used to queue into sessionStorage, which meant the plan died with the tab and
 * was invisible on any other machine; a plan is a record, so it belongs in the
 * table. D10-safe: a draft is advisory, nothing here places an order.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { usePlanAccounts } from '@/hooks/usePlanAccounts'
import { useCreateStrategyPlan } from '@/hooks/useStrategyPlans'
import { planLegsFromContract } from '@/lib/plans/planLegFromContract'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'

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
  const { defaultAccount } = usePlanAccounts()
  const create = useCreateStrategyPlan()
  const [failed, setFailed] = useState<string | null>(null)
  const sym = symbol.trim().toUpperCase()
  const disabled = !sym || !defaultAccount || create.isPending

  function onClick() {
    if (disabled) return
    setFailed(null)
    create.mutate(
      {
        account_id: defaultAccount,
        symbol: sym,
        structure_label: 'Unspecified',
        qty: 1,
        legs: planLegsFromContract(contract),
        rationale: note ?? null,
        source_kind: 'symbol',
        source_ref: source,
        // Where the reading came from, so the card can walk back to it.
        source: [
          { kind: 'where', text: sourceLabel, to: withSymbolParam(SYMBOL_PATH, sym) },
          ...(rule ? [{ kind: 'rule', text: rule }] : []),
          ...(contract ? [{ kind: 'contract', text: contract }] : []),
        ],
      },
      {
        onSuccess: (created) => navigate(`/trade/plans?plan=${created.strategy_plan_id}`),
        onError: (error) => setFailed((error as Error).message),
      },
    )
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
        !sym
          ? 'Pick a symbol first'
          : !defaultAccount
            ? 'No account from monitor /status yet'
            : (failed ?? `Write a plan draft for ${sym} (advisory — observe-only)`)
      }
    >
      {failed ? 'Failed' : create.isPending ? 'Writing…' : '＋ Plan this'}
    </Button>
  )
}
