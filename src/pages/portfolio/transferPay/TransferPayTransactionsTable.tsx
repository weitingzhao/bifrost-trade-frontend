import { cn } from '@/lib/utils'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  InlinePnl,
  denseTable,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtUsd } from '@/lib/format'
import type { AccountTransaction } from '@/types/trading'

/**
 * The API sends `ts` as a string, so convert first — the same `Number(ts)` the
 * summary table's `getPeriodKey` already used. Read it in UTC: every ts in the
 * ledger is midnight UTC, so the transaction date is the UTC date, and the
 * summary table groups by `getUTC*`. Reading the browser's zone west of
 * Greenwich would show the day before and disagree with the summary.
 */
function fmtTxDate(ts: number | string | null | undefined): string {
  const sec = Number(ts)
  if (ts == null || ts === '' || !Number.isFinite(sec)) return '—'
  return new Date(sec > 1e12 ? sec : sec * 1000).toLocaleDateString('en-CA', { timeZone: 'UTC' })
}

type Props = {
  rows: AccountTransaction[]
}

export function TransferPayTransactionsTable({ rows }: Props) {
  return (
    <DenseDataTable>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Date</DenseTableHead>
          <DenseTableHead>Account</DenseTableHead>
          <DenseTableHead>Type</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Amount</DenseTableHead>
          <DenseTableHead>Currency</DenseTableHead>
          <DenseTableHead>Description</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.length === 0 ? (
          <DenseTableRow>
            <DenseTableCell colSpan={6} className="py-10 text-center">
              <span className={denseTable.emptyHint}>No transactions for this selection.</span>
            </DenseTableCell>
          </DenseTableRow>
        ) : (
          rows.map(tx => (
            <DenseTableRow key={`${tx.account_id}-${tx.ts}-${tx.amount}-${tx.type}`}>
              <DenseTableCell>{fmtTxDate(tx.ts)}</DenseTableCell>
              <DenseTableCell>{tx.account_id ?? '—'}</DenseTableCell>
              <DenseTableCell>{tx.type ?? '—'}</DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                <InlinePnl value={tx.amount} className="font-medium">
                  {fmtUsd(tx.amount)}
                </InlinePnl>
              </DenseTableCell>
              <DenseTableCell>{tx.currency ?? '—'}</DenseTableCell>
              <DenseTableCell
                className={cn(denseTable.detailCellClip, denseTable.mutedMeta)}
                title={tx.description ?? undefined}
              >
                <span className="block truncate">{tx.description ?? '—'}</span>
              </DenseTableCell>
            </DenseTableRow>
          ))
        )}
      </DenseTableBody>
    </DenseDataTable>
  )
}
