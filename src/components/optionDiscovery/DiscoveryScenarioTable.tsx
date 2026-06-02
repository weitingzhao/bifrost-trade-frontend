import { cn } from '@/lib/utils'
import { fmtUsd } from '@/lib/format'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  InlinePnl,
  denseTableNumCell,
} from '@/components/data-display'
import { optionDiscoveryKvDimClass } from './optionDiscoveryUi'
import type { ScenarioResult } from '@/utils/optionDiscovery/optionContractMetrics'

type Props = {
  scenarios: ScenarioResult[]
}

export function DiscoveryScenarioTable({ scenarios }: Props) {
  return (
    <DenseDataTable wrapClassName="min-w-[16rem] border-0 rounded-none" tableClassName="text-xs">
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead className="normal-case tracking-normal">Scenario</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>Est. PnL</DenseTableHead>
          <DenseTableHead className="normal-case tracking-normal">Detail</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {scenarios.map(s => (
          <DenseTableRow key={s.label}>
            <DenseTableCell>{s.label}</DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {s.pnl != null ? (
                <InlinePnl value={s.pnl}>
                  {`${s.pnl >= 0 ? '+' : ''}${fmtUsd(s.pnl)}`}
                </InlinePnl>
              ) : (
                '—'
              )}
            </DenseTableCell>
            <DenseTableCell className={optionDiscoveryKvDimClass}>{s.detail}</DenseTableCell>
          </DenseTableRow>
        ))}
      </DenseTableBody>
    </DenseDataTable>
  )
}
