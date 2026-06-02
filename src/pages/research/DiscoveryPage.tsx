import { useCallback, useMemo } from 'react'
import { discoveryRootClass } from './discovery/discoveryUi'
import { postWatchlistItem } from '@/api/market'
import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import { PageShell } from '@/components/layout'
import { useDiscoveryNav } from '@/hooks/useDiscoveryNav'
import { DiscoveryPageHeader } from '@/components/optionDiscovery/DiscoveryPageHeader'
import { OdSessionBar } from '@/components/optionDiscovery/OdSessionBar'
import { OdStickyToc } from '@/components/optionDiscovery/OdStickyToc'
import { OptionDiscoveryCompareDrawer } from '@/components/optionDiscovery/OptionDiscoveryCompareDrawer'
import { OptionContractDrawer } from '@/components/optionDiscovery/OptionContractDrawer'
import { OptionContractDetailPanel } from '@/components/optionDiscovery/OptionContractDetailPanel'
import { useOptionContractLiquidity } from '@/components/optionDiscovery/useOptionContractLiquidity'
import { useDiscoverySession } from '@/hooks/useDiscoverySession'
import { useDiscoveryCompare } from '@/hooks/useDiscoveryCompare'
import { useWatchlistStkSymbols } from '@/hooks/useWatchlistStkSymbols'
import { useMassiveDiscoveryStatus, useMassiveDailyChecklist } from '@/hooks/useMassiveDiscoveryStatus'
import { useDiscoverySymbolBenchmark } from '@/hooks/useDiscoverySymbolBenchmark'
import { useDiscoveryGreeksCoverage } from '@/hooks/useDiscoveryGreeksCoverage'
import { useDiscoveryExpirations } from '@/hooks/useDiscoveryExpirations'
import { useDiscoverySnapshots } from '@/hooks/useDiscoverySnapshots'
import { useDiscoveryIvTerm } from '@/hooks/useDiscoveryIvTerm'
import { parseDteNumeric } from '@/utils/optionDiscovery/optionContractMetrics'
import { expirationDaysFromToday } from '@/utils/optionDiscovery/expirationMeta'
import { DiscoveryUnderlyingBar } from './discovery/DiscoveryUnderlyingBar'
import { DiscoveryIvTermBlock } from './discovery/DiscoveryIvTermBlock'
import { DiscoveryChainLayers } from './discovery/DiscoveryChainLayers'
import { useDiscoveryStrikeWindow } from './discovery/useDiscoveryStrikeWindow'
import { useDiscoveryChainTable } from './discovery/useDiscoveryChainTable'

export default function DiscoveryPage() {
  const { openMassiveFeed } = useDiscoveryNav()
  const { symbols: stkSymbols } = useWatchlistStkSymbols()
  const { data: massiveStatus } = useMassiveDiscoveryStatus()
  const session = useDiscoverySession()
  const {
    selectedSymbol,
    setSelectedSymbol,
    selectedExpiration,
    setSelectedExpiration,
    underlyingInput,
    setUnderlyingInput,
    applyUnderlyingFromInput,
    strikeCountOption,
    setStrikeCountOption,
    stdDevOption,
    setStdDevOption,
    customStdDev,
    setCustomStdDev,
    strikeSideMode,
    setStrikeSideMode,
    chainColumnVisibility,
    toggleChainColumn,
    greeksSource,
    setGreeksSource,
  } = session

  const dailyChecklistQuery = useMassiveDailyChecklist(selectedSymbol, massiveStatus?.configured)
  const dailyDims =
    dailyChecklistQuery.data?.ok && selectedSymbol.trim()
      ? (dailyChecklistQuery.data.symbols?.[selectedSymbol.trim().toUpperCase()] ?? null)
      : null
  const dailyDimsDate = dailyChecklistQuery.data?.trade_date ?? null
  const dailyDimsLoading = dailyChecklistQuery.isLoading

  const { data: symbolBenchmarkMap } = useDiscoverySymbolBenchmark(selectedSymbol)
  const symbolDailyPrices = symbolBenchmarkMap ?? {}

  const {
    compareOpen,
    setCompareOpen,
    compareRows,
    setCompareRows,
    addToCompare: handleAddToCompare,
  } = useDiscoveryCompare()

  const expirationsState = useDiscoveryExpirations(
    selectedSymbol,
    selectedExpiration,
    setSelectedExpiration,
  )
  const {
    strikes,
    stockDayLastPrice,
    expirationsLoading,
    strikesLoading,
    expirationsError,
    expirationFilterKind,
    setExpirationFilterKind,
    visibleExpirations,
    multiSelectStrikes,
    setMultiSelectStrikes,
    expirations,
  } = expirationsState

  const strikeCore = useDiscoveryStrikeWindow({
    strikes,
    stockDayLastPrice,
    strikeCountOption,
    stdDevOption,
    customStdDev,
    multiSelectStrikes,
    snapshotRows: [],
  })

  const snapshots = useDiscoverySnapshots({
    selectedSymbol,
    selectedExpiration,
    effectiveStrikes: strikeCore.effectiveStrikes,
    strikesWatchKey: strikeCore.strikesWatchKey,
    stockDayLastPrice,
  })

  const strikeWindow = useDiscoveryStrikeWindow({
    strikes,
    stockDayLastPrice,
    strikeCountOption,
    stdDevOption,
    customStdDev,
    multiSelectStrikes,
    snapshotRows: snapshots.snapshotRows,
  })

  const ivTerm = useDiscoveryIvTerm({
    selectedSymbol,
    expirations,
    visibleExpirations,
    effectiveStrikes: strikeCore.effectiveStrikes,
    massiveConfigured: Boolean(massiveStatus?.configured),
    expirationsLoading,
    expirationsError,
  })

  const chainTable = useDiscoveryChainTable({
    snapshotRows: snapshots.snapshotRows,
    underlyingPrice: snapshots.underlyingPrice,
    selectedExpiration,
    chainColumnVisibility,
    greeksSource,
    strikeSideMode,
    selectedContractKey: snapshots.selectedContractKey,
    setSelectedContractKey: snapshots.setSelectedContractKey,
  })

  const { data: greeksCoverage } = useDiscoveryGreeksCoverage(
    selectedSymbol,
    selectedExpiration,
    snapshots.snapshotRows.length,
  )

  const { setAddWatchlistFeedback } = snapshots
  const handleAddToWatchlist = useCallback(
    async (row: OptionSnapshotRow) => {
      const sym = selectedSymbol.trim()
      const exp = selectedExpiration.trim()
      if (!sym || !exp) return
      const contract_key = `${sym}|OPT|${exp}|${row.strike}|${row.right}`
      setAddWatchlistFeedback(null)
      const res = await postWatchlistItem({
        contract_key,
        symbol: sym,
        sec_type: 'OPT',
        expiry: exp,
        strike: row.strike,
        option_right: row.right,
        source: 'option_discovery',
      })
      if (res.ok) setAddWatchlistFeedback(contract_key)
      else setAddWatchlistFeedback(res.error ?? 'Add failed')
    },
    [selectedSymbol, selectedExpiration, setAddWatchlistFeedback],
  )

  const eventContextWarnings = useMemo(() => {
    const warnings: string[] = []
    const dte = parseDteNumeric(selectedExpiration)
    if (dte != null && dte <= 3) warnings.push(`DTE is ${dte} — high theta decay, exercise/assignment risk.`)
    if (dte != null && dte === 0) warnings.push('Expiration day — avoid market orders, liquidity may vanish.')
    if (greeksCoverage?.freshness?.stale_rows != null && greeksCoverage.freshness.stale_rows > 0) {
      warnings.push(`${greeksCoverage.freshness.stale_rows} stale snapshot row(s) older than 24h.`)
    }
    return warnings
  }, [selectedExpiration, greeksCoverage])

  const {
    liquidityLastTrade,
    liquidityQuoteCount,
    liquidityLoading,
    serverLiquidity,
    serverRelativeValue,
  } = useOptionContractLiquidity(
    selectedSymbol,
    selectedExpiration,
    chainTable.selectedRow,
  )

  const canLoadQuotes =
    selectedSymbol.trim() !== '' && selectedExpiration.trim() !== '' && !snapshots.snapshotLoading

  return (
    <PageShell padding="default" className={discoveryRootClass}>
      <DiscoveryPageHeader massiveStatus={massiveStatus ?? null} />

      <OdSessionBar
        massiveStatus={massiveStatus ?? null}
        selectedSymbol={selectedSymbol}
        dailyDims={dailyDims}
        dailyDimsDate={dailyDimsDate}
        dailyDimsLoading={dailyDimsLoading}
        onOpenMassiveFeed={openMassiveFeed}
      />

      <div className="mt-3">
        <div className="w-full min-w-0">
          <div className="flex flex-col gap-4 min-w-0">
            <div className="sticky top-2 z-[3] -mx-1 rounded-lg border border-border bg-card shadow-sm overflow-visible">
              <DiscoveryUnderlyingBar
                underlyingInput={underlyingInput}
                setUnderlyingInput={setUnderlyingInput}
                applyUnderlyingFromInput={applyUnderlyingFromInput}
                stkSymbols={stkSymbols}
                symbolDailyPrices={symbolDailyPrices}
                selectedSymbol={selectedSymbol}
                setSelectedSymbol={setSelectedSymbol}
              />
              <OdStickyToc
                selectedSymbol={selectedSymbol}
                selectedExpiration={selectedExpiration}
                underlyingPrice={snapshots.underlyingPrice}
                compareCount={compareRows.length}
                onOpenCompare={() => setCompareOpen(true)}
              />
            </div>

            <DiscoveryIvTermBlock
              selectedSymbol={selectedSymbol}
              visibleExpirations={visibleExpirations}
              expirationFilterKind={expirationFilterKind}
              onExpirationFilterKindChange={setExpirationFilterKind}
              ivTermExpKeys={ivTerm.ivTermExpKeys}
              onToggleExpiration={ivTerm.toggleIvTermExpiration}
              onResetExpirationsToDefault={ivTerm.resetIvTermExpirationsToDefault}
              onSelectAllExpirations={ivTerm.selectAllIvTermExpirations}
              onUncheckAllExpirations={ivTerm.uncheckAllIvTermExpirations}
              massiveBackfillAvailable={Boolean(massiveStatus?.configured)}
              onBackfillMassiveSnapshots={() => void ivTerm.syncIvTermMassiveSnapshots()}
              snapshotSyncLoading={ivTerm.ivTermSyncLoading}
              snapshotSyncStatus={ivTerm.ivTermSyncStatus}
              onLoad={() => void ivTerm.loadIvTermStructure()}
              termPoints={ivTerm.termPoints}
              termLoading={ivTerm.termLoading}
              termError={ivTerm.termError}
              conePoints={ivTerm.conePoints}
              coneError={ivTerm.coneError}
              expirationsLoading={expirationsLoading}
              expirationsError={expirationsError}
            />

            <DiscoveryChainLayers
              selectedSymbol={selectedSymbol}
              selectedExpiration={selectedExpiration}
              setSelectedExpiration={setSelectedExpiration}
              visibleExpirations={visibleExpirations}
              massiveStatus={massiveStatus ?? null}
              strikesLoading={strikesLoading}
              strikes={strikes}
              stockDayLastPrice={stockDayLastPrice}
              strikeCountOption={strikeCountOption}
              setStrikeCountOption={setStrikeCountOption}
              stdDevOption={stdDevOption}
              setStdDevOption={setStdDevOption}
              customStdDev={customStdDev}
              setCustomStdDev={setCustomStdDev}
              strikeSideMode={strikeSideMode}
              setStrikeSideMode={setStrikeSideMode}
              computedStrikes={strikeWindow.computedStrikes}
              effectiveStrikes={strikeWindow.effectiveStrikes}
              multiSelectStrikes={multiSelectStrikes}
              setMultiSelectStrikes={setMultiSelectStrikes}
              strikeLadderShowOi={strikeWindow.strikeLadderShowOi}
              ladderOiMax={strikeWindow.ladderOiMax}
              strikeOiByStrike={strikeWindow.strikeOiByStrike}
              otmCallWrapRef={strikeWindow.otmCallWrapRef}
              snapshotRows={snapshots.snapshotRows}
              snapshotLoading={snapshots.snapshotLoading}
              underlyingPrice={snapshots.underlyingPrice}
              lastQuotesLoadTs={snapshots.lastQuotesLoadTs}
              greeksSource={greeksSource}
              onGreeksSourceChange={setGreeksSource}
              loadQuotes={snapshots.loadQuotes}
              canLoadQuotes={canLoadQuotes}
              addWatchlistFeedback={snapshots.addWatchlistFeedback}
              snapshotFeedback={snapshots.snapshotFeedback}
              snapshotPgWatching={snapshots.snapshotPgWatching}
              snapshotPgWatchSecondsLeft={snapshots.snapshotPgWatchSecondsLeft}
              chainColumnVisibility={chainColumnVisibility}
              onToggleChainColumn={toggleChainColumn}
              chainColumnList={chainTable.chainColumnList}
              showCallSide={chainTable.showCallSide}
              showPutSide={chainTable.showPutSide}
              chainStrikesSorted={chainTable.chainStrikesSorted}
              rowIndexByStrikeRight={chainTable.rowIndexByStrikeRight}
              selectedContractKey={snapshots.selectedContractKey}
              onSelectContractKey={snapshots.setSelectedContractKey}
              snapshotLoadAttempted={snapshots.snapshotLoadAttempted}
              renderChainSideCells={chainTable.renderChainSideCells}
              openMassiveFeed={openMassiveFeed}
            />

            <OptionContractDrawer open={Boolean(chainTable.selectedRow && chainTable.selectedDerived)}>
              {chainTable.selectedRow && chainTable.selectedDerived ? (
                <OptionContractDetailPanel
                  symbol={selectedSymbol}
                  expiration={selectedExpiration}
                  underlyingPrice={snapshots.underlyingPrice}
                  selectedRow={chainTable.selectedRow}
                  selectedDerived={chainTable.selectedDerived}
                  snapshotRows={snapshots.snapshotRows}
                  greeksCoverage={greeksCoverage ?? null}
                  eventContextWarnings={eventContextWarnings}
                  greeksSource={greeksSource}
                  onGreeksSourceChange={setGreeksSource}
                  liquidityLastTrade={liquidityLastTrade}
                  liquidityQuoteCount={liquidityQuoteCount}
                  liquidityLoading={liquidityLoading}
                  serverLiquidity={serverLiquidity}
                  serverRelativeValue={serverRelativeValue}
                  onClose={() => snapshots.setSelectedContractKey(null)}
                  onAddToWatchlist={() => void handleAddToWatchlist(chainTable.selectedRow!)}
                  onAddToCompare={() => {
                    handleAddToCompare(chainTable.selectedRow!)
                    setCompareOpen(true)
                  }}
                />
              ) : null}
            </OptionContractDrawer>

            <OptionDiscoveryCompareDrawer
              open={compareOpen}
              onClose={() => setCompareOpen(false)}
              rows={compareRows}
              symbol={selectedSymbol}
              expiration={selectedExpiration}
              dteLabel={expirationDaysFromToday(selectedExpiration)}
              onRemove={i => setCompareRows(prev => prev.filter((_, j) => j !== i))}
              onClear={() => setCompareRows([])}
            />
          </div>
        </div>
      </div>
    </PageShell>
  )
}
