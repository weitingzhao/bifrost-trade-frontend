import { Link } from 'react-router-dom'
import { ExecutionImport } from '@/components/accounts/ExecutionImport'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTable,
  denseTableEntityCell,
} from '@/components/data-display'
import { cn } from '@/lib/utils'
import { clockLabel } from '@/utils/accountsFreshness'
import { fetchedStamp } from './accountsClocks'
import type { FreshnessRow } from './accountsFreshnessRows'
import { accountsUi, freshnessToneDot, freshnessToneText } from './accountsUi'

const COLS = 5

export function AccountsFreshnessBand({
  rows,
  fetchedAt,
  hasAccounts,
  flexClockLine,
}: {
  rows: FreshnessRow[]
  fetchedAt: number | null | undefined
  hasAccounts: boolean
  flexClockLine?: string
}) {
  const from =
    fetchedAt != null && Number.isFinite(fetchedAt)
      ? `Data from ${fetchedStamp(fetchedAt)} · ${clockLabel(fetchedAt)} · fetch time, not a session date`
      : 'No snapshot fetch time yet'

  return (
    <section aria-label="Freshness">
      <div className={accountsUi.tierRow}>
        <span className={accountsUi.tierLabel}>Freshness</span>
        <span className={accountsUi.tierRule} />
        <span className={accountsUi.tierNote}>{from}</span>
      </div>

      <div className={accountsUi.panel}>
        <div className={accountsUi.panelHead}>
          <ExecutionImport
            accountsFetchedAt={fetchedAt}
            hasAccounts={hasAccounts}
            flexClockLine={flexClockLine}
            showFetchedAt={false}
            embedded
          />
        </div>

        <DenseDataTable wrapClassName={denseTable.scrollX} tableClassName="min-w-[620px]">
          <colgroup>
            <col style={{ width: '16%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '42%' }} />
          </colgroup>
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Account</DenseTableHead>
              <DenseTableHead>Source</DenseTableHead>
              <DenseTableHead align="right">Newest record</DenseTableHead>
              <DenseTableHead>Reading</DenseTableHead>
              <DenseTableHead>What it means</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {rows.length === 0 ? (
              <DenseTableRow>
                <DenseTableCell colSpan={COLS} className="py-6 text-center">
                  <span className={denseTable.emptyHint}>No freshness rows yet.</span>
                </DenseTableCell>
              </DenseTableRow>
            ) : (
              rows.map((row) => (
                <DenseTableRow key={row.key}>
                  <DenseTableCell className={denseTableEntityCell}>
                    <span className="font-mono font-semibold">{row.accountId}</span>
                    {row.role ? (
                      <span className="ml-1.5 text-dense-meta text-muted-foreground">{row.role}</span>
                    ) : null}
                  </DenseTableCell>
                  <DenseTableCell className="font-mono text-muted-foreground">{row.source}</DenseTableCell>
                  <DenseTableCell
                    className={cn('text-right font-mono font-semibold tabular-nums', freshnessToneText(row.state))}
                  >
                    {row.age}
                  </DenseTableCell>
                  <DenseTableCell>
                    <span className={cn('inline-flex items-center gap-1.5', freshnessToneText(row.state))}>
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', freshnessToneDot(row.state))} />
                      {row.reading}
                    </span>
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableEntityCell, 'text-dense-meta text-muted-foreground')} title={row.meaning}>
                    {row.meaning}
                  </DenseTableCell>
                </DenseTableRow>
              ))
            )}
          </DenseTableBody>
        </DenseDataTable>

        <div className={accountsUi.panelFoot}>
          <p className="m-0">
            Ingest lives here because the verdict on freshness lives here;{' '}
            <Link to="/portfolio/ledger" className={accountsUi.tileLink}>
              Trade Ledger
            </Link>{' '}
            consumes what these runs write. Nothing on this page reaches an order path.
          </p>
        </div>
      </div>
    </section>
  )
}
