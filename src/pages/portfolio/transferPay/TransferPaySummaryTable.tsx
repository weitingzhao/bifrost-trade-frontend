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
import type { SummaryMode, SummaryTypeKey } from '@/utils/transferPay'
import { TransferPayChangeVsPrev } from './TransferPayChangeVsPrev'
import { transferPayUi } from './transferPayUi'

type Props = {
  summaryMode: SummaryMode
  onSummaryMode: (mode: SummaryMode) => void
  accountIds: string[]
  periodKeys: string[]
  summaryByPeriod: Record<string, Record<string, number>>
  summaryByType: Record<string, Record<SummaryTypeKey, number>>
  changes: {
    ct: Record<string, number | null>
    cd: Record<string, number | null>
    cw: Record<string, number | null>
    cdv: Record<string, number | null>
    co: Record<string, number | null>
  }
  emptyHint?: string
}

function SummaryAmountCell({
  value,
  pct,
}: {
  value: number
  pct: number | null | undefined
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
      <div className={transferPayUi.summaryHead}>
        <h3 className={transferPayUi.summaryTitle}>
          Summary by period
          <InfoTooltip text="Net cash flow per account and in total, grouped by year / quarter / month for the loaded range (last 365 days or current fetch window)." />
        </h3>
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

      {emptyHint ? (
        <p className={transferPayUi.sectionHint}>{emptyHint}</p>
      ) : (
        <DenseDataTable wrapClassName={cn(denseTable.scrollX)}>
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
    </div>
  )
}
