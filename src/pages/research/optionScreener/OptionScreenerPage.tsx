import { useEffect, useMemo, useState } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { OpportunityFormModal } from '@/components/strategy/OpportunityFormModal'
import type { PrefillData } from '@/components/strategy/OpportunityFormModal'
import { useOptionScreener } from '@/hooks/useOptionScreener'
import type { ScreenerFilters } from '@/types/research'
import { OptionScreenerFilterPanel } from './OptionScreenerFilterPanel'
import { OptionScreenerResultsBar } from './OptionScreenerResultsBar'
import { OptionScreenerSymbolGroup } from './OptionScreenerSymbolGroup'
import { OptionScreenerWarnings } from './OptionScreenerWarnings'
import { loadSavedFilters, STRUCTURE_LABEL } from './optionScreenerConstants'
import { exportScreenerCsv } from './optionScreenerExport'
import { optionScreenerGroupListClass } from './optionScreenerUi'

export default function OptionScreenerPage() {
  const [filters, setFilters] = useState<ScreenerFilters>(loadSavedFilters)
  const [symbolsText, setSymbolsText] = useState(() => filters.symbols.join('\n'))
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [saveSymbol, setSaveSymbol] = useState<string | null>(null)

  const mutation = useOptionScreener()

  useEffect(() => {
    localStorage.setItem('optionScreenerFilters', JSON.stringify(filters))
  }, [filters])

  function handleRun() {
    const symbols = symbolsText
      .split(/[\n,\s]+/)
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
    const f = { ...filters, symbols }
    setFilters(f)
    mutation.mutate(f)
    setExpandedGroups(new Set(symbols))
  }

  function toggleGroup(symbol: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }

  const groups = mutation.data?.groups ?? []

  const warnings = useMemo(() => {
    const w = mutation.data?.warnings ?? {}
    return Object.entries(w)
  }, [mutation.data])

  const prefillData: PrefillData | undefined =
    saveSymbol != null
      ? {
          name: `${saveSymbol} ${STRUCTURE_LABEL[filters.structure_type] ?? filters.structure_type}`,
          structureId: '',
          gateSafetyId: '',
          scopeType: 'explicit_symbols',
          symbols: [saveSymbol],
          conditions: [],
        }
      : undefined

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Option Screener"
        description="Screen options contracts by structure type and filters"
      />

      <OptionScreenerFilterPanel
        filters={filters}
        symbolsText={symbolsText}
        isPending={mutation.isPending}
        onFiltersChange={updater => setFilters(updater)}
        onSymbolsTextChange={setSymbolsText}
        onRun={handleRun}
      />

      {mutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {mutation.error instanceof Error && mutation.error.name === 'AbortError'
              ? 'Request timed out after 60 seconds.'
              : (mutation.error as Error).message}
          </AlertDescription>
        </Alert>
      )}

      {mutation.data && (
        <OptionScreenerResultsBar
          data={mutation.data}
          onExport={() => exportScreenerCsv(groups, filters.structure_type)}
        />
      )}

      <OptionScreenerWarnings warnings={warnings} />

      {groups.length > 0 && (
        <div className={optionScreenerGroupListClass}>
          {groups.map(g => (
            <OptionScreenerSymbolGroup
              key={g.symbol}
              group={g}
              expanded={expandedGroups.has(g.symbol)}
              onToggle={() => toggleGroup(g.symbol)}
              onSave={setSaveSymbol}
            />
          ))}
        </div>
      )}

      <OpportunityFormModal
        key={saveSymbol ?? 'screener-save'}
        open={saveSymbol != null}
        onOpenChange={v => {
          if (!v) setSaveSymbol(null)
        }}
        prefill={prefillData}
      />
    </PageShell>
  )
}
