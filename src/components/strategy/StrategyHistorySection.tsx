import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
} from '@/components/data-display'
import { useStrategyHistory } from '@/hooks/useStructureManagement'
import type { StrategyHistoryRow, StrategyStructure } from '@/types/strategy'
import {
  formatHistoryTs,
  summarizeStateSummary,
} from '@/utils/strategyFormUtils'
import {
  structuresEmptyHintClass,
  structuresHistoryFilterRowClass,
  structuresHistoryIdCellClass,
  structuresHistorySummaryCellClass,
  structuresHistoryTimeCellClass,
  structuresToolbarLabelClass,
} from '@/components/strategy/structures/structuresUi'

interface StrategyHistorySectionProps {
  structures: StrategyStructure[]
  structureFilter: number | ''
  onStructureFilterChange: (value: number | '') => void
}

export function StrategyHistorySection({
  structures,
  structureFilter,
  onStructureFilterChange,
}: StrategyHistorySectionProps) {
  const { data, isLoading, isError, error } = useStrategyHistory({
    limit: 100,
    strategy_structure_id: structureFilter === '' ? undefined : structureFilter,
  })

  const rows = useMemo(() => data?.items ?? [], [data])

  return (
    <div className="space-y-3">
      <div className={structuresHistoryFilterRowClass}>
        <label htmlFor="strategy-history-filter" className={structuresToolbarLabelClass}>
          Filter by structure
        </label>
        <Select
          value={structureFilter === '' ? 'all' : String(structureFilter)}
          onValueChange={(v) => onStructureFilterChange(v === 'all' ? '' : Number(v))}
        >
          <SelectTrigger id="strategy-history-filter" className="h-8 w-[min(100%,280px)]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {structures.map((s) => (
              <SelectItem key={s.strategy_structure_id} value={String(s.strategy_structure_id)}>
                {s.name} ({s.strategy_structure_id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Skeleton className="h-32 rounded-lg" />
      ) : rows.length === 0 ? (
        <p className={structuresEmptyHintClass}>No strategy history.</p>
      ) : (
        <DenseDataTable>
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead className="w-44">Time</DenseTableHead>
              <DenseTableHead className="w-32">Structure ID</DenseTableHead>
              <DenseTableHead>State summary</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {rows.map((row: StrategyHistoryRow) => (
              <DenseTableRow key={row.strategy_history_id}>
                <DenseTableCell className={structuresHistoryTimeCellClass}>
                  {formatHistoryTs(row.ts)}
                </DenseTableCell>
                <DenseTableCell className={structuresHistoryIdCellClass}>
                  {row.strategy_structure_id}
                </DenseTableCell>
                <DenseTableCell
                  className={structuresHistorySummaryCellClass}
                  title={summarizeStateSummary(row.state_summary)}
                >
                  {summarizeStateSummary(row.state_summary)}
                </DenseTableCell>
              </DenseTableRow>
            ))}
          </DenseTableBody>
        </DenseDataTable>
      )}
    </div>
  )
}
