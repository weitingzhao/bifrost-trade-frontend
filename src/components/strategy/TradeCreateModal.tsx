import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createTrade } from '@/api/strategy'
import { useOpportunities } from '@/hooks/useStrategies'
import { getLedgerAccountTabs } from '@/lib/ledgerAccountTabs'
import type { StatusResponse } from '@/types/monitor'
import {
  tradeCreateAccountPillActiveClass,
  tradeCreateAccountPillClass,
  tradeCreateAccountPillsClass,
  tradeCreateActionsClass,
  tradeCreateDateInputClass,
  tradeCreateDialogClass,
  tradeCreateErrorClass,
  tradeCreateFormRowLabelClass,
  tradeCreateHeaderClass,
  tradeCreateInputClass,
  tradeCreateOptionalSectionClass,
  tradeCreateSectionClass,
  tradeCreateSelectTriggerClass,
  tradeCreateTitleClass,
} from './tradeCreateModalUi'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { etTodayIso } from '@/lib/freshness'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: StatusResponse | undefined
}

function TradeCreateFormRow({
  label,
  children,
  className,
}: {
  label: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <span className={tradeCreateFormRowLabelClass}>{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function TradeCreateModal({ open, onOpenChange, status }: Props) {
  const queryClient = useQueryClient()
  const { data: oppsData } = useOpportunities()

  const eventAccounts = useMemo(() => getLedgerAccountTabs(status), [status])

  const [opportunityId, setOpportunityId] = useState<string>('')
  const [accountIdPick, setAccountIdPick] = useState<string>('')
  const [openedAt, setOpenedAt] = useState<string>(() => etTodayIso())
  const [label, setLabel] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accountId = useMemo(() => {
    const ids = eventAccounts.map((t) => t.id)
    if (ids.length === 0) return ''
    if (accountIdPick && ids.includes(accountIdPick)) return accountIdPick
    return ids[0] ?? ''
  }, [eventAccounts, accountIdPick])

  function resetForm() {
    setOpportunityId('')
    setAccountIdPick('')
    setLabel('')
    setOpenedAt(etTodayIso())
    setError(null)
  }

  function handleDialogOpenChange(next: boolean) {
    if (!next) resetForm()
    onOpenChange(next)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!opportunityId || !accountId) {
      setError('Opportunity and Account are required.')
      return
    }
    const dateStr = openedAt.trim()
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      setError('Opened at (date) is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createTrade({
        strategy_opportunity_id: Number(opportunityId),
        account_id: accountId,
        opened_at: `${dateStr}T12:00:00.000Z`,
        label: label.trim() || undefined,
      })
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trades.list })
      handleDialogOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trade.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className={tradeCreateDialogClass}>
        <DialogHeader className={tradeCreateHeaderClass}>
          <DialogTitle className={tradeCreateTitleClass}>Create trade</DialogTitle>
        </DialogHeader>

        {error ? <p className={tradeCreateErrorClass}>{error}</p> : null}

        <form className="flex flex-col" onSubmit={handleSubmit}>
          <section className={cn(tradeCreateSectionClass, 'mb-4')}>
            <TradeCreateFormRow label="Opportunity">
              <Select value={opportunityId} onValueChange={setOpportunityId} required>
                <SelectTrigger className={tradeCreateSelectTriggerClass}>
                  <SelectValue placeholder="— Select opportunity —" />
                </SelectTrigger>
                <SelectContent>
                  {(oppsData?.items ?? []).map((opp) => (
                    <SelectItem
                      key={opp.strategy_opportunity_id}
                      value={String(opp.strategy_opportunity_id)}
                    >
                      {opp.name ?? `#${opp.strategy_opportunity_id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TradeCreateFormRow>

            <TradeCreateFormRow label="Account">
              {eventAccounts.length === 0 ? (
                <p className="py-1 text-xs text-muted-foreground">
                  Configure Event Account in Settings → IB Connection
                </p>
              ) : (
                <div
                  className={tradeCreateAccountPillsClass}
                  role="radiogroup"
                  aria-label="Event Account"
                  aria-required="true"
                >
                  {eventAccounts.map((t) => {
                    const active = accountId === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        title={t.label}
                        className={cn(
                          tradeCreateAccountPillClass,
                          active && tradeCreateAccountPillActiveClass,
                        )}
                        onClick={() => setAccountIdPick(t.id)}
                      >
                        {t.id}
                      </button>
                    )
                  })}
                </div>
              )}
            </TradeCreateFormRow>

            <TradeCreateFormRow label="Opened at">
              <Input
                type="date"
                required
                value={openedAt}
                className={tradeCreateDateInputClass}
                onChange={(e) => setOpenedAt(e.target.value)}
              />
            </TradeCreateFormRow>
          </section>

          <section className={tradeCreateOptionalSectionClass}>
            <TradeCreateFormRow label="Label (optional)">
              <Input
                className={tradeCreateInputClass}
                placeholder="e.g. Straddle 2025-03"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </TradeCreateFormRow>
          </section>

          <div className={tradeCreateActionsClass}>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || eventAccounts.length === 0}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
