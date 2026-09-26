import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AssetMixCard } from '@/components/accounts/AssetMixCard'
import { NetLiqChart } from '@/components/accounts/NetLiqChart'
import { PortfolioCategoryRing } from '@/components/accounts/PortfolioCategoryRing'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseLinkButton,
  InlinePnl,
  SegmentControl,
  DEFAULT_SEGMENT_SIZE,
  denseTable,
  denseTableEntityCell,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtPct1, fmtPctSigned, fmtUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { filterStocksByBucket } from '@/utils/positionsGrouping'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { LivePositionRow } from '@/types/positions'
import type { DailyBenchmark, QuoteItem } from '@/types/market'
import { buildBySymbolRows, unrepresentedNote } from './accountsBySymbol'
import { accountsUi, BUCKET_LABEL } from './accountsUi'

type Cut = 'category' | 'mix' | 'symbols'

const CUT_OPTIONS = [
  { value: 'category', label: 'Category' },
  { value: 'mix', label: 'Asset mix' },
  { value: 'symbols', label: 'By symbol' },
]

const CUT_NOTE: Record<Cut, string> = {
  category: 'your buckets, against net liq',
  mix: 'roles, against buying-power basis',
  symbols: 'every symbol, both accounts — a table sorts and a ring does not',
}

export function AccountsComposedBand({
  accounts,
  allStocks,
  allPositions,
  quotesBySymbol,
  benchBySymbol,
  totalNetLiq,
  onSymbolClick,
}: {
  accounts: IbAccountSnapshot[]
  allStocks: LivePositionRow[]
  allPositions: LivePositionRow[]
  quotesBySymbol: Record<string, QuoteItem>
  benchBySymbol: Record<string, DailyBenchmark>
  totalNetLiq: number
  onSymbolClick: (symbol: string) => void
}) {
  const [cut, setCut] = useState<Cut>('category')
  const bySymbol = useMemo(
    () =>
      buildBySymbolRows({
        stocks: allStocks,
        allPositions,
        quotesBySymbol,
        benchBySymbol,
        totalNetLiq,
      }),
    [allStocks, allPositions, quotesBySymbol, benchBySymbol, totalNetLiq],
  )

  return (
    <section aria-label="How it is composed">
      <div className={accountsUi.tierRow}>
        <span className={accountsUi.tierLabel}>How it is composed</span>
        <span className={accountsUi.tierRule} />
        <span className={accountsUi.tierNote}>three cuts of one number · one at a time</span>
      </div>

      <div className={accountsUi.composedGrid}>
        <div className={accountsUi.panel}>
          <div className={accountsUi.panelHead}>
            <SegmentControl
              size={DEFAULT_SEGMENT_SIZE}
              ariaLabel="Composition cut"
              options={CUT_OPTIONS}
              value={cut}
              onChange={(v) => setCut(v as Cut)}
            />
            <span className={accountsUi.cutNote}>{CUT_NOTE[cut]}</span>
          </div>

          {cut === 'category' ? (
            <div className="px-3 py-2.5">
              <PortfolioCategoryRing accounts={accounts} embedded />
              <p className={cn(accountsUi.sectionHint, 'mt-2')}>
                Excluded slices leave the ring but keep their number in the legend — excluding a
                bucket must not make it look absent.
              </p>
            </div>
          ) : null}

          {cut === 'mix' ? (
            <div className="px-3 py-2.5">
              <AssetMixCard
                accounts={accounts}
                coreStocks={filterStocksByBucket(allStocks, 'core')}
                incomeEtfs={filterStocksByBucket(allStocks, 'fixed_income')}
                cashLike={filterStocksByBucket(allStocks, 'cash_like')}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className={cn(accountsUi.sectionHint, 'm-0 flex-1')}>
                  Fixed income counts via buying power, not as cash. Same buckets and repricing as
                  Positions and Backing — the rings must agree across pages.
                </p>
                <Link to="/portfolio/backing" className={accountsUi.tileLink}>
                  Backing model →
                </Link>
              </div>
            </div>
          ) : null}

          {cut === 'symbols' ? (
            <BySymbolTable
              reading={bySymbol}
              onSymbolClick={onSymbolClick}
            />
          ) : null}
        </div>

        <NetLiqChart accounts={accounts} />
      </div>
    </section>
  )
}

function BySymbolTable({
  reading,
  onSymbolClick,
}: {
  reading: ReturnType<typeof buildBySymbolRows>
  onSymbolClick: (symbol: string) => void
}) {
  const { rows, unrepresented } = reading
  return (
    <DenseDataTable wrapClassName={denseTable.scrollX} tableClassName="min-w-[660px]">
      {/* Measured at the 660 floor: every figure fits whole. Accounts gives up
          the width — it is the one text column, and it carries its own title. */}
      <colgroup>
        <col style={{ width: '10%' }} />
        <col style={{ width: '13%' }} />
        <col style={{ width: '14%' }} />
        <col style={{ width: '11%' }} />
        <col style={{ width: '16%' }} />
        <col style={{ width: '9%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '17%' }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Symbol</DenseTableHead>
          <DenseTableHead>Bucket</DenseTableHead>
          <DenseTableHead align="right">Qty</DenseTableHead>
          <DenseTableHead align="right">Mark</DenseTableHead>
          <DenseTableHead align="right">Value</DenseTableHead>
          <DenseTableHead align="right">of NLV</DenseTableHead>
          <DenseTableHead align="right">Day</DenseTableHead>
          <DenseTableHead>Accounts</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map((row) => (
          <DenseTableRow key={row.symbol}>
            <DenseTableCell className={denseTableEntityCell}>
              <DenseLinkButton
                label={row.symbol}
                ariaLabel={`Open ${row.symbol} in the inspector`}
                onClick={() => onSymbolClick(row.symbol)}
              />
            </DenseTableCell>
            <DenseTableCell className="text-dense-meta">{BUCKET_LABEL[row.bucket]}</DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
              {row.quantity}
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>{fmtUsd(row.mark)}</DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
              {fmtUsd(row.value)}
            </DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
              {fmtPct1(row.shareOfNetLiq)}
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              <InlinePnl value={row.dayPct}>{fmtPctSigned(row.dayPct)}</InlinePnl>
            </DenseTableCell>
            <DenseTableCell className="truncate font-mono text-dense-meta text-muted-foreground" title={row.accountIds.join(' · ')}>
              {row.accountIds.join(' · ')}
            </DenseTableCell>
          </DenseTableRow>
        ))}
        {unrepresented.length > 0 ? (
          <DenseTableRow>
            <DenseTableCell colSpan={8} className="whitespace-normal">
              <span className={accountsUi.unpricedNote}>
                <span className={accountsUi.unpricedDot} aria-hidden />
                <span>{unrepresentedNote(unrepresented)}</span>
              </span>
            </DenseTableCell>
          </DenseTableRow>
        ) : null}
      </DenseTableBody>
    </DenseDataTable>
  )
}
