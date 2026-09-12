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
  DenseTag,
} from '@/components/data-display'
import { denseTable } from '@/components/data-display'
import type { StatusResponse } from '@/types/monitor'
import type { MarketIngestAction } from '@/api/ops'
import {
  buildUnifiedIngestRows,
  buildDaemonIngestRows,
  ingestRowUsesConnectionColumn,
  resolveIngestOpsRowDisplay,
  INGEST_CATEGORY_LABELS,
  type IngestCategory,
  type MarketIngestServiceRow,
} from '@/utils/socketIngestLamp'
import {
  ingestActionBlock,
  INGEST_FORCE_RESTART_ACTION,
  resolveEffectiveRedisControlEnv,
  runtimeControlHostDisplay,
  type IngestActionBlock,
  type PageStackEnv,
} from '@/utils/ingestOpsShared'
import { OpsHostEnvPill } from './OpsHostEnvPill'
import {
  SOCKET_INGEST_COL_WIDTHS_NO_CONNECTION,
  SOCKET_INGEST_COL_WIDTHS_WITH_CONNECTION,
  socketActionsCellClass,
  socketConnectionCellClass,
  socketIngestTableClass,
  socketLogicalCellClass,
  socketServiceCellClass,
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
  canOperate,
  allServices,
  showConnectionColumn,
  isStarting,
  isStopping,
  onAction,
  wallNowSec,
  variant,
}: {
  svc: MarketIngestServiceRow
  category: IngestCategory
  status: StatusResponse | null
  elapsed: number
  pageEnv: PageStackEnv | null
  canOperate: boolean
  allServices: MarketIngestServiceRow[]
  showConnectionColumn: boolean
  isStarting: boolean
  isStopping: boolean
  onAction: (svc: MarketIngestServiceRow, action: MarketIngestAction) => void
  wallNowSec: number
  variant: 'socket' | 'daemon'
}) {
  const effectiveEnv = resolveEffectiveRedisControlEnv(svc, allServices)
  const processRunning = ['active', 'activating'].includes((svc.process_active || '').toLowerCase())
  const ownLease = (svc.redis_control_env ?? '').trim()
  const hostEnvForDisplay =
    ownLease
    || (effectiveEnv && effectiveEnv !== '__stack_conflict__' ? effectiveEnv : null)
    || (processRunning && pageEnv ? pageEnv : null)
  const hostFromSibling = !ownLease && effectiveEnv && effectiveEnv !== '__stack_conflict__'
  const hostFromPageEnv = !ownLease && !hostFromSibling && processRunning && !!pageEnv
  const hostUnclaimed = !hostEnvForDisplay
  const externallyManaged = svc.runtime_externally_managed === true
  const { lamp, title: statusTitle, logicalText } = resolveIngestOpsRowDisplay({
    svc,
    status,
    processActive: svc.process_active,
    isStarting,
    isStopping,
    hostUnclaimed,
    runtimeExternallyManaged: externallyManaged,
  })

  const { title: runtimeHostTitle, pill: runtimeHostPill } = runtimeControlHostDisplay(
    hostEnvForDisplay,
    svc.redis_meta_key,
    svc.redis_control_host,
  )
  const runtimeHostTitleResolved = hostFromSibling
    ? `${runtimeHostTitle} — Host inferred from IB group sibling lease (this row's Redis hash has no bifrost_ops_control_env).`
    : hostFromPageEnv
      ? `${runtimeHostTitle} — Host inferred from this Ops instance profile while process is still running.`
      : runtimeHostTitle
  const block: IngestActionBlock = ingestActionBlock(
    canOperate,
    pageEnv,
    effectiveEnv,
    externallyManaged,
    svc.k8s_scale_guard,
    variant === 'daemon',
  )
  const blockedBySibling = block === 'remote_env' && !svc.redis_control_env
  const showK8sReady =
    variant === 'daemon' && svc.k8s_replicas !== undefined
  const k8sReadyText = showK8sReady
    ? `K8s ${svc.k8s_ready ?? 0}/${svc.k8s_replicas} ready`
    : null
  const tradingControl = variant === 'daemon' && svc.id === 'trading_engine'
    ? status?.daemon?.heartbeat?.daemon_alive
      ? status.daemon.trading.trading_suspended
        ? { label: 'Suspended', variant: 'warning' as const }
        : { label: 'Hedge enabled', variant: 'success' as const }
      : { label: 'Unavailable', variant: 'neutral' as const }
    : null

  return (
    <DenseTableRow>
      <DenseTableCell>
        <div className="flex flex-col gap-0.5">
          <IngestLampDot lamp={lamp} title={statusTitle} />
          {k8sReadyText ? (
            <span className="text-dense-micro font-mono tabular-nums text-muted-foreground whitespace-nowrap">
              {k8sReadyText}
            </span>
          ) : null}
        </div>
      </DenseTableCell>
      <DenseTableCell>
        <div
          className="flex items-center gap-1"
          title={blockedBySibling
            ? `${runtimeHostTitleResolved} — Sibling services in this group hold a lease for the other Ops stack.`
            : runtimeHostTitleResolved}
        >
          <OpsHostEnvPill pill={runtimeHostPill} />
          {blockedBySibling && (
            <span className="text-yellow-400 text-xs" title="Locked by sibling service lease">⚠</span>
          )}
        </div>
      </DenseTableCell>
      <DenseTableCell className={socketServiceCellClass}>
        <div className={socketServiceLabelClass}>{svc.label}</div>
        <code className={socketServiceUnitClass}>{svc.systemd_unit}</code>
      </DenseTableCell>
      {showConnectionColumn && (
        <DenseTableCell className={socketConnectionCellClass}>
          <div className="min-w-0 max-w-full">
          <ConnectionCell
            svc={svc}
            status={status}
            elapsed={elapsed}
            category={category}
            wallNowSec={wallNowSec}
            onReconnect={block === 'none' ? () => onAction(svc, INGEST_FORCE_RESTART_ACTION) : undefined}
            reconnectDisabled={block !== 'none' || isStarting || isStopping}
            reconnectBusy={isStarting || isStopping}
          />
          </div>
        </DenseTableCell>
      )}
      <DenseTableCell className={socketLogicalCellClass}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span>{logicalText}</span>
          {tradingControl && (
            <DenseTag variant={tradingControl.variant} size="cell">
              {tradingControl.label}
            </DenseTag>
          )}
        </div>
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
  pageEnv: PageStackEnv | null
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
            <DenseTableHead className="normal-case tracking-normal">Health</DenseTableHead>
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
                  canOperate={canOperate}
                  allServices={services}
                  showConnectionColumn={showConnectionColumn}
                  isStarting={startingIds.has(svc.id)}
                  isStopping={stoppingIds.has(svc.id)}
                  onAction={onAction}
                  wallNowSec={wallNowSec}
                  variant={variant}
                />
              ))}
            </Fragment>
          ))}
        </DenseTableBody>
      </DenseDataTable>
    </TooltipProvider>
  )
}
