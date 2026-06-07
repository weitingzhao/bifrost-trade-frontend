import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display/denseTableClasses'
import type { IngestLamp } from '@/utils/socketIngestLamp'
import type { OpsHostEnvPill as OpsHostEnvPillType } from '@/utils/ingestOpsShared'

export const socketSectionTitleClass = denseTable.sectionTitle

export const socketSectionBlockClass = denseTable.sectionBlock

export const socketElevatedCardClass = cn('gap-3 p-4')

export const socketPageDescriptionClass = cn(
  'text-sm text-muted-foreground flex items-center gap-2 flex-wrap font-normal',
)

export const socketConflictAlertClass = cn(
  'flex items-start gap-3 rounded-lg border border-orange-500/40 bg-orange-500/10 p-3',
)

export const socketConflictClearButtonClass = cn(
  'shrink-0 text-xs border-orange-500/40 text-orange-500 hover:bg-orange-500/10',
)

export const socketIngestTableClass = 'min-w-[56rem]'

/** table-fixed column widths when Connection column is shown */
export const SOCKET_INGEST_COL_WIDTHS_WITH_CONNECTION = {
  status: '6%',
  host: '10%',
  service: '22%',
  connection: '28%',
  logical: '24%',
  actions: '10%',
} as const

/** table-fixed column widths without Connection column */
export const SOCKET_INGEST_COL_WIDTHS_NO_CONNECTION = {
  status: '6%',
  host: '10%',
  service: '24%',
  logical: '48%',
  actions: '12%',
} as const

export const socketServiceLabelClass = cn('font-semibold text-sm')

export const socketServiceUnitClass = cn('text-xs text-muted-foreground font-mono')

export const socketLogicalCellClass = cn('text-xs text-muted-foreground max-w-[280px]')

export const socketActionsCellClass = cn('align-top')

export const socketActionsInnerClass = cn('flex items-center gap-1 flex-wrap')

export const socketStatusCellClass = cn('w-[6%]')

export const socketHostCellClass = cn('w-[10%]')

export const socketIbClientIdClass = cn(
  'font-mono tabular-nums bg-muted/50 px-1.5 py-0.5 rounded text-xs',
)

export const socketSubheadLabelClass = cn(
  'text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60',
)

export const socketMonitorHintClass = cn('text-xs text-muted-foreground mt-3')

export const LAMP_BG: Record<IngestLamp | 'none', string> = {
  green: 'bg-lamp-green',
  yellow: 'bg-lamp-yellow',
  red: 'bg-lamp-red',
  gray: 'bg-lamp-gray',
  none: 'bg-lamp-gray',
}

export function socketLampDotClass(lamp: IngestLamp): string {
  return cn('inline-block h-2.5 w-2.5 rounded-full shrink-0', LAMP_BG[lamp])
}

export function opsHostEnvPillVariantClass(variant: OpsHostEnvPillType['pillVariant']): string {
  const map: Record<OpsHostEnvPillType['pillVariant'], string> = {
    dev: 'border-sky-500/40 bg-sky-500/10 text-sky-400',
    prod: 'border-green-600/40 bg-green-600/10 text-green-400',
    other: 'border-border bg-muted/40 text-muted-foreground',
  }
  return cn(
    'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
    map[variant],
  )
}

export function opsHostEnvPillDotClass(variant: OpsHostEnvPillType['pillVariant']): string {
  const map: Record<OpsHostEnvPillType['pillVariant'], string> = {
    dev: 'bg-sky-400',
    prod: 'bg-green-500',
    other: 'bg-muted-foreground/50',
  }
  return cn('h-1.5 w-1.5 rounded-full shrink-0', map[variant])
}

const OPS_AUTH_ROLE_CLASS: Record<string, string> = {
  viewer: 'bg-muted text-muted-foreground border-border',
  operator: 'bg-primary/15 text-primary border-primary/30',
  admin: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
}

export function opsAuthRoleBadgeClass(role: string): string {
  const key = role.toLowerCase()
  return cn(
    'font-bold uppercase tracking-wide',
    OPS_AUTH_ROLE_CLASS[key] ?? OPS_AUTH_ROLE_CLASS.viewer,
  )
}

export function opsAuthAuthenticatedBadgeClass(): string {
  return 'border-green-600/40 text-green-500 bg-green-500/10'
}

export function opsAuthTokenRequiredBadgeClass(): string {
  return 'border-warning/40 text-warning bg-warning-soft'
}

export function socketMassiveAgeBadgeClass(ageS: number): string {
  const isOk = ageS < 5
  const isWarn = ageS >= 5 && ageS < 30
  return cn(
    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border',
    isOk
      ? 'bg-green-500/15 text-green-500 border-green-500/30'
      : isWarn
        ? 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30'
        : 'bg-red-500/15 text-red-500 border-red-500/30',
  )
}

export function socketServiceHeartbeatBadgeClass(opts: {
  overdue?: boolean
  critical?: boolean
  isSoon?: boolean
}): string {
  const { overdue, critical, isSoon } = opts
  return cn(
    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border min-w-[38px] justify-center',
    critical
      ? 'bg-red-500/15 text-red-400 border-red-500/30'
      : overdue
        ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
        : isSoon
          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
          : 'bg-slate-500/20 text-slate-300 border-slate-500/35',
  )
}

export function socketIbProbeBadgeClass(stale: boolean, isSoon: boolean): string {
  return cn(
    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border',
    stale
      ? 'bg-red-500/15 text-red-400 border-red-500/30'
      : isSoon
        ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
        : 'bg-green-500/15 text-green-400 border-green-500/30',
  )
}

/** IB Broker Connection — unified dot size (matches Status lamp h-2 w-2). */
export function ibBrokerSlotDotClass(live: boolean): string {
  return cn('h-2 w-2', live ? LAMP_BG.green : LAMP_BG.red)
}

export const ibBrokerClientIdClass = socketIbClientIdClass
export const ibBrokerProbeBadgeClass = socketIbProbeBadgeClass
export const ibBrokerHeartbeatBadgeClass = socketServiceHeartbeatBadgeClass

export function socketStartingIndicatorDotClass(): string {
  return 'h-2 w-2 rounded-full bg-yellow-400 animate-pulse'
}

export function socketStartingIndicatorLabelClass(): string {
  return 'text-xs font-semibold text-yellow-400 capitalize'
}

export function socketControlStartButtonClass(): string {
  return 'text-green-500 hover:text-green-400'
}

export function socketControlBlockedMessageClass(): string {
  return 'text-xs text-muted-foreground max-w-[220px]'
}
