import type { Operation } from '@/types/monitor'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  denseTable,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtTs, fmtUsd } from './daemonShared'
import {
  DAEMON_OPS_COL_WIDTHS,
  daemonEmptyHintClass,
  daemonOpsSideCellClass,
  daemonOpsTableClass,
  daemonOpsTimeCellClass,
  daemonSectionTitleClass,
} from './daemonUi'

function sideTagVariant(side: string): 'success' | 'danger' {
  return side === 'Buy' ? 'success' : 'danger'
}

export function RecentOperationsTable({ operations }: { operations: Operation[] }) {
  return (
    <div className="space-y-3">
      <h3 className={daemonSectionTitleClass}>Recent operations</h3>
      <DenseDataTable tableClassName={daemonOpsTableClass}>
        <colgroup>
          <col style={{ width: DAEMON_OPS_COL_WIDTHS.time }} />
          <col style={{ width: DAEMON_OPS_COL_WIDTHS.type }} />
          <col style={{ width: DAEMON_OPS_COL_WIDTHS.side }} />
          <col style={{ width: DAEMON_OPS_COL_WIDTHS.qty }} />
          <col style={{ width: DAEMON_OPS_COL_WIDTHS.price }} />
          <col style={{ width: DAEMON_OPS_COL_WIDTHS.reason }} />
        </colgroup>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead>Time</DenseTableHead>
            <DenseTableHead>Type</DenseTableHead>
            <DenseTableHead>Side</DenseTableHead>
            <DenseTableHead align="right">Qty</DenseTableHead>
            <DenseTableHead align="right">Price</DenseTableHead>
            <DenseTableHead>Reason</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {operations.length === 0 ? (
            <DenseTableRow>
              <DenseTableCell colSpan={6} className={daemonEmptyHintClass}>
                None
              </DenseTableCell>
            </DenseTableRow>
          ) : (
            operations.map((op, i) => (
              <DenseTableRow key={op.daemon_auto_operations_id ?? `op-${op.ts}-${i}`}>
                <DenseTableCell className={daemonOpsTimeCellClass}>{fmtTs(op.ts)}</DenseTableCell>
                <DenseTableCell>{op.type ?? '—'}</DenseTableCell>
                <DenseTableCell className={daemonOpsSideCellClass}>
                  {op.side
                    ? <DenseTag variant={sideTagVariant(op.side)} size="cell">{op.side}</DenseTag>
                    : '—'}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{op.quantity ?? '—'}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {op.price != null ? fmtUsd(op.price) : '—'}
                </DenseTableCell>
                <DenseTableCell className={denseTable.mutedMeta}>{op.state_reason ?? '—'}</DenseTableCell>
              </DenseTableRow>
            ))
          )}
        </DenseTableBody>
      </DenseDataTable>
    </div>
  )
}
