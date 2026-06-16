import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTable,
} from '@/components/data-display'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { SegmentControl as BubbleSwitch } from '@/components/data-display'
import { formatQueueLabel, brokerQueueKeyTitle } from '@/utils/celeryQueueLabels'
import type { RunMassiveJobMatrixRow } from '@/types/ops'
import { MatrixModeCell, MatrixEffectsStacked } from './MatrixCells'
import { celeryMatrixFilterBarClass, celeryMatrixTableClass } from '../celeryUi'
import {
  compareQueueKindMatrixRows,
  matrixJobStyleLabel,
  normalizeMatrixRow,
  resolvedMatrixTaskName,
  sortArrow,
  filterMatrixRows,
  type QueueKindMatrixSortColumn,
  type MatrixModeColumnVisibility,
  type MatrixEffectsSectionVisibility,
} from './supportTasksFilters'

export interface RunMassiveJobMatrixTableProps {
  rows: RunMassiveJobMatrixRow[]
  brokerQueueFilter: string | null
  onClearBrokerFilter?: () => void
}

export function RunMassiveJobMatrixTable({
  rows,
  brokerQueueFilter,
  onClearBrokerFilter,
}: RunMassiveJobMatrixTableProps) {
  const normalized = useMemo(() => rows.map(normalizeMatrixRow), [rows])

  const [kindText, setKindText] = useState('')
  const [modeText, setModeText] = useState('')
  const [taskNameText, setTaskNameText] = useState('')
  const [includeScheduled, setIncludeScheduled] = useState(true)
  const [includeOnDemand, setIncludeOnDemand] = useState(true)
  const [modeVisibility, setModeVisibility] = useState<MatrixModeColumnVisibility>({
    showMode: true,
    showModeSource: false,
  })
  const [effectsVisibility, setEffectsVisibility] = useState<MatrixEffectsSectionVisibility>({
    showFeedApi: false,
    showDb: true,
    showRedis: true,
  })
  const [showBrokerColumn, setShowBrokerColumn] = useState(false)
  const [sort, setSort] = useState<{ column: QueueKindMatrixSortColumn; direction: 'asc' | 'desc' }>({
    column: 'kind',
    direction: 'asc',
  })

  const filtered = useMemo(
    () =>
      filterMatrixRows(normalized, {
        kindText,
        modeText,
        taskNameText,
        includeScheduled,
        includeOnDemand,
        brokerQueueFilter,
      }),
    [normalized, kindText, modeText, taskNameText, includeScheduled, includeOnDemand, brokerQueueFilter],
  )

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => compareQueueKindMatrixRows(a, b, sort.column, sort.direction))
    return copy
  }, [filtered, sort])

  function toggleSort(column: QueueKindMatrixSortColumn) {
    setSort(prev =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: 'asc' },
    )
  }

  const jobStyleValue =
    includeScheduled && includeOnDemand
      ? 'all'
      : includeScheduled
        ? 'scheduled'
        : includeOnDemand
          ? 'on_demand'
          : 'none'

  if (normalized.length === 0) {
    return <p className="text-sm text-muted-foreground">No matrix data returned.</p>
  }

  return (
    <div className="space-y-3">
      {brokerQueueFilter && (
        <div className={celeryMatrixFilterBarClass}>
          <span>
            Filtered by <strong>{formatQueueLabel(brokerQueueFilter)}</strong>
            <code className="ml-1 text-dense-caption text-muted-foreground">({brokerQueueFilter})</code>
          </span>
          {onClearBrokerFilter && (
            <Button size="sm" variant="outline" className="h-7 text-xs ml-auto" onClick={onClearBrokerFilter}>
              Clear filter
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-end text-xs">
        <label className="space-y-1">
          <span className="text-muted-foreground">Kind</span>
          <Input
            className="h-8 w-32 text-xs"
            value={kindText}
            onChange={e => setKindText(e.target.value)}
            placeholder="Filter kind…"
          />
        </label>
        <label className="space-y-1 flex-1 min-w-[140px]">
          <span className="text-muted-foreground">Mode · source</span>
          <Input
            className="h-8 text-xs"
            value={modeText}
            onChange={e => setModeText(e.target.value)}
            placeholder="Filter mode or source…"
          />
        </label>
        <label className="space-y-1 flex-1 min-w-[140px]">
          <span className="text-muted-foreground">Task name</span>
          <Input
            className="h-8 text-xs"
            value={taskNameText}
            onChange={e => setTaskNameText(e.target.value)}
            placeholder="Filter task name…"
          />
        </label>
        {(kindText || modeText || taskNameText) && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => {
              setKindText('')
              setModeText('')
              setTaskNameText('')
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Job style</span>
          <BubbleSwitch
            size="sm"
            value={jobStyleValue}
            onChange={v => {
              if (v === 'all') {
                setIncludeScheduled(true)
                setIncludeOnDemand(true)
              } else if (v === 'scheduled') {
                setIncludeScheduled(true)
                setIncludeOnDemand(false)
              } else if (v === 'on_demand') {
                setIncludeScheduled(false)
                setIncludeOnDemand(true)
              } else {
                setIncludeScheduled(false)
                setIncludeOnDemand(false)
              }
            }}
            options={[
              { value: 'all', label: 'All' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'on_demand', label: 'On-demand' },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Mode col</span>
          <BubbleSwitch
            size="sm"
            value={modeVisibility.showMode ? 'mode' : modeVisibility.showModeSource ? 'src' : 'off'}
            onChange={v => {
              if (v === 'mode') setModeVisibility({ showMode: true, showModeSource: false })
              else if (v === 'src') setModeVisibility({ showMode: false, showModeSource: true })
              else setModeVisibility({ showMode: true, showModeSource: true })
            }}
            options={[
              { value: 'mode', label: 'Mode' },
              { value: 'src', label: 'Source' },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Effects</span>
          <div className="flex gap-1">
            {(['showFeedApi', 'showDb', 'showRedis'] as const).map(key => (
              <Button
                key={key}
                size="sm"
                variant={effectsVisibility[key] ? 'default' : 'outline'}
                className="h-7 text-dense-caption px-2"
                onClick={() => setEffectsVisibility(v => ({ ...v, [key]: !v[key] }))}
              >
                {key === 'showFeedApi' ? 'Feed' : key === 'showDb' ? 'DB' : 'Redis'}
              </Button>
            ))}
          </div>
        </div>
        <Button
          size="sm"
          variant={showBrokerColumn ? 'default' : 'outline'}
          className="h-7 text-xs"
          onClick={() => setShowBrokerColumn(v => !v)}
        >
          Broker queue col
        </Button>
      </div>

      <DenseDataTable tableClassName={celeryMatrixTableClass}>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead>
              <button type="button" className="hover:underline" onClick={() => toggleSort('kind')}>
                Kind{sortArrow('kind', sort)}
              </button>
            </DenseTableHead>
            <DenseTableHead>
              <button type="button" className="hover:underline" onClick={() => toggleSort('task_name')}>
                Task name{sortArrow('task_name', sort)}
              </button>
            </DenseTableHead>
            <DenseTableHead>
              <button type="button" className="hover:underline" onClick={() => toggleSort('job_style')}>
                Job style{sortArrow('job_style', sort)}
              </button>
            </DenseTableHead>
            <DenseTableHead>
              <span className="inline-flex items-center gap-1">
                Mode &amp; source
                <InfoTooltip text="Mode value and payload field that supplies it." />
              </span>
            </DenseTableHead>
            <DenseTableHead>Effects</DenseTableHead>
            {showBrokerColumn && (
              <DenseTableHead>
                <button type="button" className="hover:underline" onClick={() => toggleSort('broker_queue')}>
                  Broker queue (S · H){sortArrow('broker_queue', sort)}
                </button>
              </DenseTableHead>
            )}
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {sorted.length === 0 ? (
            <DenseTableRow>
              <DenseTableCell colSpan={showBrokerColumn ? 6 : 5} className="text-center py-6">
                <span className={denseTable.emptyHint}>No rows match filters.</span>
              </DenseTableCell>
            </DenseTableRow>
          ) : (
            sorted.map((row, i) => (
              <DenseTableRow key={`${row.kind}-${row.mode ?? 'null'}-${i}`}>
                <DenseTableCell>
                  <code className="font-mono text-dense-meta">{row.kind}</code>
                </DenseTableCell>
                <DenseTableCell>
                  <code className="font-mono text-dense-meta break-all">{resolvedMatrixTaskName(row)}</code>
                </DenseTableCell>
                <DenseTableCell>{matrixJobStyleLabel(row)}</DenseTableCell>
                <DenseTableCell>
                  <MatrixModeCell row={row} visibility={modeVisibility} />
                </DenseTableCell>
                <DenseTableCell className="max-w-xs">
                  <MatrixEffectsStacked row={row} visibility={effectsVisibility} />
                </DenseTableCell>
                {showBrokerColumn && (
                  <DenseTableCell>
                    <span title={brokerQueueKeyTitle(row.broker_queue_standard)}>
                      S {formatQueueLabel(row.broker_queue_standard)}
                    </span>
                    <span className={denseTable.mutedMeta}> · </span>
                    <span title={brokerQueueKeyTitle(row.broker_queue_high)}>
                      H {formatQueueLabel(row.broker_queue_high)}
                    </span>
                  </DenseTableCell>
                )}
              </DenseTableRow>
            ))
          )}
        </DenseTableBody>
      </DenseDataTable>
    </div>
  )
}
