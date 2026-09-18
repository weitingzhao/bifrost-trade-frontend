import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  allocationsFormChecklistClass,
  allocationsFormChecklistItemClass,
  allocationsFormFieldClass,
  allocationsFormHintClass,
  allocationsFormLimitsGridClass,
} from '@/components/strategy/allocations/allocationsFormUi'
import { useOpportunities, useGateSafety } from '@/hooks/useStrategies'
import { createAllocation, updateAllocation, fetchAllocation } from '@/api/strategy'
import type { AllocationPayload, StrategyAllocation } from '@/types/positions'
import { QUERY_KEYS } from '@/constants/queryKeys'

interface FormState {
  name: string
  opportunityIds: number[]
  gateSafetyId: number | null
  maxPositions: string
  maxBpPct: string
  /**
   * On the books — whether this allocation may be picked at all. A different
   * fact from the one the daemon's config holds about which allocation it
   * runs, which is `Set active` on Trade › Rules. Edited here because it is
   * part of the definition; until 2026-09-18 it was editable on the retiring
   * Strategy › Allocations page and nowhere else, so an allocation taken off
   * the books could not be put back from the chain.
   */
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  opportunityIds: [],
  gateSafetyId: null,
  maxPositions: '',
  maxBpPct: '',
  isActive: true,
}

function allocationToForm(a: StrategyAllocation): FormState {
  return {
    name: a.name,
    opportunityIds: a.strategy_opportunity_ids ?? [],
    gateSafetyId: a.gate_safety_strategy_id ?? null,
    maxPositions: a.max_positions != null ? String(a.max_positions) : '',
    maxBpPct: a.max_bp_pct != null ? String(a.max_bp_pct) : '',
    isActive: a.is_active ?? true,
  }
}

function formToPayload(f: FormState): AllocationPayload {
  return {
    name: f.name.trim(),
    strategy_opportunity_ids: f.opportunityIds,
    gate_safety_strategy_id: f.gateSafetyId,
    max_positions: f.maxPositions !== '' ? Number(f.maxPositions) : null,
    max_bp_pct: f.maxBpPct !== '' ? Number(f.maxBpPct) : null,
    is_active: f.isActive,
  }
}

function createPayload(f: FormState): AllocationPayload {
  return formToPayload(f)
}

export interface AllocationFormModalProps {
  mode: 'create' | 'edit'
  editId: number | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function AllocationFormModal({
  mode,
  editId,
  open,
  onClose,
  onSaved,
}: AllocationFormModalProps) {
  const qc = useQueryClient()
  const { data: oppsData } = useOpportunities()
  const { data: gateData } = useGateSafety()
  const opportunities = oppsData?.items ?? []
  const gateSets = gateData?.items ?? []

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null)
    if (mode === 'edit' && editId != null) {
      setLoadingEdit(true)
      fetchAllocation(editId)
        .then((a) => setForm(allocationToForm(a)))
        .catch((e) => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => setLoadingEdit(false))
    } else {
      setForm(EMPTY_FORM)
    }
  }, [open, mode, editId])

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose()
  }

  const mutation = useMutation({
    mutationFn: async (payload: AllocationPayload) => {
      if (mode === 'create') return createAllocation(payload)
      await updateAllocation(editId!, payload)
      return { strategy_allocation_id: editId! }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.strategy.allocations })
      onSaved()
      onClose()
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  })

  const toggleOpp = (id: number) =>
    setForm((f) => ({
      ...f,
      opportunityIds: f.opportunityIds.includes(id)
        ? f.opportunityIds.filter((x) => x !== id)
        : [...f.opportunityIds, id],
    }))

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    setError(null)
    mutation.mutate(mode === 'create' ? createPayload(form) : formToPayload(form))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'New allocation' : 'Edit allocation'}
          </DialogTitle>
        </DialogHeader>

        {loadingEdit ? (
          <div className="space-y-2 py-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className={allocationsFormFieldClass}>
              <Label htmlFor="alloc-name">Name</Label>
              <Input
                id="alloc-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Allocation name"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Opportunities</Label>
              <p className={allocationsFormHintClass}>
                Select one or more opportunities to include in this allocation.
              </p>
              {opportunities.length === 0 ? (
                <p className={`${allocationsFormHintClass} italic`}>No opportunities found.</p>
              ) : (
                <div className={allocationsFormChecklistClass}>
                  {opportunities.map((opp) => (
                    <div key={opp.strategy_opportunity_id} className={allocationsFormChecklistItemClass}>
                      <input
                        id={`opp-${opp.strategy_opportunity_id}`}
                        type="checkbox"
                        className="h-4 w-4 rounded border-border accent-primary"
                        checked={form.opportunityIds.includes(opp.strategy_opportunity_id)}
                        onChange={() => toggleOpp(opp.strategy_opportunity_id)}
                      />
                      <Label
                        htmlFor={`opp-${opp.strategy_opportunity_id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {opp.name}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          #{opp.strategy_opportunity_id}
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={allocationsFormFieldClass}>
              <Label>Gate safety</Label>
              <Select
                value={form.gateSafetyId != null ? String(form.gateSafetyId) : '__none__'}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    gateSafetyId: v === '__none__' ? null : Number(v),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None</SelectItem>
                  {gateSets.map((g) => (
                    <SelectItem
                      key={g.gate_safety_strategy_id}
                      value={String(g.gate_safety_strategy_id)}
                    >
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Limits (optional)</Label>
              <div className={allocationsFormLimitsGridClass}>
                <div className={allocationsFormFieldClass}>
                  <Label htmlFor="alloc-maxpos" className="text-xs text-muted-foreground">
                    Max positions
                  </Label>
                  <Input
                    id="alloc-maxpos"
                    type="number"
                    min={0}
                    placeholder="—"
                    value={form.maxPositions}
                    onChange={(e) => setForm((f) => ({ ...f, maxPositions: e.target.value }))}
                  />
                </div>
                <div className={allocationsFormFieldClass}>
                  <Label htmlFor="alloc-maxbp" className="text-xs text-muted-foreground">
                    Max BP %
                  </Label>
                  <Input
                    id="alloc-maxbp"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="—"
                    value={form.maxBpPct}
                    onChange={(e) => setForm((f) => ({ ...f, maxBpPct: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">On the books</Label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                  aria-label="On the books"
                />
                <span>{form.isActive ? 'Available' : 'Off the books'}</span>
              </label>
              <p className="text-xs text-muted-foreground text-pretty">
                Whether it may be picked at all — a plan under an allocation that is off the books runs outside the
                rules. Which allocation the daemon actually runs is a separate act: Set active, on Trade › Rules.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending || loadingEdit}>
            {mutation.isPending ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
