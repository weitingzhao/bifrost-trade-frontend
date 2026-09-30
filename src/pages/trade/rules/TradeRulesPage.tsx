/**
 * Trading › Rules — the rulebook as one chain (design Rev .101, `Trade Rules.dc.html`).
 *
 * Structure → Opportunity → Allocation · gate → Instance, read left to right.
 * Pick a card and the four columns fold into a sticky lineage bar with the
 * record right under it; pick a ticker and the page reads the symbol lens —
 * every rule that can act on it and everything that ran on it. The focus lives
 * in the URL (`?pick=&sym=`) and every change of it is pushed, so ← Back, Esc,
 * ⌥← and the browser's own Back walk the same path, and the filters, folds and
 * scroll each step left come back with it.
 *
 * This is where the seven `/strategy/*` pages went (design DECISIONS
 * 2026-09-18): the edit sheets behind each card are their own forms, opened
 * from here rather than rewritten (`RulesSheets.tsx`), so a rule edited here
 * and one edited there are the same write with the same validation.
 *
 * Nothing writes from a card click. Activating an allocation is what the daemon
 * reads on its next start, so it lives behind a form with a confirm. D10 is not
 * in play here: a rule is a rulebook entry, not an order.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHead, PageHeadLink, PageShell } from '@/components/layout'
import { SegmentControl } from '@/components/data-display'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import type { PrefillData } from '@/components/strategy/OpportunityFormModal'
import { opportunityCopyPrefill, opportunityDetailKey } from '@/components/strategy/opportunityCopy'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { InstanceListFilters } from '@/components/strategy/InstanceListFilters'
import { InstancesGroupedTable } from '@/components/strategy/InstancesGroupedTable'
import { useTradeBook } from '@/hooks/useTradeBook'
import { createCollapsedGroupsState } from '@/utils/instanceGroupCollapse'
import type { InstanceListFilterValues } from '@/components/strategy/InstanceListFilters'
import { fetchOpportunityDetail } from '@/api/strategy'
import { useRulesChain } from '@/hooks/useRulesChain'
import { withSymbolParam } from '@/lib/symbolLink'
import { clearCarriedSymbol, useCarriedSymbol } from '@/lib/symbolContext'
import { SymbolScopeChip } from '@/components/symbol/SymbolScopeChip'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { SetActiveDialog } from './SetActiveDialog'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { ChainColumnList } from './ChainColumns'
import { NO_SHEET, RulesSheets, type RulesSheet } from './RulesSheets'
import { RulesReadings } from './RulesReadings'
import { LineageBar, type Crumb } from './LineageBar'
import { RulesRecord } from './RulesRecord'
import { TradeRecord, type TradeRecordAction } from '@/components/tradeRecord/TradeRecord'
import { buildRecord, type RecordAction } from './rulesRecordModel'
import { instanceFaceOf } from './rulesInstanceFace'
import { openTradePair, useOpenTrade } from '@/layout/tradeGo'
import { buildChain, orphanGates, orphanOpportunities, visibleChain, type ChainSelection } from './rulesChain'
import {
  NO_FOCUS,
  allSymbols,
  focusKey,
  focusLineage,
  focusOfKey,
  focusSearch,
  hasFocus,
  normSym,
  parseFocus,
  stepTrail,
  touches,
  type BoardSort,
  type Focus,
} from './rulesFocus'

const PAGE_LEAD =
  'One chain, read left to right: a Structure is a shape, an Opportunity is when to use it, an Allocation is what the daemon is told to run, a Trade is one running. Pick a card and the chain folds into its lineage with the record below; pick a ticker for every rule that can act on it and everything that ran on it. Esc or ⌥← walks back. A gate is a limit whose scope is an allocation — defined here, its breaches land on Risk › Limits.'

/** What each column's ＋ New opens. */
const NEW_SHEET: Record<string, RulesSheet> = {
  structure: { kind: 'structure', mode: { kind: 'create' } },
  opportunity: { kind: 'opportunity' },
  allocation: { kind: 'allocation', mode: 'create', editId: null },
  instance: { kind: 'instance' },
}

const NO_FILTERS: InstanceListFilterValues = { status: '', structure: '', symbol: '', right: '', expiry: '', since: '' }

/** What a step leaves behind and gets back (design: filters, folds, scroll). */
interface Snapshot {
  filters: InstanceListFilterValues
  collapsed: Record<string, boolean>
  flat: boolean
  boardSort: BoardSort
  scroll: number
}

const scroller = () => document.getElementById('main-content')

export default function TradeRulesPage() {
  const [activeOnly, setActiveOnly] = useState('active')
  const [params] = useSearchParams()
  const pickParam = params.get('pick')
  // Rev .120: the symbol step is the top bar's `?symbol=`; `?sym=` is the old spelling, still read.
  const symParam = params.get('symbol') ?? params.get('sym')
  // Memoised on the raw params: a fresh object per render re-ran every memo
  // keyed on it (and once restarted the metrics loader on every render).
  const focus: Focus = useMemo(
    () => parseFocus(new URLSearchParams([...(pickParam ? [['pick', pickParam]] : []), ...(symParam ? [['sym', symParam]] : [])])),
    [pickParam, symParam],
  )
  const sel = focus.pick
  const key = focusKey(focus)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  // The Desk's Decide lane hands a Research proposal over as a prefilled New
  // opportunity (design DECISIONS 2026-09-18), in router state; consumed once.
  const location = useLocation()
  const navigate = useNavigate()
  const handedPrefill = (location.state as { opportunityPrefill?: PrefillData } | null)?.opportunityPrefill
  const [sheet, setSheet] = useState<RulesSheet>(() =>
    handedPrefill == null ? NO_SHEET : { kind: 'opportunity', prefill: handedPrefill },
  )
  useEffect(() => {
    if (handedPrefill == null) return
    navigate(location.pathname + location.search, { replace: true, state: null })
  }, [handedPrefill, navigate, location.pathname, location.search])
  const status = useMonitorStatus()
  const { data, rawInstances, loading, error, refetch } = useRulesChain()

  /** What the daemon's own config points at — the store `Set active` writes. */
  const daemon = useMemo(
    () => ({ allocationId: status.data?.strategy?.active?.allocation?.id ?? null }),
    [status.data?.strategy?.active?.allocation?.id],
  )
  const [setActiveFor, setSetActiveFor] = useState<number | null | undefined>(undefined)
  const qc = useQueryClient()
  const [duplicating, setDuplicating] = useState(false)

  // The list's narrowing within a focus — component state, restored per step.
  const [instanceFilters, setInstanceFilters] = useState<InstanceListFilterValues>(NO_FILTERS)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [flat, setFlat] = useState(false)
  const [boardSort, setBoardSort] = useState<BoardSort>('pnl')
  const [chainOpen, setChainOpen] = useState(false)
  const [orphansOnly, setOrphansOnly] = useState(false)
  /** Held for comparison — the pair opens side by side in the shared sheet. */
  const [compareWith, setCompareWith] = useState<number | null>(null)
  /** The list an instance was opened from, so the record can step `[ ]` through it. */
  const [siblings, setSiblings] = useState<{ ids: number[]; from: string } | null>(null)
  /** The side sheet: an instance opened over the list, which stays live behind it. */
  const openInstance = useOpenTrade()

  // ── The path ────────────────────────────────────────────────────────────
  const [trail, setTrail] = useState<string[]>([])
  const snapshots = useRef(new Map<string, Snapshot>())
  const live = useRef<Snapshot>({ filters: NO_FILTERS, collapsed: {}, flat: false, boardSort: 'pnl', scroll: 0 })
  // Declared before the focus effect on purpose: on the commit that changes the
  // focus this runs first, while the state (and the scroll) is still the step
  // being left — which is exactly what the snapshot has to hold.
  useEffect(() => {
    live.current = { filters: instanceFilters, collapsed: collapsedGroups, flat, boardSort, scroll: scroller()?.scrollTop ?? 0 }
  })
  const lastKey = useRef(key)
  // A new focus: remember what the step left, extend or truncate the path,
  // and bring back what this step had when it was last left.
  useEffect(() => {
    const leaving = lastKey.current
    if (leaving === key) return
    lastKey.current = key
    snapshots.current.set(leaving, live.current)
    setTrail((t) => stepTrail(t, leaving, key))
    const back = snapshots.current.get(key)
    setInstanceFilters(back?.filters ?? NO_FILTERS)
    setCollapsedGroups(back?.collapsed ?? {})
    setFlat(back?.flat ?? false)
    setBoardSort(back?.boardSort ?? 'pnl')
    setChainOpen(false)
    setCompareWith(null)
    requestAnimationFrame(() => {
      const el = scroller()
      if (el) el.scrollTop = back?.scroll ?? 0
    })
  }, [key])

  const nav = useCallback(
    (next: Focus, opts?: { replace?: boolean }) => {
      if (focusKey(next) === key) return
      navigate({ search: focusSearch(next) }, { replace: opts?.replace ?? false })
    },
    [key, navigate],
  )
  const back = useCallback(() => {
    if (trail.length) nav(focusOfKey(trail[trail.length - 1]))
    else if (hasFocus(focus)) nav(NO_FOCUS)
  }, [trail, focus, nav])

  const pickIt = (next: ChainSelection, sib?: { ids: number[]; from: string }) => {
    const same = sel != null && sel.kind === next.kind && sel.id === next.id
    if (same) {
      back()
      return
    }
    const keepSym = focus.sym != null && next.id != null && touches(next, focus.sym, data)
    if (next.kind === 'instance' && next.id != null) setSiblings(sib ?? null)
    nav({ pick: next, sym: keepSym ? focus.sym : null })
  }
  const setSym = (raw: string | null, keepPick: boolean) => {
    const sym = normSym(raw)
    if (!sym || sym === focus.sym) {
      nav({ pick: focus.pick, sym: null })
      return
    }
    const keep = keepPick && sel != null && sel.id != null && touches(sel, sym, data)
    nav({ sym, pick: keep ? sel : null })
  }
  /** `[` `]` — within the list the instance came from; replaces, never adds to Back. */
  const step = (dir: -1 | 1) => {
    if (sel?.kind !== 'instance' || sel.id == null || !siblings) return
    const j = siblings.ids.indexOf(sel.id) + dir
    const id = siblings.ids[j]
    if (id == null) return
    const nextFocus = { pick: { kind: 'instance' as const, id }, sym: null }
    // The path treats a step as the same place: carry the key over by hand.
    lastKey.current = focusKey(nextFocus)
    navigate({ search: focusSearch(nextFocus) }, { replace: true })
  }

  const stepRef = useRef(step)
  const backRef = useRef(back)
  useEffect(() => {
    stepRef.current = step
    backRef.current = back
  })
  const sheetOpen = sheet.kind !== NO_SHEET.kind || setActiveFor !== undefined
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (sheetOpen || document.querySelector('[role="dialog"][data-state="open"]')) return
      // An Esc the shell already spent closing an inspector is not also a Back.
      if (e.defaultPrevented) return
      if (e.key === '[' || e.key === ']') {
        stepRef.current(e.key === '[' ? -1 : 1)
        return
      }
      if (e.key === 'Escape' || (e.altKey && e.key === 'ArrowLeft')) {
        if (e.altKey) e.preventDefault()
        if (compareWith != null && e.key === 'Escape') setCompareWith(null)
        else backRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen, compareWith])

  /**
   * A copy carries the whole rule, so the detail is fetched first — the list
   * row has no entry conditions, and a copy missing them would be a different
   * rule under the same name.
   */
  async function duplicateOpportunity(id: number) {
    setDuplicating(true)
    try {
      const detail = await qc.fetchQuery({
        queryKey: opportunityDetailKey(id),
        queryFn: () => fetchOpportunityDetail(id),
        staleTime: 120_000,
      })
      setSheet({ kind: 'opportunity', prefill: opportunityCopyPrefill(detail) })
    } finally {
      setDuplicating(false)
    }
  }

  const lit = useMemo(() => focusLineage(focus, data), [focus, data])
  const columns = useMemo(() => {
    const cols = buildChain(data, sel, activeOnly === 'active', daemon, lit)
    if (!orphansOnly) return cols
    return cols.map((c) =>
      c.key === 'opportunity' ? { ...c, cards: c.cards.filter((k) => k.tag === 'no allocation') } : c,
    )
  }, [data, sel, activeOnly, daemon, lit, orphansOnly])

  const visible = useMemo(() => visibleChain(data, activeOnly === 'active'), [data, activeOnly])
  const orphanOpps = orphanOpportunities(visible)
  const looseGates = orphanGates(data)
  /**
   * The strategy service intermittently answers HTTP 200 with an empty list
   * (measured 2026-09-18 on DEV): with opportunities but no instance at all,
   * the page says the service answered empty rather than "0 open · 0 closed".
   */
  const instancesEmpty = data.opportunities.length > 0 && data.instances.length === 0

  // Entry conditions live only on the opportunity's own record.
  const oppDetail = useQuery({
    queryKey: opportunityDetailKey(sel?.kind === 'opportunity' && sel.id != null ? sel.id : -1),
    queryFn: () => fetchOpportunityDetail(sel!.id!),
    enabled: sel?.kind === 'opportunity' && sel.id != null,
    staleTime: 120_000,
  })

  /**
   * What the selected thing can have done to it. A gate has no column of its
   * own, so editing it hangs off the allocation that applies it.
   */
  const detailActions = (kind: ChainSelection['kind'] | 'symbol'): RecordAction[] => {
    if (kind === 'symbol' && focus.sym) {
      return [
        { label: `Research ${focus.sym} →`, to: withSymbolParam(SYMBOL_PATH, focus.sym) },
        { label: 'Positions →', to: '/portfolio/positions', title: 'Where its open legs are marked' },
      ]
    }
    if (sel == null || sel.id == null) return []
    const id = sel.id
    if (kind === 'structure') {
      return [
        { label: 'Edit', onClick: () => setSheet({ kind: 'structure', mode: { kind: 'edit', id } }) },
        { label: 'Duplicate', onClick: () => setSheet({ kind: 'structure', mode: { kind: 'copy', id } }) },
      ]
    }
    if (kind === 'opportunity') {
      const initial = data.opportunities.find((o) => o.strategy_opportunity_id === id)
      return [
        { label: 'Edit', onClick: () => setSheet({ kind: 'opportunity', initial }) },
        {
          label: duplicating ? 'Copying…' : 'Duplicate',
          onClick: () => void duplicateOpportunity(id),
          disabled: duplicating,
          title: 'Open a new opportunity prefilled from this one — structure, gate, scope and conditions',
        },
      ]
    }
    if (kind === 'allocation') {
      const gateId = data.allocations.find((a) => a.strategy_allocation_id === id)?.gate_safety_strategy_id
      const isDaemons = daemon.allocationId === id
      return [
        // The one active switch: it edits the daemon's config, a separate act
        // from saving the definition (design DECISIONS 2026-09-18).
        {
          label: isDaemons ? 'Clear active' : 'Set active',
          onClick: () => setSetActiveFor(isDaemons ? null : id),
          title: isDaemons
            ? 'The daemon is on this one — clearing leaves it with no allocation to load'
            : 'Write this allocation into the config the daemon loads on its next start',
        },
        { label: 'Edit', onClick: () => setSheet({ kind: 'allocation', mode: 'edit', editId: id }) },
        ...(gateId == null
          ? []
          : [
              { label: 'Edit gate', onClick: () => setSheet({ kind: 'gate', mode: { kind: 'edit' as const, id: gateId } }) },
              {
                label: 'Copy gate',
                onClick: () => setSheet({ kind: 'gate', mode: { kind: 'copy' as const, id: gateId } }),
                title: 'Start a new gate from this one — the sixteen fields, under a new name',
              },
            ]),
        { label: '＋ New gate', onClick: () => setSheet({ kind: 'gate', mode: { kind: 'create' as const } }) },
        { label: 'Breaches → Risk Limits', to: '/risk/limits' },
      ]
    }
    return []
  }

  /** The rulebook's own write on an instance — the sheet adds it to the face's footer. */
  const instanceDelete = (id: number): TradeRecordAction[] => {
    const reading = data.instances.find((r) => r.id === id)
    const rec = rawInstances.find((r) => r.strategy_instance_id === id)
    const blocked = (reading?.fills ?? 0) > 0
    return [
      {
        label: blocked ? `Delete — ${reading?.fills} fills linked` : 'Delete…',
        onClick: () => {
          if (!blocked && rec) setSheet({ kind: 'instanceDelete', instance: rec })
        },
        disabled: blocked || !rec,
        title: blocked ? 'Unlink its fills on the Ledger first' : 'Nothing references it',
      },
    ]
  }
  /** The inline record's header: the face's ways out, then the write. */
  const instanceActions = (id: number): TradeRecordAction[] => {
    const reading = data.instances.find((r) => r.id === id)
    return [
      reading?.closed
        ? { label: 'Review this trade →', to: '/review/trade', title: 'Review › Trade review' }
        : { label: 'Position →', to: `/portfolio/positions?inst=${id}`, title: 'Portfolio › Positions — its open legs' },
      ...((reading?.fills ?? 0) > 0
        ? [{ label: 'Ledger →', to: `/portfolio/ledger?inst=${id}`, title: `Portfolio › Ledger — every fill booked to #${id}` }]
        : []),
      ...instanceDelete(id),
    ]
  }


  const record = useMemo(
    () =>
      buildRecord({
        focus,
        data,
        daemonAllocationId: daemon.allocationId,
        conditions:
          sel?.kind === 'opportunity' ? (oppDetail.isSuccess ? oppDetail.data.entry_conditions ?? [] : undefined) : undefined,
        boardSort,
        actions:
          sel?.kind === 'instance' && sel.id != null
            ? instanceActions(sel.id)
            : detailActions(sel ? sel.kind : focus.sym ? 'symbol' : 'structure'),
        siblings,
        on: { pick: (s2) => pickIt(s2), setSym, step },
      }),
    // detailActions / pickIt / setSym / step close over state already listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [focus, data, daemon.allocationId, oppDetail.isSuccess, oppDetail.data, boardSort, siblings, duplicating, rawInstances, trail],
  )

  /** The picked thing's instances, as records — the list needs the server's rows. */
  const scopedInstances = useMemo(() => {
    const ids = new Set(record?.scopedIds ?? [])
    return rawInstances.filter((i) => ids.has(i.strategy_instance_id))
  }, [record?.scopedIds, rawInstances])

  const book = useTradeBook({
    instances: scopedInstances,
    opportunities: data.opportunities,
    values: instanceFilters,
  })

  // ── Names for the path ──────────────────────────────────────────────────
  const nameOf = (f: Focus): string => {
    if (!f.pick && !f.sym) return 'Rules'
    let n = ''
    if (f.pick) {
      const id = f.pick.id
      if (id == null) n = 'Every trade'
      else if (f.pick.kind === 'opportunity') n = data.opportunities.find((o) => o.strategy_opportunity_id === id)?.name ?? `opportunity ${id}`
      else if (f.pick.kind === 'structure') n = data.structures.find((s) => s.strategy_structure_id === id)?.name ?? `structure ${id}`
      else if (f.pick.kind === 'allocation') n = data.allocations.find((a) => a.strategy_allocation_id === id)?.name ?? `allocation ${id}`
      else n = `#${id}${(() => { const r = data.instances.find((i) => i.id === id); return r ? ` · ${r.symbolish}` : '' })()}`
    }
    return f.sym ? (n ? `${n} · ${f.sym}` : f.sym) : n
  }
  const crumbs: Crumb[] = (() => {
    let out: Crumb[] = trail.map((k, i) => ({ label: nameOf(focusOfKey(k)), go: () => nav(focusOfKey(trail[i])) }))
    if (!trail.length || hasFocus(focusOfKey(trail[0]))) out.unshift({ label: 'Rules', go: () => nav(NO_FOCUS) })
    if (out.length > 4) out = [out[0], { label: '…' }, ...out.slice(-3)]
    out.push({ label: nameOf(focus) })
    return out
  })()
  const backTitle = `Esc or ⌥← · back to ${trail.length ? nameOf(focusOfKey(trail[trail.length - 1])) : 'Rules'}`

  const symbols = useMemo(() => allSymbols(data), [data])

  // Rev .120 — the symbol is the top bar's. Arriving, the page takes the
  // carried one only if some scope names it or an instance ran on it; any
  // other is left carried and said so, and the page stays unfiltered. Every
  // change of the step here (a symbol cell, Back, Release, the chip's ×)
  // writes the top bar; a set symbol reaches it through the URL.
  const carried = useCarriedSymbol()
  const refused = useRef<string | null>(null)
  useEffect(() => {
    if (loading || error || !focus.sym || symbols.includes(focus.sym)) return
    refused.current = focus.sym
    const next = { pick: focus.pick, sym: null }
    // Not a step on the path: carry the key over by hand, as `[` `]` do.
    lastKey.current = focusKey(next)
    navigate({ search: focusSearch(next) }, { replace: true })
  }, [loading, error, focus.sym, focus.pick, symbols, navigate])
  const lastSym = useRef(focus.sym)
  useEffect(() => {
    const prev = lastSym.current
    lastSym.current = focus.sym
    if (prev === focus.sym || focus.sym) return
    if (prev != null && refused.current === prev) {
      refused.current = null
      return
    }
    clearCarriedSymbol()
  }, [focus.sym])
  const unadopted = !loading && carried && carried !== focus.sym && !symbols.includes(carried) ? carried : null
  const focused = hasFocus(focus)
  const fromLabel = record
    ? `${record.title}${focus.sym && record.kind !== 'symbol' ? ` · ${focus.sym}` : ''}`
    : ''

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead
        title="Rules"
        info={PAGE_LEAD}
        actions={
          <>
            <PageHeadLink to="/risk/limits" title="Where a gate's hits land">
              Breaches · Risk Limits →
            </PageHeadLink>
            <PageHeadLink to="/review/playbook?tab=record" title="Does it pay?">
              Playbook record →
            </PageHeadLink>
            {/* The snapshot is what the reader is looking at: the chain plus
                whatever the focus narrows it to. */}
            <AskCopilotButton
              originPage="trade-rules"
              originLabel="Trade Rules"
              size="dense"
              snapshot={compactSnapshot({
                structures: data.structures.length,
                opportunities: data.opportunities.length,
                opportunities_in_no_allocation: orphanOpps || undefined,
                allocations: data.allocations.length,
                gates: data.gates.length,
                gates_carried_by_no_allocation: looseGates.length || undefined,
                instances_open: data.instances.filter((i) => !i.closed).length,
                instances_closed: data.instances.filter((i) => i.closed).length,
                daemon_allocation_id: daemon.allocationId ?? undefined,
                selected: sel == null ? undefined : `${sel.kind}:${sel.id}`,
                symbol: focus.sym ?? undefined,
                instances_in_view: scopedInstances.length || undefined,
              })}
              suggestedPrompt="这条规则链目前的结构合理吗？哪些机会没有被配置覆盖，哪些闸门形同虚设？"
            />
          </>
        }
      />

      <div data-sr-toolbar="" role="toolbar" aria-label="Rules">
        <span data-sr-tb="label">Show</span>
        <SegmentControl
          size="xs"
          ariaLabel="Show"
          value={activeOnly}
          onChange={setActiveOnly}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'all', label: 'All' },
          ]}
        />
        <span data-sr-tb="sep" />
        {/* Rev .120: no Symbol box — the symbol step is the top bar's symbol. */}
        <SymbolScopeChip symbol={focus.sym ?? ''} onClear={() => setSym(null, true)} />
        {unadopted ? (
          <span className="text-dense-meta text-muted-foreground" title="The top bar keeps it; this page is not filtered by it.">
            {unadopted} is in no scope and ran nowhere
          </span>
        ) : null}
        <span data-sr-tb="meta" className="flex flex-none items-center gap-2.5">
          {!focused ? (
            <span className="text-dense-label text-muted-foreground">
              Pick a card for its record · pick a symbol for every rule that can act on it
            </span>
          ) : (
            <button type="button" className={positionsUi.link} onClick={() => nav(NO_FOCUS)}>
              Release
            </button>
          )}
        </span>
      </div>

      {error ? <QueryErrorAlert error={error} onRetry={refetch} /> : null}
      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18.75rem),1fr))] gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <>
          {instancesEmpty ? (
            <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-warning/40 bg-[var(--sk-raised)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-warning">The strategy service returned no trades.</span>
              The rulebook has {data.opportunities.length} opportunities, so this is the service answering empty
              rather than a chain with nothing running — it does that now and then and answers in full a moment later.
              <button type="button" className={positionsUi.btn} onClick={refetch}>
                Ask again
              </button>
            </p>
          ) : null}

          <RulesReadings
            data={visible}
            loose={looseGates}
            daemonAllocationId={daemon.allocationId}
            orphansOnly={orphansOnly}
            onDaemon={(id) => pickIt({ kind: 'allocation', id })}
            onToggleOrphans={() => setOrphansOnly((v) => !v)}
            onGate={(g) => setSheet({ kind: 'gate', mode: { kind: 'edit', id: g.gate_safety_strategy_id } })}
          />

          {focused && lit ? (
            <LineageBar
              data={data}
              focus={focus}
              lit={lit}
              crumbs={crumbs}
              backTitle={backTitle}
              onBack={back}
              onPick={(s2) => pickIt(s2)}
              onClearSym={() => setSym(null, true)}
              chainOpen={chainOpen}
              onToggleChain={() => setChainOpen((v) => !v)}
            />
          ) : null}

          {!focused || chainOpen ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18.75rem),1fr))] items-start gap-3">
              {columns.map((column) => (
                <ChainColumnList
                  key={column.key}
                  column={column}
                  expanded={Boolean(expanded[column.key])}
                  onExpand={() => setExpanded((e) => ({ ...e, [column.key]: true }))}
                  onPick={(s2) => pickIt(s2)}
                  onNew={() => setSheet(NEW_SHEET[column.key])}
                  onPickAll={column.key === 'instance' ? () => pickIt({ kind: 'instance', id: null }) : undefined}
                  onSym={(y) => setSym(y, false)}
                  activeSym={focus.sym}
                />
              ))}
            </div>
          ) : null}

          {record ? (
            <RulesRecord model={record} boardSort={boardSort} onBoardSort={setBoardSort}>
              {record.kind === 'instance' && sel?.id != null
                ? (() => {
                    const inst = rawInstances.find((r) => r.strategy_instance_id === sel.id)
                    return inst ? (
                      <div className="border-t border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] px-3.5 py-3">
                        <TradeRecord key={inst.strategy_instance_id} instance={inst} mode="inline" {...instanceFaceOf(data, inst.strategy_instance_id)} />
                      </div>
                    ) : null
                  })()
                : null}
              {record.hasTable ? (
                scopedInstances.length === 0 ? (
                  <p className="m-0 border-t border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] px-3.5 py-4 text-dense-label text-[var(--sk-mute2)]">
                    Nothing has run under this yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 border-t border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] px-3 py-2.5">
                    <InstanceListFilters
                      options={book.filterOptions}
                      values={instanceFilters}
                      sinceRangeText={book.sinceRangeText}
                      filteredCount={book.filtered.length}
                      totalCount={scopedInstances.length}
                      onChange={(patch) => setInstanceFilters((prev) => ({ ...prev, ...patch }))}
                      onClear={() => setInstanceFilters(NO_FILTERS)}
                      hideSymbol
                      onExpandAll={() =>
                        setCollapsedGroups((prev) => createCollapsedGroupsState(book.groups, 'multi', prev, 'expandAll'))
                      }
                      onCollapseAll={() =>
                        setCollapsedGroups((prev) => createCollapsedGroupsState(book.groups, 'multi', prev, 'collapseAll'))
                      }
                      showGroupToolbar={book.groups.length > 0}
                      groupSlot={
                        // Grouping by symbol only means something with more than one.
                        !focus.sym && book.groups.length > 1 ? (
                          <span className="flex items-center gap-1.5">
                            <span className="text-dense-micro font-semibold text-muted-foreground">Group</span>
                            <SegmentControl
                              size="xs"
                              ariaLabel="Group"
                              value={flat ? 'none' : 'symbol'}
                              onChange={(v) => setFlat(v === 'none')}
                              options={[
                                { value: 'symbol', label: 'Symbol' },
                                { value: 'none', label: 'None' },
                              ]}
                            />
                          </span>
                        ) : undefined
                      }
                    />
                    <InstancesGroupedTable
                      groups={book.groups}
                      metricsMap={book.metricsMap}
                      detailViewMode="multi"
                      collapsedGroups={collapsedGroups}
                      onToggleGroup={(k) =>
                        setCollapsedGroups((prev) => createCollapsedGroupsState(book.groups, 'multi', prev, 'toggle', k))
                      }
                      flat={flat || focus.sym != null}
                      showOpportunity={record.multiOpp}
                      onDrill={(inst, ids) =>
                        pickIt({ kind: 'instance', id: inst.strategy_instance_id }, { ids, from: fromLabel })
                      }
                      onSym={(y) => setSym(y, true)}
                      tokenFrom={fromLabel}
                      onCompare={(inst) => {
                        const id = inst.strategy_instance_id
                        if (compareWith == null || compareWith === id) {
                          setCompareWith(compareWith === id ? null : id)
                          return
                        }
                        setCompareWith(null)
                        openTradePair(openInstance, compareWith, id, 'Rules')
                      }}
                      activeDetailId={null}
                      compareId={compareWith}
                      compareAnywhere
                    />
                    <p className="m-0 text-dense-micro text-muted-foreground">
                      <span className="text-[var(--color-unrealized)]">orange</span> = open, unrealized · Realised
                      counts closed only
                    </p>
                    {compareWith != null ? (
                      <p className="m-0 flex flex-wrap items-center gap-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                        <span className="font-semibold text-secondary-foreground">#{compareWith} is held for comparison.</span>
                        Pick a second trade’s ⇄ to open the two side by side — one in the panel, one floating.
                        <button type="button" className={positionsUi.btn} onClick={() => setCompareWith(null)}>
                          Drop it
                        </button>
                      </p>
                    ) : null}
                  </div>
                )
              ) : null}
            </RulesRecord>
          ) : null}

          <RulesSheets sheet={sheet} onClose={() => setSheet(NO_SHEET)} status={status.data} />

          <SetActiveDialog
            open={setActiveFor !== undefined}
            data={data}
            allocationId={setActiveFor ?? null}
            currentStructureId={status.data?.strategy?.active?.structure?.id ?? null}
            onClose={() => setSetActiveFor(undefined)}
          />

          <p className="m-0 border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty mat-card">
            <span className="font-semibold text-secondary-foreground">Boundary.</span> Nothing writes from a click on
            this page. Edit and Duplicate open the Strategy pages&rsquo; own forms, so a rule changed here and one
            changed there are the same write with the same validation. Activating an allocation is what the daemon
            reads on its next start, which is why it sits behind a form with a confirm. A trade the fills have
            claimed cannot be deleted at all — unlink them on the Ledger first, or the fills are orphaned. None
            of this is an order: D10 governs the desk, not the rulebook.
          </p>
        </>
      )}
    </PageShell>
  )
}
