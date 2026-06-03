/* eslint-disable react-hooks/set-state-in-effect -- hydrates edit form from API when panel opens (Legacy parity) */
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  opportunitiesAddBtnClass,
  opportunitiesAvailableFieldClass,
  opportunitiesAvailableLabelClass,
  opportunitiesColBodyClass,
  opportunitiesColHeaderClass,
  opportunitiesColTitleClass,
  opportunitiesConditionInputClass,
  opportunitiesConditionInputNumClass,
  opportunitiesConditionRemoveClass,
  opportunitiesConditionRowClass,
  opportunitiesConditionSelectClass,
  opportunitiesConditionsListClass,
  opportunitiesFieldLabelClass,
  opportunitiesFormBodyClass,
  opportunitiesFormColClass,
  opportunitiesFormColumnsClass,
  opportunitiesFormErrorClass,
  opportunitiesFormFieldClass,
  opportunitiesFormFooterClass,
  opportunitiesFormHeaderClass,
  opportunitiesFormHintClass,
  opportunitiesFormPanelClass,
  opportunitiesFormTitleClass,
  opportunitiesFormCloseClass,
  opportunitiesGatePillClass,
  opportunitiesGatePillSelectedClass,
  opportunitiesGatePillsClass,
  opportunitiesGatePillVersionClass,
  opportunitiesIdentityRowClass,
  opportunitiesNameFieldClass,
  opportunitiesNameInputClass,
  opportunitiesStructureCardClass,
  opportunitiesStructureCardMetaClass,
  opportunitiesStructureCardMetaSelectedClass,
  opportunitiesStructureCardSelectedClass,
  opportunitiesStructureCardTitleClass,
  opportunitiesStructureGridClass,
  opportunitiesSymbolTagClass,
  opportunitiesSymbolTagInputClass,
  opportunitiesSymbolTagRemoveClass,
  opportunitiesSymbolTagsClass,
  opportunitiesWatchlistActionsClass,
  opportunitiesWatchlistCheckClass,
  opportunitiesWatchlistCheckboxClass,
  opportunitiesWatchlistGridClass,
} from '@/components/strategy/opportunities/opportunitiesFormUi'
import { SegmentControl } from '@/components/data-display'
import { useGateSafety } from '@/hooks/useStrategies'
import { useWatchlist } from '@/hooks/useWatchlist'
import { createOpportunity, putOpportunity, fetchOpportunityDetail, fetchStructures } from '@/api/strategy'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { StrategyOpportunity, EntryCondition } from '@/types/positions'
import type { StrategyStructure } from '@/types/strategy'
import {
  OPPORTUNITY_CONDITION_TYPES,
  OPPORTUNITY_SCOPE_TYPES,
  buildSuggestedOpportunityName,
  getOpportunityConditionTypeLabel,
  getScopeTypeLabel,
  getStructureDisplayLabel,
} from '@/utils/strategyFormUtils'
import { cn } from '@/lib/utils'

export interface PrefillData {
  name: string
  structureId: string
  gateSafetyId: string
  scopeType: string
  symbols: string[]
  conditions: EntryCondition[]
}

const GATE_NONE = '__none__'

function FieldLabel({ children, htmlFor }: { children: string; htmlFor?: string }) {
  return (
    <span className={opportunitiesFieldLabelClass} {...(htmlFor ? { id: `${htmlFor}-label` } : {})}>
      {children}
    </span>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  initial?: StrategyOpportunity
  prefill?: PrefillData
}

export function OpportunityFormModal({ open, onClose, initial, prefill }: Props) {
  const queryClient = useQueryClient()
  const isEdit = initial != null
  const isCopy = prefill != null && !isEdit
  const isCreate = !isEdit
  const { data: gateData } = useGateSafety()
  const { data: watchlistData } = useWatchlist()
  const { data: structuresData } = useQuery({
    queryKey: [...QUERY_KEYS.strategy.structures, 'all'],
    queryFn: () => fetchStructures(false),
    enabled: open,
    staleTime: 60_000,
  })

  const structures = useMemo(() => structuresData?.items ?? [], [structuresData?.items])
  const activeGates = gateData?.items.filter((g) => g.is_active) ?? []

  const [name, setName] = useState(prefill?.name ?? '')
  const [nameEdited, setNameEdited] = useState(prefill != null || isEdit)
  const [structureId, setStructureId] = useState<string>(prefill?.structureId ?? '')
  const [gateSafetyId, setGateSafetyId] = useState<string>(prefill?.gateSafetyId || GATE_NONE)
  const [scopeType, setScopeType] = useState<string>(prefill?.scopeType ?? '')
  const [symbols, setSymbols] = useState<string[]>(prefill?.symbols ?? [])
  const [conditions, setConditions] = useState<EntryCondition[]>(prefill?.conditions ?? [])
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editHydratedId, setEditHydratedId] = useState<number | null>(null)

  const editDetailQuery = useQuery({
    queryKey: ['strategy', 'opportunity-detail', initial?.strategy_opportunity_id],
    queryFn: () => fetchOpportunityDetail(initial!.strategy_opportunity_id),
    enabled: open && isEdit && initial != null,
    staleTime: 0,
  })

  const loading = isEdit && (editDetailQuery.isLoading || editHydratedId !== initial?.strategy_opportunity_id)

  const selectedStructure = structures.find(
    (s) => String(s.strategy_structure_id) === structureId,
  )

  const watchlistStkSymbols = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const w of watchlistData?.items ?? []) {
      if ((w.sec_type || 'STK').toUpperCase() === 'OPT') continue
      if (w.optionable !== true) continue
      const sym = (w.symbol || w.contract_key || '').trim().toUpperCase()
      if (sym && !seen.has(sym)) {
        seen.add(sym)
        out.push(sym)
      }
    }
    return out.sort((a, b) => a.localeCompare(b))
  }, [watchlistData])

  const suggestedName = useMemo(
    () =>
      buildSuggestedOpportunityName({
        structureName: selectedStructure?.name ?? '',
        scopeType: scopeType || null,
        symbols,
        entryConditions: conditions,
      }),
    [selectedStructure?.name, scopeType, symbols, conditions],
  )

  const resolvedStructureId =
    structureId ||
    (isCreate && !prefill && structures[0] ? String(structures[0].strategy_structure_id) : '')

  const resolvedName = nameEdited || isEdit || isCopy ? name : suggestedName

  useEffect(() => {
    const detail = editDetailQuery.data
    const id = initial?.strategy_opportunity_id
    if (!open || !isEdit || !detail || id == null || editHydratedId === id) return
    setName(detail.name)
    setNameEdited(true)
    setStructureId(detail.strategy_structure_id != null ? String(detail.strategy_structure_id) : '')
    setGateSafetyId(
      detail.default_gate_safety_strategy_id != null
        ? String(detail.default_gate_safety_strategy_id)
        : GATE_NONE,
    )
    setScopeType(detail.scope_type ?? '')
    setSymbols(detail.symbols ?? [])
    setConditions(detail.entry_conditions ?? [])
    setIsActive(detail.is_active === true)
    setEditHydratedId(id)
  }, [open, isEdit, initial?.strategy_opportunity_id, editDetailQuery.data, editHydratedId])

  useEffect(() => {
    if (editDetailQuery.isError) setError('Failed to load opportunity details.')
  }, [editDetailQuery.isError])

  function handleAddEmptySymbol() {
    setSymbols((prev) => [...prev, ''])
  }

  function handleUpdateSymbol(index: number, value: string) {
    setSymbols((prev) => prev.map((s, i) => (i === index ? value.toUpperCase() : s)))
  }

  function handleRemoveSymbol(index: number) {
    setSymbols((prev) => prev.filter((_, i) => i !== index))
  }

  function handleScopeChange(val: string) {
    setScopeType(val)
    if (val !== 'explicit_symbols' && val !== 'watchlist_stk') setSymbols([])
  }

  function handleAddCondition() {
    setConditions((prev) => [
      ...prev,
      { condition_type: 'iv_min', value_text: null, value_numeric: null },
    ])
  }

  function handleConditionPatch(index: number, patch: Partial<EntryCondition>) {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function handleRemoveCondition(idx: number) {
    setConditions((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit() {
    if (!resolvedName.trim()) {
      setError('Name is required.')
      return
    }
    if (!resolvedStructureId) {
      setError('Structure is required.')
      return
    }
    setSaving(true)
    setError(null)
    const scope = (scopeType || '').trim() || null
    const symbolPayload =
      scope === 'explicit_symbols'
        ? symbols.map((s) => s.trim()).filter(Boolean)
        : scope === 'watchlist_stk'
          ? symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)
          : []
    const entryConditions = conditions
      .filter((c) => (c.condition_type ?? '').trim())
      .map((c) => ({
        condition_type: c.condition_type.trim(),
        value_text: c.value_text?.trim() || null,
        value_numeric: c.value_numeric ?? null,
      }))
    const body = {
      name: (nameEdited ? name : resolvedName).trim(),
      strategy_structure_id: Number(resolvedStructureId),
      default_gate_safety_strategy_id:
        gateSafetyId && gateSafetyId !== GATE_NONE ? Number(gateSafetyId) : null,
      scope_type: scope,
      symbols: symbolPayload,
      entry_conditions: entryConditions,
      is_active: isActive,
    }
    try {
      if (isEdit && initial) {
        await putOpportunity(initial.strategy_opportunity_id, body)
        await queryClient.invalidateQueries({
          queryKey: ['strategy', 'opportunity-detail', initial.strategy_opportunity_id],
        })
      } else {
        await createOpportunity(body)
      }
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.strategy.opportunities })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const formTitle = isEdit
    ? `Edit opportunity #${initial?.strategy_opportunity_id}`
    : isCopy
      ? 'New opportunity (copy)'
      : 'New opportunity'

  const scopeOptions = OPPORTUNITY_SCOPE_TYPES.map((t) => ({
    value: t,
    label: getScopeTypeLabel(t || null),
  }))

  return (
    <section className={opportunitiesFormPanelClass} aria-label={formTitle}>
      <div className={opportunitiesFormHeaderClass}>
        <h3 className={opportunitiesFormTitleClass}>{formTitle}</h3>
        <button
          type="button"
          className={opportunitiesFormCloseClass}
          onClick={onClose}
          aria-label="Close form"
        >
          ×
        </button>
      </div>

      {loading ? (
        <p className={cn(opportunitiesFormHintClass, 'px-5 py-4')}>Loading…</p>
      ) : (
        <div className={opportunitiesFormBodyClass}>
          {error && (
            <div className={opportunitiesFormErrorClass} role="alert">
              <span
                className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-destructive text-[0.7rem] font-bold text-destructive-foreground"
                aria-hidden
              >
                !
              </span>
              {error}
            </div>
          )}

          <div className={opportunitiesIdentityRowClass}>
            <div className={cn(opportunitiesFormFieldClass, opportunitiesNameFieldClass)}>
              <FieldLabel htmlFor="opportunity-form-name">Name</FieldLabel>
              <Input
                id="opportunity-form-name"
                className={opportunitiesNameInputClass}
                value={resolvedName}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameEdited(true)
                }}
                placeholder="e.g. AAPL Premium Harvest"
              />
              {isCreate && !isCopy && (
                <p className={opportunitiesFormHintClass}>
                  Name fills from symbol scope, structure, and entry conditions; you can edit it anytime.
                </p>
              )}
            </div>
            <div className={opportunitiesAvailableFieldClass}>
              <label className={opportunitiesAvailableLabelClass} htmlFor="opportunity-form-active">
                <Switch
                  id="opportunity-form-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  aria-label="Available"
                />
                <span>Available</span>
              </label>
            </div>
          </div>

          <div className={opportunitiesFormFieldClass}>
            <FieldLabel>Structure</FieldLabel>
            <div className={opportunitiesStructureGridClass} role="radiogroup" aria-label="Structure (required)">
              {structures.length === 0 ? (
                <p className={opportunitiesFormHintClass}>No structures. Create one in Structure first.</p>
              ) : (
                structures.map((s: StrategyStructure) => {
                  const id = String(s.strategy_structure_id)
                  const selected = resolvedStructureId === id
                  const metaLabel = getStructureDisplayLabel(s)
                  const hasMeta =
                    (s.version != null && String(s.version) !== '') || metaLabel !== '—'
                  return (
                    <label
                      key={id}
                      className={cn(
                        opportunitiesStructureCardClass,
                        selected && opportunitiesStructureCardSelectedClass,
                      )}
                    >
                      <input
                        type="radio"
                        name="opp_structure"
                        className="sr-only"
                        checked={selected}
                        onChange={() => {
                          setStructureId(id)
                          setNameEdited(false)
                        }}
                      />
                      <span className={opportunitiesStructureCardTitleClass}>{s.name}</span>
                      {hasMeta ? (
                        <span
                          className={cn(
                            opportunitiesStructureCardMetaClass,
                            selected && opportunitiesStructureCardMetaSelectedClass,
                          )}
                        >
                          {s.version != null && String(s.version) !== '' ? `v${s.version}` : ''}
                          {s.version != null && String(s.version) !== '' && metaLabel !== '—' ? ' · ' : ''}
                          {metaLabel !== '—' ? metaLabel : ''}
                        </span>
                      ) : null}
                    </label>
                  )
                })
              )}
            </div>
          </div>

          <div className={opportunitiesFormFieldClass}>
            <FieldLabel>Default gate safety</FieldLabel>
            <div className={opportunitiesGatePillsClass} role="radiogroup" aria-label="Default gate safety">
              <label
                className={cn(
                  opportunitiesGatePillClass,
                  gateSafetyId === GATE_NONE && opportunitiesGatePillSelectedClass,
                )}
              >
                <input
                  type="radio"
                  name="opp_gate"
                  className="sr-only"
                  checked={gateSafetyId === GATE_NONE}
                  onChange={() => setGateSafetyId(GATE_NONE)}
                />
                None
              </label>
              {activeGates.map((g) => {
                const id = String(g.gate_safety_strategy_id)
                const selected = gateSafetyId === id
                return (
                  <label
                    key={id}
                    className={cn(
                      opportunitiesGatePillClass,
                      selected && opportunitiesGatePillSelectedClass,
                    )}
                  >
                    <input
                      type="radio"
                      name="opp_gate"
                      className="sr-only"
                      checked={selected}
                      onChange={() => setGateSafetyId(id)}
                    />
                    <span>{g.name}</span>
                    {g.version != null && (
                      <span className={opportunitiesGatePillVersionClass}>v{g.version}</span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          <div className={opportunitiesFormColumnsClass}>
            <div className={opportunitiesFormColClass}>
              <div className={opportunitiesColHeaderClass}>
                <h4 className={opportunitiesColTitleClass}>Symbol scope</h4>
              </div>
              <div className={opportunitiesColBodyClass}>
                <SegmentControl
                  size="sm"
                  ariaLabel="Symbol scope type"
                  value={scopeType}
                  onChange={handleScopeChange}
                  options={scopeOptions}
                />

                {scopeType === 'explicit_symbols' && (
                  <div className="space-y-2">
                    <div className={opportunitiesSymbolTagsClass}>
                      {symbols.map((sym, i) => (
                        <span key={i} className={opportunitiesSymbolTagClass}>
                          <Input
                            className={opportunitiesSymbolTagInputClass}
                            value={sym}
                            onChange={(e) => handleUpdateSymbol(i, e.target.value)}
                            placeholder="SYM"
                          />
                          <button
                            type="button"
                            className={opportunitiesSymbolTagRemoveClass}
                            onClick={() => handleRemoveSymbol(i)}
                            aria-label={`Remove ${sym || 'symbol'}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <button type="button" className={opportunitiesAddBtnClass} onClick={handleAddEmptySymbol}>
                      <Plus className="h-3 w-3" />
                      Add symbol
                    </button>
                  </div>
                )}

                {scopeType === 'watchlist_stk' && (
                  <div className="space-y-2">
                    {watchlistStkSymbols.length === 0 ? (
                      <p className={opportunitiesFormHintClass}>
                        No watchlist stocks with Option? on. Turn Option? on in Watchlist, or use Explicit symbols.
                      </p>
                    ) : (
                      <>
                        <div className={opportunitiesWatchlistActionsClass}>
                          <button
                            type="button"
                            className={opportunitiesAddBtnClass}
                            onClick={() => setSymbols([...watchlistStkSymbols])}
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            className={opportunitiesAddBtnClass}
                            onClick={() => setSymbols([])}
                          >
                            Clear
                          </button>
                          <span className={cn(opportunitiesFormHintClass, 'ml-auto')}>
                            {symbols.length === 0
                              ? 'All symbols (empty = all)'
                              : `${symbols.length} selected`}
                          </span>
                        </div>
                        <ul
                          className={opportunitiesWatchlistGridClass}
                          role="group"
                          aria-label="Select symbols from Watchlist STK"
                        >
                          {watchlistStkSymbols.map((sym) => {
                            const checked = symbols.includes(sym)
                            return (
                              <li key={sym}>
                                <label className={opportunitiesWatchlistCheckClass}>
                                  <input
                                    type="checkbox"
                                    className={opportunitiesWatchlistCheckboxClass}
                                    checked={checked}
                                    onChange={() => {
                                      setSymbols((prev) =>
                                        checked
                                          ? prev.filter((s) => s !== sym)
                                          : [...prev, sym].sort((a, b) => a.localeCompare(b)),
                                      )
                                    }}
                                  />
                                  {sym}
                                </label>
                              </li>
                            )
                          })}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={opportunitiesFormColClass}>
              <div className={opportunitiesColHeaderClass}>
                <h4 className={opportunitiesColTitleClass}>Entry conditions</h4>
              </div>
              <div className={opportunitiesColBodyClass}>
                {conditions.length === 0 && (
                  <p className={opportunitiesFormHintClass}>No entry conditions yet.</p>
                )}
                <div className={opportunitiesConditionsListClass}>
                  {conditions.map((cond, idx) => (
                    <div key={idx} className={opportunitiesConditionRowClass}>
                      <select
                        className={opportunitiesConditionSelectClass}
                        value={cond.condition_type}
                        onChange={(e) =>
                          handleConditionPatch(idx, { condition_type: e.target.value })
                        }
                      >
                        {OPPORTUNITY_CONDITION_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {getOpportunityConditionTypeLabel(t)}
                          </option>
                        ))}
                      </select>
                      <Input
                        className={opportunitiesConditionInputClass}
                        placeholder="text"
                        value={cond.value_text ?? ''}
                        onChange={(e) =>
                          handleConditionPatch(idx, { value_text: e.target.value || null })
                        }
                      />
                      <Input
                        className={cn(opportunitiesConditionInputClass, opportunitiesConditionInputNumClass)}
                        type="number"
                        step="any"
                        placeholder="numeric"
                        value={cond.value_numeric ?? ''}
                        onChange={(e) =>
                          handleConditionPatch(idx, {
                            value_numeric:
                              e.target.value === '' ? null : parseFloat(e.target.value),
                          })
                        }
                      />
                      <button
                        type="button"
                        className={opportunitiesConditionRemoveClass}
                        onClick={() => handleRemoveCondition(idx)}
                        aria-label="Remove condition"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" className={opportunitiesAddBtnClass} onClick={handleAddCondition}>
                  <Plus className="h-3 w-3" />
                  Add condition
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={opportunitiesFormFooterClass}>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={saving || loading}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
        </Button>
      </div>
    </section>
  )
}
