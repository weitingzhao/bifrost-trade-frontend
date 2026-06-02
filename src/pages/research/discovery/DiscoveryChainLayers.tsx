import { OdLayerSection } from '@/components/optionDiscovery/OdLayerSection'
import { OdChainExpiryBubblePicker } from '@/components/optionDiscovery/OdChainExpiryBubblePicker'
import { DiscoveryHint } from '@/components/optionDiscovery/DiscoveryHint'
import { OptionDiscoveryMaxPainPanel } from '@/components/optionDiscovery/OptionDiscoveryMaxPainPanel'
import { OptionDiscoveryAnalyticsPanel } from '@/components/optionDiscovery/OptionDiscoveryAnalytics'
import { StrikeLadderPanel } from '@/components/optionDiscovery/StrikeLadderPanel'
import { OptionChainQuotesSection } from '@/components/optionDiscovery/OptionChainQuotesSection'
import type { MassiveStatusResponse } from '@/types/optionDiscovery'
import type { StdDevOption, StrikeCountOption } from '@/utils/optionDiscovery/strikePresets'
import type { StrikeOiPair } from '@/components/optionDiscovery/StrikeLadderPanel'
import type { ChainColumnId } from './useDiscoveryChainTable'
import type { SnapshotFeedback } from '@/hooks/useDiscoverySnapshots'
import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import type { Dispatch, ReactNode, Ref, SetStateAction } from 'react'
import {
  discoveryFullChainClass,
  discoveryViewScopeClass,
  discoveryViewScopeHintClass,
} from './discoveryUi'

type Props = {
  selectedSymbol: string
  selectedExpiration: string
  setSelectedExpiration: (exp: string) => void
  visibleExpirations: string[]
  massiveStatus: MassiveStatusResponse | null
  strikesLoading: boolean
  strikes: number[]
  stockDayLastPrice: number | null
  strikeCountOption: StrikeCountOption
  setStrikeCountOption: (v: StrikeCountOption) => void
  stdDevOption: StdDevOption
  setStdDevOption: (v: StdDevOption) => void
  customStdDev: string
  setCustomStdDev: (v: string) => void
  strikeSideMode: 'all' | 'call' | 'put'
  setStrikeSideMode: (v: 'all' | 'call' | 'put') => void
  computedStrikes: number[]
  effectiveStrikes: number[]
  multiSelectStrikes: number[]
  setMultiSelectStrikes: Dispatch<SetStateAction<number[]>>
  strikeLadderShowOi: boolean
  ladderOiMax: number
  strikeOiByStrike: Map<number, StrikeOiPair>
  otmCallWrapRef?: Ref<HTMLDivElement>
  snapshotRows: OptionSnapshotRow[]
  snapshotLoading: boolean
  underlyingPrice: number | null
  lastQuotesLoadTs: Date | null
  greeksSource: 'snapshot' | 'bs'
  onGreeksSourceChange: (v: 'snapshot' | 'bs') => void
  loadQuotes: () => void
  canLoadQuotes: boolean
  addWatchlistFeedback: string | null
  snapshotFeedback: SnapshotFeedback | null
  snapshotPgWatching: boolean
  snapshotPgWatchSecondsLeft: number | null
  chainColumnVisibility: Record<ChainColumnId, boolean>
  onToggleChainColumn: (id: ChainColumnId) => void
  openMassiveFeed: () => void
  chainColumnList: ChainColumnId[]
  showCallSide: boolean
  showPutSide: boolean
  chainStrikesSorted: number[]
  rowIndexByStrikeRight: Map<string, number>
  selectedContractKey: string | null
  onSelectContractKey: (k: string | null) => void
  snapshotLoadAttempted: boolean
  renderChainSideCells: (
    side: 'call' | 'put',
    row: OptionSnapshotRow | undefined,
    rowIdx: number | null,
    sideSelected: boolean,
  ) => ReactNode
}

export function DiscoveryChainLayers(props: Props) {
  const sym = props.selectedSymbol.trim()
  const exp = props.selectedExpiration.trim()

  return (
    <>
      <OdLayerSection
        id="od-layer-2"
        step={2}
        title="Expiration · full chain"
        subtitle="Choose chain and quotes expiry below. Max pain and OI use that expiration (EOD-style)."
        enabled={sym !== '' && props.visibleExpirations.length > 0}
        lockedHint="Select an underlying and wait for expirations (section 1), or widen All/Std/Wk/Qtr."
      >
        {sym !== '' && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <label
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground shrink-0"
              htmlFor="od-chain-expiry-select"
            >
              Chain / quotes expiry
            </label>
            <OdChainExpiryBubblePicker
              stripId="od-chain-expiry-select"
              options={props.visibleExpirations}
              value={props.selectedExpiration}
              onChange={props.setSelectedExpiration}
              disabled={props.visibleExpirations.length === 0}
              aria-label="Chain and quotes expiration date"
            />
            {props.visibleExpirations.length === 0 && (
              <DiscoveryHint as="span" className="mt-0" role="status">
                No expirations for this symbol or filter.
              </DiscoveryHint>
            )}
          </div>
        )}
        {sym !== '' && exp !== '' && (
          <div className={discoveryFullChainClass} data-analytics-scope="full-chain" aria-label="Full chain">
            <OptionDiscoveryMaxPainPanel
              symbol={props.selectedSymbol}
              expiration={props.selectedExpiration}
              massiveConfigured={Boolean(props.massiveStatus?.configured)}
            />
          </div>
        )}
      </OdLayerSection>

      <OdLayerSection
        id="od-layer-3"
        step={3}
        title="Strike window & option analytics"
        subtitle="Adjust the strike ladder, then review IV smile, OI, and gamma exposure for the loaded snapshot."
        enabled={sym !== '' && exp !== ''}
        lockedHint="Select symbol and chain expiry in section 2."
      >
        <details className="group rounded-lg border border-border bg-card/50 open:pb-2" open aria-label="Strike window">
          <summary className="cursor-pointer list-none px-3 py-2 font-medium [&::-webkit-details-marker]:hidden">
            <span className="inline-flex flex-wrap items-baseline gap-2">
              Strike window
              <DiscoveryHint as="span" className="mt-0 text-xs font-normal">
                {props.effectiveStrikes.length} selected · {props.computedStrikes.length} in range
              </DiscoveryHint>
            </span>
          </summary>
          <div className="px-3 pb-2">
            <DiscoveryHint className="mb-2">
              Select strikes for the option chain table and window-scoped charts below.
            </DiscoveryHint>
            <StrikeLadderPanel
              strikesLoading={props.strikesLoading}
              computedStrikes={props.computedStrikes}
              effectiveStrikes={props.effectiveStrikes}
              multiSelectStrikes={props.multiSelectStrikes}
              setMultiSelectStrikes={props.setMultiSelectStrikes}
              stockDayLastPrice={props.stockDayLastPrice}
              strikeCountOption={props.strikeCountOption}
              setStrikeCountOption={props.setStrikeCountOption}
              stdDevOption={props.stdDevOption}
              setStdDevOption={props.setStdDevOption}
              customStdDev={props.customStdDev}
              setCustomStdDev={props.setCustomStdDev}
              strikeSideMode={props.strikeSideMode}
              setStrikeSideMode={props.setStrikeSideMode}
              strikeLadderShowOi={props.strikeLadderShowOi}
              ladderOiMax={props.ladderOiMax}
              strikeOiByStrike={props.strikeOiByStrike}
              strikesAvailable={props.strikes.length > 0}
              otmCallWrapRef={props.otmCallWrapRef}
            />
          </div>
        </details>

        <div className={discoveryViewScopeClass} data-analytics-scope="strike-window" aria-label="Strike window scope">
          <DiscoveryHint className={discoveryViewScopeHintClass} id="option-discovery-view-scope-hint">
            Scoped to the selected strike window.
          </DiscoveryHint>
          {sym !== '' && exp !== '' && props.snapshotRows.length > 0 && !props.snapshotLoading && (
            <div
              className="od-option-structure-stack"
              aria-label="Option analytics"
              aria-describedby="option-discovery-view-scope-hint"
            >
              <OptionDiscoveryAnalyticsPanel rows={props.snapshotRows} underlying={props.underlyingPrice} />
            </div>
          )}
        </div>
      </OdLayerSection>

      <OdLayerSection
        id="od-layer-4"
        step={4}
        title="Option quotes & contract"
        subtitle="Refresh Massive snapshots, browse the chain, then open a contract for liquidity, risk, and K-line."
        enabled={sym !== '' && exp !== ''}
        lockedHint="Select symbol and chain expiry in section 2."
      >
        <OptionChainQuotesSection
          lastQuotesLoadTs={props.lastQuotesLoadTs}
          greeksSource={props.greeksSource}
          onGreeksSourceChange={props.onGreeksSourceChange}
          onRefreshQuotes={() => void props.loadQuotes()}
          canLoadQuotes={props.canLoadQuotes}
          snapshotLoading={props.snapshotLoading}
          underlyingPrice={props.underlyingPrice}
          addWatchlistFeedback={props.addWatchlistFeedback}
          snapshotFeedback={props.snapshotFeedback}
          snapshotPgWatching={props.snapshotPgWatching}
          snapshotPgWatchSecondsLeft={props.snapshotPgWatchSecondsLeft}
          onPullNow={() => void props.loadQuotes()}
          openMassiveFeed={props.openMassiveFeed}
          chainColumnVisibility={props.chainColumnVisibility}
          onToggleChainColumn={props.onToggleChainColumn}
          chainColumnList={props.chainColumnList}
          strikeSideMode={props.strikeSideMode}
          showCallSide={props.showCallSide}
          showPutSide={props.showPutSide}
          chainStrikesSorted={props.chainStrikesSorted}
          rowIndexByStrikeRight={props.rowIndexByStrikeRight}
          snapshotRows={props.snapshotRows}
          selectedContractKey={props.selectedContractKey}
          onSelectContractKey={props.onSelectContractKey}
          snapshotLoadAttempted={props.snapshotLoadAttempted}
          renderChainSideCells={props.renderChainSideCells}
        />
      </OdLayerSection>
    </>
  )
}
