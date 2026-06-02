import { Fragment } from 'react'
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTableSubheadRow,
} from '@/components/data-display'
import { denseTable } from '@/components/data-display/denseTableClasses'
import type { StatusResponse } from '@/types/monitor'
import type { MarketIngestAction } from '@/api/ops'
import {
  buildIngestLogicalSummary,
  buildUnifiedIngestRows,
  buildDaemonIngestRows,
  ingestRedisHealthLamp,
  ingestRowUsesConnectionColumn,
  INGEST_CATEGORY_LABELS,
  type IngestCategory,
  type MarketIngestServiceRow,
} from '@/utils/socketIngestLamp'
import {
  ingestActionBlock,
  resolveEffectiveRedisControlEnv,
  runtimeControlHostDisplay,
  type IngestActionBlock,
} from '@/utils/ingestOpsShared'
import { OpsHostEnvPill } from './OpsHostEnvPill'
import {
  SOCKET_INGEST_COL_WIDTHS_NO_CONNECTION,
  SOCKET_INGEST_COL_WIDTHS_WITH_CONNECTION,
  socketActionsCellClass,
  socketIngestTableClass,
  socketLogicalCellClass,
  socketServiceLabelClass,
  socketServiceUnitClass,
  socketSubheadLabelClass,
} from './socketIngestUi'
import { ConnectionCell } from './IngestConnectionCell'
import { ControlButtons, IngestLampDot } from './socketIngestControls'

function ServiceRow({
  svc,
  category,
  status,
  elapsed,
  pageEnv,
  disableScript,
  canOperate,
  allServices,
  showConnectionColumn,
  isStarting,
  isStopping,
  onAction,
  wallNowSec,
}: {
  svc: MarketIngestServiceRow
  category: IngestCategory
  status: StatusResponse | null
  elapsed: number
  pageEnv: 'dev' | 'prod' | null
  disableScript: boolean
  canOperate: boolean
  allServices: MarketIngestServiceRow[]
  showConnectionColumn: boolean
  isStarting: boolean
  isStopping: boolean
  onAction: (svc: MarketIngestServiceRow, action: MarketIngestAction) => void
  wallNowSec: number
}) {
  const redisHealth = ingestRedisHealthLamp(svc.id, status)
  const hostUnclaimed = !(svc.redis_control_env ?? '').trim()
  const lamp = hostUnclaimed && redisHealth.lamp === 'green' ? 'red' : redisHealth.lamp
  const statusTitle =
    hostUnclaimed && redisHealth.lamp === 'green'
      ? `${redisHealth.title} — Host lease unclaimed (no Dev/Prod Ops start). Redis health may be stale from a previous run.`
      : redisHealth.title

  const { title: runtimeHostTitle, pill: runtimeHostPill } = runtimeControlHostDisplay(
    svc.redis_control_env,
    svc.redis_meta_key,
    svc.redis_control_host,
  )
  const effectiveEnv = resolveEffectiveRedisControlEnv(svc, allServices)
  const block: IngestActionBlock = ingestActionBlock(canOperate, disableScript, pageEnv, effectiveEnv)
  const blockedBySibling = block === 'remote_env' && !svc.redis_control_env
  const logicalText = buildIngestLogicalSummary(svc, status)

  return (
    <DenseTableRow>
      <DenseTableCell>
        <IngestLampDot lamp={lamp} title={statusTitle} />
      </DenseTableCell>
      <DenseTableCell>
        <div
          className="flex items-center gap-1"
          title={blockedBySibling
            ? `${runtimeHostTitle} — Sibling services in this group hold a lease for the other Ops stack.`
            : runtimeHostTitle}
        >
          <OpsHostEnvPill pill={runtimeHostPill} />
          {blockedBySibling && (
            <span className="text-yellow-400 text-xs" title="Locked by sibling service lease">⚠</span>
          )}
        </div>
      </DenseTableCell>
      <DenseTableCell>
        <div className={socketServiceLabelClass}>{svc.label}</div>
        <code className={socketServiceUnitClass}>{svc.systemd_unit}</code>
      </DenseTableCell>
      {showConnectionColumn && (
        <DenseTableCell>
          <ConnectionCell svc={svc} status={status} elapsed={elapsed} category={category} wallNowSec={wallNowSec} />
        </DenseTableCell>
      )}
      <DenseTableCell className={socketLogicalCellClass}>
        {logicalText}
      </DenseTableCell>
      <DenseTableCell className={socketActionsCellClass}>
        <ControlButtons
          svc={svc}
          actionBlock={block}
          redisLamp={lamp}
          isStarting={isStarting}
          isStopping={isStopping}
          onAction={onAction}
        />
      </DenseTableCell>
    </DenseTableRow>
  )
}

export function IngestServicesTable({
  services,
  status,
  elapsed,
  pageEnv,
  disableScript,
  canOperate,
  startingIds,
  stoppingIds,
  wallNowSec,
  onAction,
  isLoading,
  isError,
  variant = 'socket',
  emptyHint,
}: {
  services: MarketIngestServiceRow[]
  status: StatusResponse | null
  elapsed: number
  pageEnv: 'dev' | 'prod' | null
  disableScript: boolean
  canOperate: boolean
  startingIds: ReadonlySet<string>
  stoppingIds: ReadonlySet<string>
  onAction: (svc: MarketIngestServiceRow, action: MarketIngestAction) => void
  isLoading: boolean
  isError: boolean
  wallNowSec: number
  variant?: 'socket' | 'daemon'
  emptyHint?: string
}) {
  const rows = variant === 'daemon' ? buildDaemonIngestRows(services) : buildUnifiedIngestRows(services)
  const showConnectionColumn = rows.some(({ svc, category }) => ingestRowUsesConnectionColumn(svc, category))
  const colWidths = showConnectionColumn
    ? SOCKET_INGEST_COL_WIDTHS_WITH_CONNECTION
    : SOCKET_INGEST_COL_WIDTHS_NO_CONNECTION
  const colCount = showConnectionColumn ? 6 : 5

  if (isLoading) {
    return <p className={denseTable.emptyHint}>Loading services from Ops API…</p>
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive py-4">
        Failed to load services from Ops API. Check Ops is running and the token is correct.
      </p>
    )
  }
  if (rows.length === 0) {
    return (
      <p className={denseTable.emptyHint}>
        {emptyHint ?? (variant === 'daemon'
          ? 'No trading_engine or account_sync_daemon rows in Ops config.'
          : 'No socket services returned by Ops API.')}
      </p>
    )
  }

  const groups: { cat: IngestCategory; rows: typeof rows }[] = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    if (!last || last.cat !== row.category) {
      groups.push({ cat: row.category, rows: [row] })
    } else {
      last.rows.push(row)
    }
  }

  return (
    <TooltipProvider>
      <DenseDataTable tableClassName={socketIngestTableClass} wrapClassName="rounded-lg border">
        <colgroup>
          <col style={{ width: colWidths.status }} />
          <col style={{ width: colWidths.host }} />
          <col style={{ width: colWidths.service }} />
          {showConnectionColumn && (
            <col style={{ width: SOCKET_INGEST_COL_WIDTHS_WITH_CONNECTION.connection }} />
          )}
          <col style={{ width: colWidths.logical }} />
          <col style={{ width: colWidths.actions }} />
        </colgroup>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead className="normal-case tracking-normal">Status</DenseTableHead>
            <DenseTableHead className="normal-case tracking-normal">
              <span className="inline-flex items-center gap-1">
                Host
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/60" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm text-xs">
                    Only one of Dev or Prod may run each service against the same Redis. Starting elsewhere is rejected if HOST differs.
                  </TooltipContent>
                </Tooltip>
              </span>
            </DenseTableHead>
            <DenseTableHead className="normal-case tracking-normal">Service</DenseTableHead>
            {showConnectionColumn && (
              <DenseTableHead className="normal-case tracking-normal">Connection</DenseTableHead>
            )}
            <DenseTableHead className="normal-case tracking-normal">Redis / logical</DenseTableHead>
            <DenseTableHead className="normal-case tracking-normal">Actions</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {groups.map(({ cat, rows: catRows }) => (
            <Fragment key={cat}>
              <DenseTableSubheadRow>
                <DenseTableCell colSpan={colCount}>
                  <span className={socketSubheadLabelClass}>
                    {INGEST_CATEGORY_LABELS[cat]}
                  </span>
                </DenseTableCell>
              </DenseTableSubheadRow>
              {catRows.map(({ svc, category }) => (
                <ServiceRow
                  key={svc.id}
                  svc={svc}
                  category={category}
                  status={status}
                  elapsed={elapsed}
                  pageEnv={pageEnv}
                  disableScript={disableScript}
                  canOperate={canOperate}
                  allServices={services}
                  showConnectionColumn={showConnectionColumn}
                  isStarting={startingIds.has(svc.id)}
                  isStopping={stoppingIds.has(svc.id)}
                  onAction={onAction}
                  wallNowSec={wallNowSec}
                />
              ))}
            </Fragment>
          ))}
        </DenseTableBody>
      </DenseDataTable>
    </TooltipProvider>
  )
}
