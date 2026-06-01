import { Fragment } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
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
  ConnectionCell,
  ControlButtons,
  IngestLampDot,
} from './socketIngestUi'

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
    <TableRow>
      <TableCell className="w-10 px-3">
        <IngestLampDot lamp={lamp} title={statusTitle} />
      </TableCell>
      <TableCell className="w-20 px-3">
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
      </TableCell>
      <TableCell className="px-3 min-w-[180px]">
        <div className="font-semibold text-sm">{svc.label}</div>
        <code className="text-xs text-muted-foreground font-mono">{svc.systemd_unit}</code>
      </TableCell>
      {showConnectionColumn && (
        <TableCell className="px-3 min-w-[200px]">
          <ConnectionCell svc={svc} status={status} elapsed={elapsed} category={category} wallNowSec={wallNowSec} />
        </TableCell>
      )}
      <TableCell className="px-3 text-xs text-muted-foreground max-w-[280px]">
        {logicalText}
      </TableCell>
      <TableCell className="px-3 min-w-[120px]">
        <ControlButtons
          svc={svc}
          actionBlock={block}
          redisLamp={lamp}
          isStarting={isStarting}
          isStopping={isStopping}
          onAction={onAction}
        />
      </TableCell>
    </TableRow>
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
  const colCount = showConnectionColumn ? 6 : 5

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-4">Loading services from Ops API…</p>
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
      <p className="text-sm text-muted-foreground py-4">
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
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-10 text-xs uppercase tracking-wide">Status</TableHead>
              <TableHead className="w-20 text-xs uppercase tracking-wide">
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
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Service</TableHead>
              {showConnectionColumn && (
                <TableHead className="text-xs uppercase tracking-wide">Connection</TableHead>
              )}
              <TableHead className="text-xs uppercase tracking-wide">Redis / logical</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map(({ cat, rows: catRows }) => (
              <Fragment key={cat}>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableCell colSpan={colCount} className="py-2 px-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {INGEST_CATEGORY_LABELS[cat]}
                    </span>
                  </TableCell>
                </TableRow>
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
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
