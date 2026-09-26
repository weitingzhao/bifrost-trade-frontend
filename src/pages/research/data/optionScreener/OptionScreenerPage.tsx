/**
 * Option screen — rebuilt 2026-09-23 against `Research Contract Screener.dc.html`
 * (page rev 2026-09-20.10), in the prototype's order: header, funnel, the
 * numbered rail beside the Contracts table.
 *
 * The walk of 2026-09-22 kept a Run button and left the table unbuilt, because
 * the engine answers nothing on DEV. The Owner chose to build the design's
 * page anyway and fix the engine separately, so this is the design's shape:
 *
 * - **Live, no Run button.** The engine is asked once per name, structure and
 *   earnings choice, at the widest window a slider can reach; the six sliders
 *   filter that in the browser (`screenerModel.ts`). A drag never refetches.
 *   One request per name, because three in one request ran past the 60-second
 *   abort at that window (`useScreenerChain.ts`).
 * - **The table is always drawn**, and when it has nothing in it the panel says
 *   which of the reasons it is — no names picked, screening, the engine
 *   returned no chain, or every contract fails a filter.
 *
 * What DEV cannot show yet is any row: `POST /research/screener` returns no
 * chain for any name, because the market-data plugin's `/options/chain/latest`
 * answers empty (measured 2026-09-23, tracked as its own task). Everything
 * with a row in it is built from the response's own fields and checked by
 * the model's tests, not against a live row.
 */
import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { PageHeader, PageShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { OpportunityFormModal } from '@/components/strategy/OpportunityFormModal'
import { STORAGE_KEYS } from '@/constants/storage'
import { usePageViewState } from '@/lib/pageView'
import { notify } from '@/lib/shellNotify'
import { useOpportunities } from '@/hooks/useStrategies'
import { OptionScreenerContracts } from './OptionScreenerContracts'
import { OptionScreenerFunnel } from './OptionScreenerFunnel'
import { FiltersPanel, StructurePanel } from './OptionScreenerRail'
import { OptionScreenerSources } from './OptionScreenerSources'
import { STRUCTURE_LABEL, STRUCTURE_TYPES } from './optionScreenerConstants'
import { exportScreenerCsv } from './optionScreenerExport'
import {
  buildScreenGroups,
  DEFAULT_LIVE_FILTERS,
  screenerFunnel,
  type LiveFilters,
  type ScreenView,
} from './screenerModel'
import { useScreenerChain } from './useScreenerChain'
import { useScreenerSources, type ScreenerSource } from './useScreenerSources'

interface Saved {
  symbols: string[]
  structure: string
  filters: LiveFilters
  includeEarnings: boolean
}

const FRESH: Saved = {
  symbols: [],
  structure: 'cash_secured_put',
  filters: DEFAULT_LIVE_FILTERS,
  includeEarnings: false,
}

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.optionScreenerLive)
    if (!raw) return FRESH
    const s = JSON.parse(raw) as Partial<Saved>
    return {
      symbols: Array.isArray(s.symbols) ? s.symbols : [],
      structure: typeof s.structure === 'string' ? s.structure : FRESH.structure,
      filters: { ...DEFAULT_LIVE_FILTERS, ...(s.filters ?? {}) },
      includeEarnings: s.includeEarnings === true,
    }
  } catch {
    return FRESH
  }
}

const LEDE =
  'Third step of Discover: Stock Explorer picks companies, Option Scan picks underlyings with premium, this picks the contracts that fit a structure. Results re-run as you move a filter; every row ends in ＋ Plan this.'

export default function OptionScreenerPage() {
  const [saved] = useState(loadSaved)
  const [symbols, setSymbols] = useState<string[]>(saved.symbols)
  const [structure, setStructure] = useState(saved.structure)
  const [filters, setFilters] = useState<LiveFilters>(saved.filters)
  const [includeEarnings, setIncludeEarnings] = useState(saved.includeEarnings)
  // View state (Rev .79 `source · view · sel`); struct, f and earnOk are
  // already kept across sessions above.
  const [view, setView] = usePageViewState<ScreenView>('view', 'grouped')
  const [selected, setSelected] = usePageViewState<string | null>('sel', null)
  const [sourceId, setSourceId] = usePageViewState<string | null>('source', null)
  const [saveOpen, setSaveOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.optionScreenerLive,
        JSON.stringify({ symbols, structure, filters, includeEarnings } satisfies Saved),
      )
    } catch {
      // Private window or blocked storage: the page works, it just forgets.
    }
  }, [symbols, structure, filters, includeEarnings])

  const { sources } = useScreenerSources()
  const opportunities = useOpportunities()
  const structureOn = STRUCTURE_TYPES.some((s) => s.value === structure && s.enabled)
  const chain = useScreenerChain({ symbols, structure, includeEarnings, enabled: structureOn })
  const data = chain.data

  const failed = useMemo(() => {
    const out: Record<string, string> = {}
    for (const sym of data?.symbols_failed ?? []) out[sym] = data?.warnings?.[sym] ?? 'the engine returned nothing'
    return out
  }, [data])

  const groups = useMemo(
    () => buildScreenGroups(data?.groups ?? [], filters, view, failed, chain.pending),
    [data?.groups, filters, view, failed, chain.pending],
  )
  const pass = groups.reduce((n, g) => n + g.rows.length, 0)
  const sourceLabel = sources.find((s) => s.id === sourceId)?.label ?? null

  const funnel = screenerFunnel({
    picked: symbols,
    sourceLabel,
    data,
    loading: chain.isFetching,
    f: filters,
    groups,
    pending: chain.pending,
  })

  const status = ((): Parameters<typeof OptionScreenerContracts>[0]['status'] => {
    if (symbols.length === 0) {
      return {
        kind: 'empty',
        title: 'Pick underlyings',
        detail: 'Choose a source in step 1, or add a symbol. The table fills when the engine answers.',
      }
    }
    if (!data && chain.pending.length > 0) {
      return {
        kind: 'empty',
        title: `Screening ${symbols.length} name${symbols.length === 1 ? '' : 's'}…`,
        detail:
          'About ten seconds a name. Once it answers the sliders are live — moving one never re-screens; changing the names, the structure or earnings does.',
      }
    }
    if (groups.length === 0) {
      // Passing only drops the names with no chain, so an empty table there
      // can mean the engine returned nothing at all — which is not the same
      // as every contract failing a filter, and loosening one will not help.
      const scanned = data?.symbols_scanned?.length ?? 0
      const noChain = scanned > 0 && (data?.symbols_failed?.length ?? 0) >= scanned
      const reason = Object.values(data?.warnings ?? {})[0]
      return noChain
        ? {
            kind: 'empty',
            title: 'No name has a chain',
            detail: `The engine returned no chain for any of the ${scanned} names${reason ? ` — “${reason}”` : ''}. That is the chain store, not a filter: no slider will change it.`,
          }
        : {
            kind: 'empty',
            title: 'No contract passes',
            detail: 'Every contract in the window fails a filter. The funnel strip says which stage empties.',
          }
    }
    return { kind: 'rows' }
  })()

  function pickSource(source: ScreenerSource) {
    // Replace, never accumulate: the design's source buttons are exclusive.
    if (!source.symbols) return
    setSourceId(source.id)
    setSymbols(source.take)
    setSelected(null)
  }

  const structureLabel = STRUCTURE_LABEL[structure] ?? structure

  return (
    <PageShell className="space-y-3">
      <PageHeader
        title="Option screen"
        description={LEDE}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-dense-meta"
              disabled={pass === 0}
              title={pass === 0 ? 'Nothing passes, so there is nothing to export' : `Export the ${pass} passing rows`}
              onClick={() => exportScreenerCsv(groups, structure)}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-dense-meta"
              disabled={symbols.length === 0}
              title="Turns these names and this structure into an Opportunity in Trade › Rules — the daemon then screens daily"
              onClick={() => setSaveOpen(true)}
            >
              Save as rule →
            </Button>
            <AskCopilotButton
              originPage="screener"
              originLabel="Option screen"
              symbol={symbols[0]}
              snapshot={compactSnapshot({ structure_type: structure, names: symbols.length, pass })}
              suggestedPrompt="Interpret these option screener results and flag contracts worth a closer look."
            />
          </div>
        }
      />

      <OptionScreenerFunnel cells={funnel} />

      <div className="flex flex-wrap items-start gap-3">
        <aside className="flex min-w-[280px] flex-[0_1_320px] flex-col gap-2.5">
          <OptionScreenerSources
            sources={sources}
            activeId={sourceId}
            symbols={symbols}
            onPickSource={pickSource}
            onDrop={(sym) => {
              // With Undo (Rev .79): the list and the source come back as they were.
              const prev = { symbols, sourceId }
              setSymbols(symbols.filter((s) => s !== sym))
              setSourceId(null)
              notify(`${sym} removed from the source`, {
                undo: () => {
                  setSymbols(prev.symbols)
                  setSourceId(prev.sourceId)
                },
              })
            }}
            onAdd={(add) => {
              setSymbols((prev) => [...new Set([...prev, ...add])])
              setSourceId(null)
            }}
          />
          <StructurePanel value={structure} onChange={setStructure} />
          <FiltersPanel
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_LIVE_FILTERS)}
            includeEarnings={includeEarnings}
            onIncludeEarnings={setIncludeEarnings}
          />
        </aside>

        <OptionScreenerContracts
          groups={groups}
          pass={pass}
          view={view}
          onView={setView}
          filters={filters}
          opportunities={opportunities.data?.items}
          selected={selected}
          onSelect={setSelected}
          source="massive"
          status={status}
        />
      </div>

      <OpportunityFormModal
        key={saveOpen ? 'screener-save-open' : 'screener-save'}
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        prefill={{
          name: `${structureLabel} · ${sourceLabel?.split(' ·')[0] ?? symbols.join(' ')}`,
          structureId: '',
          gateSafetyId: '',
          scopeType: 'explicit_symbols',
          symbols,
          conditions: [],
        }}
      />
    </PageShell>
  )
}
