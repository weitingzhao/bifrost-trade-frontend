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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useStrategyHistory } from '@/hooks/useStructureManagement'
import type { StrategyHistoryRow, StrategyStructure } from '@/types/strategy'
import {
  formatHistoryTs,
  summarizeStateSummary,
} from '@/utils/strategyFormUtils'

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
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="strategy-history-filter" className="text-muted-foreground">
          Filter by structure:
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
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Time</TableHead>
                <TableHead className="w-32">Structure ID</TableHead>
                <TableHead>State summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground py-6 text-center">
                    No strategy history.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row: StrategyHistoryRow) => (
                  <TableRow key={row.strategy_history_id}>
                    <TableCell className="font-mono text-xs">{formatHistoryTs(row.ts)}</TableCell>
                    <TableCell className="font-mono text-xs">{row.strategy_structure_id}</TableCell>
                    <TableCell
                      className="text-xs text-muted-foreground max-w-md truncate"
                      title={summarizeStateSummary(row.state_summary)}
                    >
                      {summarizeStateSummary(row.state_summary)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
