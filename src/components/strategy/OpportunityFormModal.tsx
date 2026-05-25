import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useStructures, useGateSafety } from '@/hooks/useStrategies'
import { useWatchlist } from '@/hooks/useWatchlist'
import { createOpportunity, putOpportunity, fetchOpportunityDetail } from '@/api/strategy'
import type { StrategyOpportunity, EntryCondition } from '@/types/positions'

export interface PrefillData {
  name: string
  structureId: string
  gateSafetyId: string
  scopeType: string
  symbols: string[]
  conditions: EntryCondition[]
}

const SCOPE_OPTIONS = [
  { value: '', label: '— None' },
  { value: 'watchlist_stk', label: 'Watchlist (stocks)' },
  { value: 'explicit_symbols', label: 'Explicit symbols' },
]

const CONDITION_TYPES = [
  { value: 'iv_min', label: 'IV Min' },
  { value: 'iv_max', label: 'IV Max' },
  { value: 'dte_min', label: 'DTE Min' },
  { value: 'dte_max', label: 'DTE Max' },
  { value: 'earnings_blackout_days', label: 'Earnings Blackout (days)' },
  { value: 'min_volume', label: 'Min Volume' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: StrategyOpportunity
  prefill?: PrefillData
}

function buildSuggestedName(
  structureName: string | null,
  scopeType: string,
  symbols: string[],
): string {
  const parts: string[] = []
  if (symbols.length > 0 && scopeType === 'explicit_symbols') parts.push(symbols.join('/'))
  if (structureName) parts.push(structureName)
  if (scopeType === 'watchlist_stk') parts.push('(watchlist)')
  return parts.join(' ')
}

export function OpportunityFormModal({ open, onOpenChange, initial, prefill }: Props) {
  const queryClient = useQueryClient()
  const isEdit = initial != null
  const { data: structuresData } = useStructures()
  const { data: gateData } = useGateSafety()
  const { data: watchlistData } = useWatchlist()

  const [name, setName] = useState(prefill?.name ?? '')
  const [nameEdited, setNameEdited] = useState(prefill != null)
  const [structureId, setStructureId] = useState<string>(prefill?.structureId ?? '')
  const [gateSafetyId, setGateSafetyId] = useState<string>(prefill?.gateSafetyId ?? '')
  const [scopeType, setScopeType] = useState<string>(prefill?.scopeType ?? '')
  const [symbols, setSymbols] = useState<string[]>(prefill?.symbols ?? [])
  const [symbolInput, setSymbolInput] = useState('')
  const [conditions, setConditions] = useState<EntryCondition[]>(prefill?.conditions ?? [])
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  // Initialized true when editing so first render shows spinner; key prop remounts on mode change.
  const [loading, setLoading] = useState(() => isEdit)
  const [error, setError] = useState<string | null>(null)

  const activeStructures = structuresData?.items.filter((s) => s.is_active) ?? []
  const activeGates = gateData?.items.filter((g) => g.is_active) ?? []

  const selectedStructureName =
    activeStructures.find((s) => String(s.strategy_structure_id) === structureId)?.name ?? null

  const watchlistStks = useMemo(() =>
    (watchlistData?.items ?? [])
      .filter((w) => w.sec_type === 'STK' && w.optionable)
      .map((w) => w.symbol)
      .sort(),
    [watchlistData],
  )

  const updateSuggestedName = useCallback(
    (sName: string | null, scope: string, syms: string[]) => {
      if (!nameEdited) setName(buildSuggestedName(sName, scope, syms))
    },
    [nameEdited],
  )

  // key prop in parent resets component state when switching modes.
  // This effect only needs to load detail for edit mode.
  useEffect(() => {
    if (!open || !isEdit || !initial) return
    fetchOpportunityDetail(initial.strategy_opportunity_id)
      .then((detail) => {
        setName(detail.name)
        setNameEdited(true)
        setStructureId(detail.strategy_structure_id != null ? String(detail.strategy_structure_id) : '')
        setGateSafetyId(detail.default_gate_safety_strategy_id != null ? String(detail.default_gate_safety_strategy_id) : '')
        setScopeType(detail.scope_type ?? '')
        setSymbols(detail.symbols ?? [])
        setConditions(detail.entry_conditions ?? [])
        setIsActive(detail.is_active)
      })
      .catch(() => setError('Failed to load opportunity details.'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleAddSymbol() {
    const sym = symbolInput.trim().toUpperCase()
    if (sym && !symbols.includes(sym)) {
      const next = [...symbols, sym]
      setSymbols(next)
      updateSuggestedName(selectedStructureName, scopeType, next)
    }
    setSymbolInput('')
  }

  function handleRemoveSymbol(s: string) {
    const next = symbols.filter((x) => x !== s)
    setSymbols(next)
    updateSuggestedName(selectedStructureName, scopeType, next)
  }

  function handleStructureChange(val: string) {
    setStructureId(val)
    const sName = activeStructures.find((s) => String(s.strategy_structure_id) === val)?.name ?? null
    updateSuggestedName(sName, scopeType, symbols)
  }

  function handleScopeChange(val: string) {
    setScopeType(val)
    if (val !== 'explicit_symbols') setSymbols([])
    updateSuggestedName(selectedStructureName, val, val === 'explicit_symbols' ? symbols : [])
  }

  function handleAddCondition() {
    setConditions((prev) => [...prev, { condition_type: 'iv_min', value_text: null, value_numeric: null }])
  }

  function handleConditionType(idx: number, val: string) {
    setConditions((prev) => prev.map((c, i) => i === idx ? { ...c, condition_type: val } : c))
  }

  function handleConditionValue(idx: number, val: string) {
    const n = val === '' ? null : parseFloat(val)
    setConditions((prev) => prev.map((c, i) => i === idx ? { ...c, value_numeric: isNaN(n as number) ? null : n } : c))
  }

  function handleRemoveCondition(idx: number) {
    setConditions((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit() {
    if (!name.trim()) { setError('Name is required.'); return }
    if (!structureId) { setError('Structure is required.'); return }
    setSaving(true)
    setError(null)
    const body = {
      name: name.trim(),
      strategy_structure_id: Number(structureId),
      default_gate_safety_strategy_id: gateSafetyId ? Number(gateSafetyId) : null,
      scope_type: scopeType || null,
      symbols: scopeType === 'explicit_symbols' ? symbols : [],
      entry_conditions: conditions.filter((c) => c.value_numeric != null || c.value_text),
      is_active: isActive,
    }
    try {
      if (isEdit && initial) {
        await putOpportunity(initial.strategy_opportunity_id, body)
        await queryClient.invalidateQueries({ queryKey: ['strategy', 'opportunity-detail', initial.strategy_opportunity_id] })
      } else {
        await createOpportunity(body)
      }
      await queryClient.invalidateQueries({ queryKey: ['strategy', 'opportunities'] })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Opportunity' : 'New Opportunity'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setNameEdited(true) }}
                placeholder="e.g. AAPL Bull Call Spread"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Structure <span className="text-destructive">*</span></Label>
              <Select value={structureId} onValueChange={handleStructureChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select structure…" />
                </SelectTrigger>
                <SelectContent>
                  {activeStructures.map((s) => (
                    <SelectItem key={s.strategy_structure_id} value={String(s.strategy_structure_id)}>
                      {s.name}
                      {s.template_display_name && (
                        <span className="ml-1.5 text-muted-foreground text-xs">· {s.template_display_name}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Gate Safety</Label>
              <Select value={gateSafetyId} onValueChange={setGateSafetyId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {activeGates.map((g) => (
                    <SelectItem key={g.gate_safety_strategy_id} value={String(g.gate_safety_strategy_id)}>
                      {g.name}
                      <span className="ml-1.5 text-muted-foreground text-xs">v{g.version}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Scope</Label>
              <div className="flex gap-1 flex-wrap">
                {SCOPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleScopeChange(opt.value)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border transition-colors',
                      scopeType === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {scopeType === 'watchlist_stk' && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Watchlist optionable stocks ({watchlistStks.length})
                </p>
                <div className="max-h-24 overflow-y-auto rounded border border-border p-1.5 flex flex-wrap gap-1">
                  {watchlistStks.length === 0
                    ? <span className="text-xs text-muted-foreground">None in watchlist</span>
                    : watchlistStks.map((s) => (
                        <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">
                          {s}
                        </span>
                      ))
                  }
                </div>
              </div>
            )}

            {scopeType === 'explicit_symbols' && (
              <div className="space-y-1.5">
                <Label>Symbols</Label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {symbols.map((s) => (
                    <span key={s} className="flex items-center gap-1 text-xs font-mono bg-muted px-2 py-0.5 rounded">
                      {s}
                      <button type="button" onClick={() => handleRemoveSymbol(s)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Input
                    className="uppercase h-8 text-sm font-mono w-28"
                    placeholder="AAPL"
                    value={symbolInput}
                    onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSymbol() } }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddSymbol}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Entry Conditions</Label>
                <Button type="button" variant="ghost" size="sm" onClick={handleAddCondition} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {conditions.length === 0 && (
                <p className="text-xs text-muted-foreground">No conditions — add filters like IV min or DTE max.</p>
              )}
              {conditions.map((cond, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select value={cond.condition_type} onValueChange={(v) => handleConditionType(idx, v)}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_TYPES.map((ct) => (
                        <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-8 text-xs w-24 font-mono"
                    type="number"
                    placeholder="value"
                    value={cond.value_numeric ?? ''}
                    onChange={(e) => handleConditionValue(idx, e.target.value)}
                  />
                  <button type="button" onClick={() => handleRemoveCondition(idx)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full border transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
                )}
              >
                {isActive ? 'Active' : 'Inactive'}
              </button>
              <span className="text-xs text-muted-foreground">Status</span>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || loading}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
