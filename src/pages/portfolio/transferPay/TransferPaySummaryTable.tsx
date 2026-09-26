import { cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  InlinePnl,
  SegmentControl,
  denseTable,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtUsdRound } from '@/lib/format'
import type { PctChange, SummaryMode, SummaryTypeKey } from '@/utils/transferPay'
import { TransferPayChangeVsPrev } from './TransferPayChangeVsPrev'
import { transferPayUi } from './transferPayUi'
import { SectionHead } from '@/components/layout'

type Props = {
  summaryMode: SummaryMode
  onSummaryMode: (mode: SummaryMode) => void
  accountIds: string[]
  periodKeys: string[]
  summaryByPeriod: Record<string, Record<string, number>>
  summaryByType: Record<string, Record<SummaryTypeKey, number>>
  changes: {
    ct: Record<string, PctChange>
    cd: Record<string, PctChange>
    cw: Record<string, PctChange>
    cdv: Record<string, PctChange>
    co: Record<string, PctChange>
  }
  emptyHint?: string
}

function SummaryAmountCell({
  value,
  pct,
}: {
  value: number
  pct: PctChange | undefined
}) {
  return (
    <DenseTableCell className={denseTableNumCell}>
      <div className="text-right leading-snug font-mono tabular-nums">
        <InlinePnl value={value} className="font-medium">
          {fmtUsdRound(value)}
        </InlinePnl>
        <TransferPayChangeVsPrev pct={pct} />
      </div>
    </DenseTableCell>
  )
}

export function TransferPaySummaryTable({
  summaryMode,
  onSummaryMode,
  accountIds,
  periodKeys,
  summaryByPeriod,
  summaryByType,
  changes,
  emptyHint,
}: Props) {
  return (
    <div className={denseTable.sectionBlock}>
      <SectionHead note="The whole range, deliberately ignoring the type filter above.">Summary by period</SectionHead>
      <div className={transferPayUi.summaryHead}>
        <h3 className={transferPayUi.summaryTitle}>
          Cash by period and account
          <InfoTooltip text="Net cash flow per account and in total for the whole loaded range. The type and kind chips above filter the detail table only — this table is deliberately unfiltered, so the two answer different questions." />
        </h3>
        <span className={transferPayUi.summaryNote}>
          {periodKeys.length} {periodKeys.length === 1 ? 'period' : 'periods'} · all types,
          unfiltered · newest first
        </span>
        <div className={transferPayUi.summaryView}>
          <span className={transferPayUi.viewLabel}>View:</span>
          <SegmentControl
            size="sm"
            ariaLabel="Summary period"
            value={summaryMode}
            onChange={v => onSummaryMode(v as SummaryMode)}
            options={[
              { value: 'year', label: 'Year' },
              { value: 'quarter', label: 'Quarter' },
              { value: 'month', label: 'Month' },
            ]}
          />
        </div>
      </div>

      {/*
        Nine columns today, and one more for every account that joins: the
        prototype's 1040px floor is what keeps the account columns readable
        instead of letting them compress as the book grows.
      */}
      {emptyHint ? (
        <p className={transferPayUi.sectionHint}>{emptyHint}</p>
      ) : (
        <DenseDataTable wrapClassName={cn(denseTable.scrollX)} tableClassName="min-w-[1040px]">
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Period</DenseTableHead>
              {accountIds.map(id => (
                <DenseTableHead key={id} className={denseTableNumCell}>
                  {id}
                </DenseTableHead>
              ))}
              <DenseTableHead className={denseTableNumCell}>Total</DenseTableHead>
              <DenseTableHead className={denseTableNumCell}>Deposit</DenseTableHead>
              <DenseTableHead className={denseTableNumCell}>Withdrawal</DenseTableHead>
              <DenseTableHead className={denseTableNumCell}>Dividend</DenseTableHead>
              <DenseTableHead className={denseTableNumCell}>Other</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {periodKeys.map(pk => {
              const row = summaryByPeriod[pk] ?? {}
              const tRow = summaryByType[pk] ?? { deposit: 0, withdrawal: 0, dividend: 0, other: 0 }
              const total = accountIds.reduce((s, id) => s + (row[id] ?? 0), 0)
              return (
                <DenseTableRow key={pk}>
                  <DenseTableCell>{pk}</DenseTableCell>
                  {accountIds.map(id => {
                    const v = row[id] ?? 0
                    return (
                      <DenseTableCell key={id} className={denseTableNumCell}>
                        <InlinePnl value={v} className="font-medium">
                          {fmtUsdRound(v)}
                        </InlinePnl>
                      </DenseTableCell>
                    )
                  })}
                  <SummaryAmountCell value={total} pct={changes.ct[pk]} />
                  <SummaryAmountCell value={tRow.deposit} pct={changes.cd[pk]} />
                  <SummaryAmountCell value={tRow.withdrawal} pct={changes.cw[pk]} />
                  <SummaryAmountCell value={tRow.dividend} pct={changes.cdv[pk]} />
                  <SummaryAmountCell value={tRow.other} pct={changes.co[pk]} />
                </DenseTableRow>
              )
            })}
          </DenseTableBody>
        </DenseDataTable>
      )}
      {!emptyHint && (
        <div className={transferPayUi.tableFoot}>
          <span>
            The first period has nothing before it, so its change reads{' '}
            <span className="font-mono">—</span>. A dash is no reading; 0% would be a claim.
          </span>
          <span>
            Totals are per currency. Every row is USD today, so there is one total; a second
            currency would add its own row rather than being folded into this one.
          </span>
        </div>
      )}
    </div>
  )
}
