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
import { createStrategyInstance } from '@/api/strategy'
import { useOpportunities } from '@/hooks/useStrategies'
import { getLedgerAccountTabs } from '@/pages/portfolio/ledger/ledgerAccountTabs'
import type { StatusResponse } from '@/types/monitor'
import {
  instanceCreateAccountPillActiveClass,
  instanceCreateAccountPillClass,
  instanceCreateAccountPillsClass,
  instanceCreateActionsClass,
  instanceCreateDateInputClass,
  instanceCreateDialogClass,
  instanceCreateErrorClass,
  instanceCreateFormRowLabelClass,
  instanceCreateHeaderClass,
  instanceCreateInputClass,
  instanceCreateOptionalSectionClass,
  instanceCreateSectionClass,
  instanceCreateSelectTriggerClass,
  instanceCreateTitleClass,
} from './instanceCreateModalUi'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: StatusResponse | undefined
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function InstanceCreateFormRow({
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
      <span className={instanceCreateFormRowLabelClass}>{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function InstanceCreateModal({ open, onOpenChange, status }: Props) {
  const queryClient = useQueryClient()
  const { data: oppsData } = useOpportunities()

  const eventAccounts = useMemo(() => getLedgerAccountTabs(status), [status])

  const [opportunityId, setOpportunityId] = useState<string>('')
  const [accountIdPick, setAccountIdPick] = useState<string>('')
  const [openedAt, setOpenedAt] = useState<string>(todayIso())
  const [label, setLabel] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
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
    setNotes('')
    setOpenedAt(todayIso())
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
      await createStrategyInstance({
        strategy_opportunity_id: Number(opportunityId),
        account_id: accountId,
        opened_at: `${dateStr}T12:00:00.000Z`,
        label: label.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ['strategy', 'instances'] })
      handleDialogOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create instance.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className={instanceCreateDialogClass}>
        <DialogHeader className={instanceCreateHeaderClass}>
          <DialogTitle className={instanceCreateTitleClass}>Create strategy instance</DialogTitle>
        </DialogHeader>

        {error ? <p className={instanceCreateErrorClass}>{error}</p> : null}

        <form className="flex flex-col" onSubmit={handleSubmit}>
          <section className={cn(instanceCreateSectionClass, 'mb-4')}>
            <InstanceCreateFormRow label="Opportunity">
              <Select value={opportunityId} onValueChange={setOpportunityId} required>
                <SelectTrigger className={instanceCreateSelectTriggerClass}>
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
            </InstanceCreateFormRow>

            <InstanceCreateFormRow label="Account">
              {eventAccounts.length === 0 ? (
                <p className="py-1 text-xs text-muted-foreground">
                  Configure Event Account in Settings → IB Connection
                </p>
              ) : (
                <div
                  className={instanceCreateAccountPillsClass}
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
                          instanceCreateAccountPillClass,
                          active && instanceCreateAccountPillActiveClass,
                        )}
                        onClick={() => setAccountIdPick(t.id)}
                      >
                        {t.id}
                      </button>
                    )
                  })}
                </div>
              )}
            </InstanceCreateFormRow>

            <InstanceCreateFormRow label="Opened at">
              <Input
                type="date"
                required
                value={openedAt}
                className={instanceCreateDateInputClass}
                onChange={(e) => setOpenedAt(e.target.value)}
              />
            </InstanceCreateFormRow>
          </section>

          <section className={instanceCreateOptionalSectionClass}>
            <InstanceCreateFormRow label="Label (optional)">
              <Input
                className={instanceCreateInputClass}
                placeholder="e.g. Straddle 2025-03"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </InstanceCreateFormRow>

            <InstanceCreateFormRow label="Notes (optional)">
              <Input
                className={instanceCreateInputClass}
                placeholder="Optional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </InstanceCreateFormRow>
          </section>

          <div className={instanceCreateActionsClass}>
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
