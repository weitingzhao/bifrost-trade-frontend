import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { createStrategyInstance } from '@/api/strategy'
import { useOpportunities } from '@/hooks/useStrategies'
import type { StatusResponse } from '@/types/monitor'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: StatusResponse | undefined
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function InstanceCreateModal({ open, onOpenChange, status }: Props) {
  const queryClient = useQueryClient()
  const { data: oppsData } = useOpportunities()

  const accounts = (status?.portfolio?.accounts ?? [])
    .map((a) => a.account_id)
    .filter((id): id is string => !!id)

  const [opportunityId, setOpportunityId] = useState<string>('')
  const [accountId, setAccountId] = useState<string>(accounts[0] ?? '')
  const [openedAt, setOpenedAt] = useState<string>(todayIso())
  const [label, setLabel] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!opportunityId || !accountId) {
      setError('Opportunity and Account are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createStrategyInstance({
        strategy_opportunity_id: Number(opportunityId),
        account_id: accountId,
        opened_at: openedAt ? new Date(openedAt).toISOString() : undefined,
        label: label.trim() || undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ['strategy', 'instances'] })
      onOpenChange(false)
      setOpportunityId('')
      setLabel('')
      setOpenedAt(todayIso())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create instance.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Strategy Instance</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Opportunity <span className="text-destructive">*</span></Label>
            <Select value={opportunityId} onValueChange={setOpportunityId}>
              <SelectTrigger>
                <SelectValue placeholder="Select opportunity…" />
              </SelectTrigger>
              <SelectContent>
                {(oppsData?.items ?? []).map((opp) => (
                  <SelectItem key={opp.strategy_opportunity_id} value={String(opp.strategy_opportunity_id)}>
                    {opp.name}
                    {opp.structure_name && (
                      <span className="ml-1.5 text-muted-foreground text-xs">· {opp.structure_name}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Account <span className="text-destructive">*</span></Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account…" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((id) => (
                  <SelectItem key={id} value={id}>{id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Opened At</Label>
            <Input
              type="date"
              value={openedAt}
              onChange={(e) => setOpenedAt(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Label <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              placeholder="e.g. May cycle"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
