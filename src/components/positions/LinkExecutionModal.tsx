import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { updateExecution } from '@/api/trading'
import { fetchStrategyInstances, createStrategyInstance } from '@/api/strategy'
import type { Execution, StrategyOpportunity } from '@/types/positions'

interface Props {
  open: boolean
  exec: Execution | null
  opportunities: StrategyOpportunity[]
  onClose: () => void
  onSuccess: () => void
}

export function LinkExecutionModal({ open, exec, opportunities, onClose, onSuccess }: Props) {
  const [oppId, setOppId] = useState<string>('')
  const [instanceMode, setInstanceMode] = useState<'existing' | 'new'>('existing')
  const [instanceId, setInstanceId] = useState<string>('')
  const [newLabel, setNewLabel] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: instancesData } = useQuery({
    queryKey: ['strategy', 'instances', oppId || null],
    queryFn: () => fetchStrategyInstances({ opportunityId: Number(oppId) }),
    enabled: !!oppId,
    staleTime: 30_000,
  })
  const instances = instancesData?.items ?? []

  const filteredOpps = exec
    ? opportunities.filter((o) => {
        const sym = exec.symbol.toUpperCase()
        return (o.symbols ?? []).some((s) => s.toUpperCase() === sym) || o.scope_type === 'watchlist_stk'
      })
    : opportunities

  async function handleSubmit() {
    if (!exec?.account_executions_id) return
    setSubmitting(true)
    setError(null)

    try {
      let finalInstanceId: number | null = null

      if (instanceMode === 'new' && oppId) {
        const res = await createStrategyInstance({
          strategy_opportunity_id: Number(oppId),
          account_id: exec.account_id,
          label: newLabel.trim() || undefined,
        })
        if (!res.ok) throw new Error(res.error ?? 'Failed to create instance')
        finalInstanceId = res.strategy_instance_id ?? null
      } else if (instanceId) {
        finalInstanceId = Number(instanceId)
      }

      const updateRes = await updateExecution(exec.account_executions_id, {
        strategy_opportunity_id: oppId ? Number(oppId) : null,
        strategy_instance_id: finalInstanceId,
      })
      if (!updateRes.ok) throw new Error(updateRes.error ?? 'Failed to link execution')

      onSuccess()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link to Strategy</DialogTitle>
        </DialogHeader>

        {exec && (
          <p className="text-xs text-muted-foreground">
            Execution: <span className="font-mono">{exec.symbol} {exec.side} {Math.abs(exec.qty)}</span>
          </p>
        )}

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Opportunity</label>
            <Select value={oppId} onValueChange={setOppId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select opportunity" />
              </SelectTrigger>
              <SelectContent>
                {filteredOpps.map((o) => (
                  <SelectItem key={o.strategy_opportunity_id} value={String(o.strategy_opportunity_id)}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {oppId && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant={instanceMode === 'existing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInstanceMode('existing')}
                >
                  Use existing
                </Button>
                <Button
                  variant={instanceMode === 'new' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInstanceMode('new')}
                >
                  + Create new
                </Button>
              </div>

              {instanceMode === 'existing' ? (
                <Select value={instanceId} onValueChange={setInstanceId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select instance" />
                  </SelectTrigger>
                  <SelectContent>
                    {instances.map((inst) => (
                      <SelectItem key={inst.strategy_instance_id} value={String(inst.strategy_instance_id)}>
                        {inst.label ?? `Instance #${inst.strategy_instance_id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Instance label (optional)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="h-8 text-sm"
                />
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !oppId}>
            {submitting ? 'Linking…' : 'Link'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
