import { cn } from '@/lib/utils'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  InlinePnl,
  denseTable,
  denseTableNumCell,
  type DenseTagVariant,
} from '@/components/data-display'
import { fmtDateToken, fmtUsd } from '@/lib/format'
import { cancelNoteOf, kindOf, type TransactionKind } from '@/utils/transactionKind'
import { buildTransferPayRows, txAmount } from './transferPayRows'
import { transferPayUi } from './transferPayUi'
import type { AccountTransaction } from '@/types/trading'

const COL_COUNT = 7

/**
 * Kind carries a judgement, so it takes a tag colour: a cost is amber, income is
 * teal, a reversal is violet, a broker label is sky. Financing is the exception
 * the Owner ruled — it holds both directions, so its tag takes the sign of the
 * row rather than one colour for the class (F-T2).
 */
const KIND_VARIANT: Record<TransactionKind, DenseTagVariant> = {
  'Data fee': 'warning',
  Lending: 'success',
  Financing: 'neutral',
  Tax: 'warning',
  Cancel: 'category',
  Transfer: 'info',
  Dividend: 'info',
  Other: 'neutral',
}

function kindVariant(kind: TransactionKind, amount: number): DenseTagVariant {
  if (kind !== 'Financing') return KIND_VARIANT[kind]
  return amount >= 0 ? 'success' : 'warning'
}

type Props = {
  rows: AccountTransaction[]
  filtered: AccountTransaction[]
  groupByMonth: boolean
  rangeLabel: string
  emptyWhy: string
}

export function TransferPayTransactionsTable({
  rows,
  filtered,
  groupByMonth,
  rangeLabel,
  emptyWhy,
}: Props) {
  const display = buildTransferPayRows({ page: rows, filtered, groupByMonth })

  return (
    <div>
      <DenseDataTable wrapClassName={denseTable.scrollX} tableClassName="min-w-[980px]">
        {/*
          Seven columns with nothing declared share the width equally, which is
          the wrong answer twice over: Ccy is three characters and never needs
          193px, while Description is the only column carrying a sentence and
          was clipping 13 of 15 rows. The widths below come from what each
          column's content actually measures, so the description gets the room
          the others were holding. `min-w` matches the prototype's own 980px
          floor: below it the table scrolls rather than squeezing further.
        */}
        <colgroup>
          <col style={{ width: '12%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '33%' }} />
        </colgroup>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead>Date</DenseTableHead>
            <DenseTableHead>Account</DenseTableHead>
            <DenseTableHead>Type</DenseTableHead>
            <DenseTableHead>Kind</DenseTableHead>
            <DenseTableHead className={denseTableNumCell}>Amount</DenseTableHead>
            <DenseTableHead>Ccy</DenseTableHead>
            <DenseTableHead>Description</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {display.length === 0 ? (
            <DenseTableRow>
              <DenseTableCell colSpan={COL_COUNT} className="py-8 text-center">
                <span className="inline-flex max-w-[26rem] flex-col items-center gap-1.5">
                  <span className="text-dense-body font-semibold text-foreground/85">
                    No cash events match this selection
                  </span>
                  <span className={denseTable.emptyHint}>{emptyWhy}</span>
                </span>
              </DenseTableCell>
            </DenseTableRow>
          ) : (
            display.map(item => {
              if (item.row === 'month') {
                return (
                  <DenseTableRow key={item.key} className="bg-secondary/50">
                    <DenseTableCell colSpan={COL_COUNT} className="py-1">
                      <span className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                        <span className={transferPayUi.monthLabel}>{item.label}</span>
                        <span className={transferPayUi.monthMeta}>
                          {item.events} {item.events === 1 ? 'event' : 'events'}
                        </span>
                        <InlinePnl value={item.net} className={transferPayUi.monthNet}>
                          {fmtUsd(item.net)}
                        </InlinePnl>
                      </span>
                    </DenseTableCell>
                  </DenseTableRow>
                )
              }

              const tx = item.tx
              const amount = txAmount(tx)
              const kind = kindOf(tx)
              const cancel = cancelNoteOf(tx)
              return (
                <DenseTableRow
                  key={item.key}
                  className={cn(kind === 'Cancel' && transferPayUi.cancelRowTint)}
                >
                  <DenseTableCell>{fmtDateToken(tx.ts)}</DenseTableCell>
                  <DenseTableCell className={denseTable.mutedMeta}>
                    {tx.account_id ?? '—'}
                  </DenseTableCell>
                  <DenseTableCell className={denseTable.mutedMeta}>{tx.type ?? '—'}</DenseTableCell>
                  <DenseTableCell>
                    <DenseTag variant={kindVariant(kind, amount)}>{kind}</DenseTag>
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    <InlinePnl value={amount} className="font-medium">
                      {fmtUsd(amount)}
                    </InlinePnl>
                  </DenseTableCell>
                  <DenseTableCell className={denseTable.mutedMeta}>
                    {tx.currency ?? '—'}
                  </DenseTableCell>
                  <DenseTableCell
                    className={cn(denseTable.detailCellClip, denseTable.mutedMeta)}
                    title={tx.description ?? undefined}
                  >
                    <span className="block truncate">{tx.description ?? '—'}</span>
                    {cancel?.state === 'named' && (
                      <span
                        className={cn(transferPayUi.cancelNote, transferPayUi.cancelNoteNamed)}
                      >
                        reverses · {cancel.ref}
                        {cancel.period ? ` · ${cancel.period}` : ''}
                      </span>
                    )}
                    {cancel?.state === 'unidentified' && (
                      <span className={cn(transferPayUi.cancelNote, transferPayUi.cancelNoteBare)}>
                        reverses an earlier charge · not identified
                      </span>
                    )}
                  </DenseTableCell>
                </DenseTableRow>
              )
            })
          )}
        </DenseTableBody>
      </DenseDataTable>

      <div className={transferPayUi.tableFoot}>
        <span>
          A negative amount is money leaving, not a fault — it is orange because it has direction,
          never red.
        </span>
        <span>
          Cancellations keep their own row so the net stays right. A bracketed one names the
          subscription it reverses; a bare <span className="font-mono">CANCELLATION</span> names
          nothing, and says so in grey rather than guessing.
        </span>
        <span className={transferPayUi.tableFootRight}>
          Showing {rows.length} of {filtered.length} filtered · {rangeLabel}
        </span>
      </div>
    </div>
  )
}
