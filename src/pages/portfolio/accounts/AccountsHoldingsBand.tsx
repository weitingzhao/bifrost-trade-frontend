import { StockPositionsTable } from '@/components/accounts/StockPositionsTable'
import { OptionPositionsTable } from '@/components/accounts/OptionPositionsTable'
import { lampDotClass } from '@/lib/lampTone'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/lib/format'
import type { IbPositionRow } from '@/types/monitor'
import type { DailyBenchmark, QuoteItem } from '@/types/market'
import { accountsUi } from './accountsUi'
import { SectionHead } from '@/components/layout'

export function AccountsHoldingsBand({
  accountId,
  roleLabel,
  dormant,
  stockPositions,
  optionPositions,
  quotesBySymbol,
  quotesByCk,
  benchBySymbol,
  onSymbolClick,
  onCategoryClick,
}: {
  accountId: string
  roleLabel: string
  dormant: boolean
  stockPositions: IbPositionRow[]
  optionPositions: IbPositionRow[]
  quotesBySymbol: Record<string, QuoteItem>
  quotesByCk: Record<string, QuoteItem>
  benchBySymbol: Record<string, DailyBenchmark>
  onSymbolClick: (symbol: string) => void
  onCategoryClick: () => void
}) {
  const empty = stockPositions.length === 0 && optionPositions.length === 0

  return (
    <section aria-label={`Holdings ${accountId}`}>
      <SectionHead note="As the broker reports them · click a row in the table above to switch account.">
        Holdings · {accountId} · {roleLabel}
      </SectionHead>

      {empty ? (
        <div className={accountsUi.panel}>
          <div className={accountsUi.emptyHoldings}>
            <span className={accountsUi.emptyHoldingsTitle}>
              <span className={cn('h-2 w-2 rounded-full', lampDotClass('gray'))} aria-hidden />
              No positions reported for {accountId}
            </span>
            <p className={accountsUi.emptyHoldingsBody}>
              {dormant
                ? 'The account snapshot arrived, with the fullest set of broker fields of the three accounts — it simply holds no positions, and is not expected to. Grey, not red: dormant is a standing state, not a failed fetch.'
                : 'The snapshot arrived and this account currently holds no stock or option lines.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className={accountsUi.panel}>
            <div className={accountsUi.panelHead}>
              <span className="text-sm font-semibold">Stock positions</span>
              <span className="font-mono text-dense-meta text-muted-foreground">
                {stockPositions.length} holdings
                {stockHeadValue(stockPositions, quotesBySymbol)}
              </span>
              <span className={cn(accountsUi.cutNote, 'max-w-[28rem]')}>
                grouped by your categories · Daily and Chg stay here, the grid on Positions holds no
                stock
              </span>
            </div>
            <div className="px-1 pb-2">
              <StockPositionsTable
                positions={stockPositions}
                quotesBySymbol={quotesBySymbol}
                benchBySymbol={benchBySymbol}
                onCategoryClick={onCategoryClick}
                onSymbolClick={onSymbolClick}
                hideTitle
              />
            </div>
          </div>

          <div className={accountsUi.panel}>
            <div className={accountsUi.panelHead}>
              <span className="text-sm font-semibold">Option positions</span>
              <span className="font-mono text-dense-meta text-muted-foreground">
                {optionPositions.length} contracts
              </span>
              <span className={cn(accountsUi.cutNote, 'max-w-[32rem]')}>
                as the broker reports them — daily change, cushion and the strategy each contract
                belongs to are on Positions
              </span>
            </div>
            <div className="px-1 pb-2">
              <OptionPositionsTable
                positions={optionPositions}
                quotesByCk={quotesByCk}
                quotesBySymbol={quotesBySymbol}
                hideTitle
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function stockHeadValue(
  positions: IbPositionRow[],
  quotesBySymbol: Record<string, QuoteItem>,
): string {
  let mkt = 0
  for (const pos of positions) {
    const qty = pos.position ?? 0
    const px = quotesBySymbol[pos.symbol?.toUpperCase() ?? '']?.last ?? pos.price
    if (px != null && Number.isFinite(px)) mkt += qty * px
  }
  return mkt !== 0 ? ` · ${fmtUsd(mkt)} market value` : ''
}
