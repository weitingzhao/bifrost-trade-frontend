import { useState, useEffect } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusCircle, Pencil, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { useAllocations, useOpportunities, useGateSafety } from '@/hooks/useStrategies'
import { createAllocation, updateAllocation, fetchAllocation } from '@/api/strategy'
import type { AllocationPayload, StrategyAllocation } from '@/types/positions'
import { QUERY_KEYS } from '@/constants/queryKeys'

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  opportunityIds: number[]
  gateSafetyId: number | null
  maxPositions: string
  maxBpPct: string
}

const EMPTY_FORM: FormState = {
  name: '',
  opportunityIds: [],
  gateSafetyId: null,
  maxPositions: '',
  maxBpPct: '',
}

function allocationToForm(a: StrategyAllocation): FormState {
  return {
    name: a.name,
    opportunityIds: a.strategy_opportunity_ids ?? [],
    gateSafetyId: a.gate_safety_strategy_id ?? null,
    maxPositions: a.max_positions != null ? String(a.max_positions) : '',
    maxBpPct: a.max_bp_pct != null ? String(a.max_bp_pct) : '',
  }
}

function formToPayload(f: FormState): AllocationPayload {
  return {
    name: f.name.trim(),
    strategy_opportunity_ids: f.opportunityIds,
    gate_safety_strategy_id: f.gateSafetyId,
    max_positions: f.maxPositions !== '' ? Number(f.maxPositions) : null,
    max_bp_pct: f.maxBpPct !== '' ? Number(f.maxBpPct) : null,
  }
}

function createPayload(f: FormState): AllocationPayload {
  return { ...formToPayload(f), is_active: true }
}

// ── Allocation form dialog ────────────────────────────────────────────────────

interface FormDialogProps {
  mode: 'create' | 'edit'
  editId: number | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

function AllocationFormDialog({ mode, editId, open, onClose, onSaved }: FormDialogProps) {
  const qc = useQueryClient()
  const { data: oppsData } = useOpportunities()
  const { data: gateData } = useGateSafety()
  const opportunities = oppsData?.items ?? []
  const gateSets = gateData?.items ?? []

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch existing data whenever the dialog opens in edit mode.
  // onOpenChange(true) is NOT called when the parent sets open=true on a
  // controlled Dialog, so useEffect is the correct place to react to it.
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null)
    if (mode === 'edit' && editId != null) {
      setLoadingEdit(true)
      fetchAllocation(editId)
        .then(a => setForm(allocationToForm(a)))
        .catch(e => setError(e instanceof Error ? e.message : String(e)))
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
    setForm(f => ({
      ...f,
      opportunityIds: f.opportunityIds.includes(id)
        ? f.opportunityIds.filter(x => x !== id)
        : [...f.opportunityIds, id],
    }))

  const handleSubmit = () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    setError(null)
    mutation.mutate(mode === 'create' ? createPayload(form) : formToPayload(form))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'New allocation' : `Edit allocation`}
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

            {/* Name */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="alloc-name">Name</Label>
                <Input
                  id="alloc-name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Allocation name"
                />
              </div>
            </div>

            {/* Opportunities */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Opportunities</Label>
              <p className="text-xs text-muted-foreground">
                Select one or more opportunities to include in this allocation.
              </p>
              {opportunities.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No opportunities found.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2 space-y-1.5">
                  {opportunities.map(opp => (
                    <div key={opp.strategy_opportunity_id} className="flex items-center gap-2">
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
                        <span className="ml-1.5 text-xs text-muted-foreground">#{opp.strategy_opportunity_id}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gate Safety */}
            <div className="space-y-1.5">
              <Label>Gate safety</Label>
              <Select
                value={form.gateSafetyId != null ? String(form.gateSafetyId) : '__none__'}
                onValueChange={v => setForm(f => ({ ...f, gateSafetyId: v === '__none__' ? null : Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None</SelectItem>
                  {gateSets.map(g => (
                    <SelectItem key={g.gate_safety_strategy_id} value={String(g.gate_safety_strategy_id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Limits */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Limits (optional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="alloc-maxpos" className="text-xs text-muted-foreground">
                    Max positions
                  </Label>
                  <Input
                    id="alloc-maxpos"
                    type="number"
                    min={0}
                    placeholder="—"
                    value={form.maxPositions}
                    onChange={e => setForm(f => ({ ...f, maxPositions: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
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
                    onChange={e => setForm(f => ({ ...f, maxBpPct: e.target.value }))}
                  />
                </div>
              </div>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AllocationsPage() {
  const qc = useQueryClient()
  const { data: allocData, isLoading, isError, error } = useAllocations()
  const { data: oppsData } = useOpportunities()

  const allocations = allocData?.items ?? []
  const opportunities = oppsData?.items ?? []
  const activeAllocations = allocations.filter(a => a.is_active)

  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateAllocation(id, { is_active: isActive }),
    onMutate: ({ id }) => {
      setTogglingId(id)
      setToggleError(null)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.strategy.allocations })
    },
    onError: e => {
      setToggleError(e instanceof Error ? e.message : String(e))
    },
    onSettled: () => {
      setTogglingId(null)
    },
  })

  const openCreate = () => {
    setDialogMode('create')
    setEditId(null)
    setDialogOpen(true)
  }

  const openEdit = (id: number) => {
    setDialogMode('edit')
    setEditId(id)
    setDialogOpen(true)
  }

  // Resolve opportunity names for display
  const oppNameMap = Object.fromEntries(
    opportunities.map(o => [o.strategy_opportunity_id, o.name]),
  )

  return (
    <PageShell className="space-y-5">
      <PageHeader
        title="Allocations"
        titleSize="large"
        description="Combine multiple opportunities into an allocation with optional gate safety and position limits."
        actions={
          <Button onClick={openCreate} className="gap-1.5 shrink-0">
            <PlusCircle className="h-4 w-4" />
            New allocation
          </Button>
        }
      />

      {/* Active banner */}
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center gap-3 text-sm flex-wrap">
        <Star className="h-4 w-4 text-yellow-500 shrink-0" />
        <span className="text-muted-foreground">Active allocations:</span>
        {activeAllocations.length === 0 ? (
          <span className="text-muted-foreground italic">None</span>
        ) : activeAllocations.length === 1 ? (
          <>
            <span className="font-medium">{activeAllocations[0].name}</span>
            <Badge variant="outline" className="text-xs">
              #{activeAllocations[0].strategy_allocation_id}
            </Badge>
          </>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {activeAllocations.map(a => (
              <Badge key={a.strategy_allocation_id} variant="secondary" className="text-xs">
                {a.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {toggleError && (
        <Alert variant="destructive">
          <AlertDescription>{toggleError}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription>{error instanceof Error ? error.message : 'Failed to load allocations'}</AlertDescription>
        </Alert>
      ) : allocations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium">No allocations yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create one to combine opportunities and assign a gate safety set.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Opportunities</TableHead>
                <TableHead>Gate safety</TableHead>
                <TableHead className="text-right">Max pos</TableHead>
                <TableHead className="text-right">Max BP%</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map(row => (
                  <TableRow
                    key={row.strategy_allocation_id}
                    className={row.is_active ? 'bg-yellow-500/5' : 'opacity-60'}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                          {row.is_active && <Star className="h-3.5 w-3.5 text-yellow-500" />}
                        </span>
                        {row.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.strategy_opportunity_ids.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {row.strategy_opportunity_ids.map(id => (
                            <Badge key={id} variant="secondary" className="text-xs">
                              {oppNameMap[id] ?? `#${id}`}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.gate_safety_name ?? (row.gate_safety_strategy_id != null ? `#${row.gate_safety_strategy_id}` : '—')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.max_positions ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.max_bp_pct != null ? `${(row.max_bp_pct * 100).toFixed(0)}%` : '—'}
                    </TableCell>
                    <TableCell className="w-28">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`alloc-active-${row.strategy_allocation_id}`}
                          size="sm"
                          checked={row.is_active}
                          disabled={togglingId === row.strategy_allocation_id}
                          onCheckedChange={checked =>
                            toggleActiveMutation.mutate({
                              id: row.strategy_allocation_id,
                              isActive: checked,
                            })
                          }
                        />
                        <Label
                          htmlFor={`alloc-active-${row.strategy_allocation_id}`}
                          className="inline-block w-14 text-xs text-muted-foreground cursor-pointer"
                        >
                          {row.is_active ? 'Active' : 'Inactive'}
                        </Label>
                      </div>
                    </TableCell>
                    <TableCell className="w-16">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1"
                        onClick={() => openEdit(row.strategy_allocation_id)}
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AllocationFormDialog
        mode={dialogMode}
        editId={editId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => void qc.invalidateQueries({ queryKey: QUERY_KEYS.strategy.allocations })}
      />
    </PageShell>
  )
}
