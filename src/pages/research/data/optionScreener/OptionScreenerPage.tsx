/**
 * Contract Screener — walked against `Research Contract Screener.dc.html`
 * (Rev 2026-09-19.2) on 2026-09-22.
 *
 * ## The design's argument, and where this page sat outside it
 *
 * The design's own description places this page third: *Stock Explorer picks
 * companies, Option Scan picks underlyings with premium, this picks the
 * contracts that fit a structure.* The page had no first step at all — it
 * opened on an empty textarea, which asks the reader to retype a list three
 * other pages already hold. And it had no funnel, which is the design's one
 * device for the thing this page does most: return nothing.
 *
 * Built: the funnel strip, `1 · Underlyings` with its sources, and the
 * numbered rail the design draws around the structure and the filters.
 *
 * ## The engine is dark, and the page now says so
 *
 * Measured on DEV 2026-09-22, and it is the finding of this walk:
 * `POST /research/screener` answers `ok: true` with `total_contracts: 0` for
 * every symbol tried — including ANET, which the market-data plugin's own
 * coverage reports as **2,150 contracts across 21 expiries**, newest stamped
 * the same morning. It answers the same at every `source` value (`massive`,
 * `ib`, `polygon`, `chain`, `snapshot`, and omitted) and with the filters
 * opened to their widest: DTE 7–120, P(ITM) ≤ 90%, return ≥ 0, spread ≤ 50%,
 * premium ≥ 0, earnings allowed. The engine gives the same reason each time —
 * *No snapshot data — run Market Data Plugin sync first* — so the emptiness
 * is neither the filters nor the symbols; the screener reads a snapshot store
 * that the plugin's contract coverage does not fill.
 *
 * The contracts table is therefore **not rebuilt**. It cannot be checked
 * against a single row, and a table reshaped against a design without ever
 * being seen with data in it is the walk failing quietly. What is built is
 * the half that makes the dark engine legible: the funnel names the stage
 * that emptied and carries the engine's own sentence.
 *
 * ## Diverged, with its reason
 *
 * **The Run button stays**, against the design's *"live — no Run button"*.
 * The call takes **15–31 seconds** on DEV. Re-running on every slider move
 * would fire a half-minute request per drag, and the design's phrase
 * describes a prototype that computes its chain in the browser.
 */
import { useEffect, useMemo, useState } from 'react'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { PageHeader, PageShell } from '@/components/layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { OpportunityFormModal } from '@/components/strategy/OpportunityFormModal'
import type { PrefillData } from '@/components/strategy/OpportunityFormModal'
import { useOptionScreener } from '@/hooks/useOptionScreener'
import type { ScreenerFilters } from '@/types/research'
import { OptionScreenerFilterPanel } from './OptionScreenerFilterPanel'
import { OptionScreenerFunnel } from './OptionScreenerFunnel'
import { OptionScreenerSources } from './OptionScreenerSources'
import { screenerFunnel } from './screenerFunnelModel'
import { useScreenerSources, type ScreenerSource } from './useScreenerSources'
import { OptionScreenerResultsBar } from './OptionScreenerResultsBar'
import { OptionScreenerSymbolGroup } from './OptionScreenerSymbolGroup'
import { OptionScreenerWarnings } from './OptionScreenerWarnings'
import { loadSavedFilters, STRUCTURE_LABEL } from './optionScreenerConstants'
import { exportScreenerCsv } from './optionScreenerExport'
import {
  optionScreenerGroupListClass,
  optionScreenerSymbolsTextareaClass,
} from './optionScreenerUi'

export default function OptionScreenerPage() {
  const [filters, setFilters] = useState<ScreenerFilters>(loadSavedFilters)
  const [symbolsText, setSymbolsText] = useState(() => filters.symbols.join('\n'))
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [saveSymbol, setSaveSymbol] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [sourceId, setSourceId] = useState<string | null>(null)

  const mutation = useOptionScreener()
  const { sources } = useScreenerSources()

  const picked = useMemo(
    () =>
      symbolsText
        .split(/[\n,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    [symbolsText],
  )

  useEffect(() => {
    localStorage.setItem('optionScreenerFilters', JSON.stringify(filters))
  }, [filters])

  function pickSource(source: ScreenerSource) {
    // Replace, never accumulate: the design's source buttons are exclusive,
    // and a picker that adds leaves you unable to say what you are screening.
    if (!source.symbols) return
    setSourceId(source.id)
    setSymbolsText(source.take.join('\n'))
    if (runError) setRunError(null)
  }

  function dropSymbol(symbol: string) {
    setSymbolsText(picked.filter((s) => s !== symbol).join('\n'))
  }

  function handleRun() {
    const symbols = picked
    if (symbols.length === 0) {
      setRunError('Enter at least one symbol.')
      return
    }
    setRunError(null)
    const f = { ...filters, symbols }
    setFilters(f)
    mutation.mutate(f, {
      onSuccess: data => {
        if (!data.ok && data.error) setRunError(data.error)
      },
    })
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
    <PageShell className="space-y-3">
      <PageHeader
        title="Option screen"
        description="Third step of Discover: Stock Explorer picks companies, Option Scan picks underlyings with premium, this picks the contracts that fit a structure."
        actions={
          <AskCopilotButton
            originPage="screener"
            originLabel="Option Screener"
            symbol={
              symbolsText.split(/[\n,\s]+/).map((s) => s.trim().toUpperCase()).find(Boolean)
            }
            snapshot={compactSnapshot({
              structure_type: filters.structure_type,
              group_count: groups.length,
            })}
            suggestedPrompt="Interpret these option screener results and flag contracts worth a closer look."
          />
        }
      />

      {/* The design's own device for the thing this page does most: return
          nothing. It names the stage that emptied and carries the engine's
          own sentence for it. */}
      <OptionScreenerFunnel
        cells={screenerFunnel(
          picked,
          STRUCTURE_LABEL[filters.structure_type] ?? filters.structure_type,
          mutation.data ?? null,
        )}
      />

      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-[280px] flex-[0_1_320px] flex-col gap-2.5">
          <OptionScreenerSources
            sources={sources}
            activeId={sourceId}
            symbols={picked}
            onPickSource={pickSource}
            onDrop={dropSymbol}
          >
            <textarea
              className={optionScreenerSymbolsTextareaClass}
              placeholder={'or type them: ANET\nCAVA'}
              aria-label="Symbols"
              value={symbolsText}
              onChange={(e) => {
                setSymbolsText(e.target.value)
                setSourceId(null)
                if (runError) setRunError(null)
              }}
            />
          </OptionScreenerSources>
          <OptionScreenerFilterPanel
            filters={filters}
            isPending={mutation.isPending}
            onFiltersChange={(updater) => setFilters(updater)}
            onRun={handleRun}
          />
        </div>

        <div className="min-w-0 flex-[999_1_600px] space-y-3">

      {(runError || mutation.isError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {runError ??
              (mutation.error instanceof Error && mutation.error.name === 'AbortError'
                ? 'Request timed out after 60 seconds.'
                : (mutation.error as Error).message)}
          </AlertDescription>
        </Alert>
      )}

      {mutation.data?.ok && (
        <OptionScreenerResultsBar
          data={mutation.data}
          onExport={() => exportScreenerCsv(groups, filters.structure_type)}
        />
      )}

      <OptionScreenerWarnings warnings={warnings} />

      {mutation.data && groups.length === 0 ? (
        <div className="rounded-lg border border-border px-4 py-6 text-center">
          <p className="text-dense-body font-semibold">No contract passes</p>
          <p className="mx-auto mt-1 max-w-[70ch] text-dense-meta leading-relaxed text-muted-foreground">
            The funnel above says which stage emptied. When <span className="font-mono">Screened</span>{' '}
            reads 0 it is the chain store rather than anything on this page: the screener reads an
            option snapshot that the market-data plugin&rsquo;s contract coverage does not fill, and
            it says so per symbol.
          </p>
        </div>
      ) : null}

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

        </div>
      </div>

      <OpportunityFormModal
        key={saveSymbol ?? 'screener-save'}
        open={saveSymbol != null}
        onClose={() => setSaveSymbol(null)}
        prefill={prefillData}
      />
    </PageShell>
  )
}
