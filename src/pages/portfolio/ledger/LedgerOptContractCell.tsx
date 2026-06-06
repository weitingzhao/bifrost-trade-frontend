import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { Execution } from '@/types/positions'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import {
  flattenLinksForOptGroup,
  getInstanceConsistencyState,
  getLedgerOptContractLabelParts,
  getOptionStockLinkDetailForExecution,
  sumLinkSlippageForOptGroup,
} from '@/utils/ledger/ledgerOptHelpers'
import type { OptionStockLink, OptionStockLinkSummary } from '@/types/trading'

const INSTANCE_ICON_CLASS: Record<string, string> = {
  same: 'text-[var(--color-success)] hover:text-[var(--color-success)]',
  multiple: 'text-[var(--color-instance-multi)] hover:text-[var(--color-instance-multi)]',
  mixed: 'text-[var(--color-warning)] hover:text-[var(--color-warning)]',
}

function InstanceSquareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      className={cn('shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="5" y="5" width="14" height="14" rx="1" />
    </svg>
  )
}

function StockLinkAggregateIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 18h6v-6H3v6zm9-12h6V3h-6v3zM3 8h6V3H3v5zm9 10h6v-6h-6v6z" />
      <path d="M14 9h2M9 14v2" />
    </svg>
  )
}

/**
 * Detail rows: icon only when this fill has been assigned an instance (Legacy detail parity).
 * Unassigned fills (Stg/Ins —) show no icon.
 */
export function LedgerDetailInstanceIcon({
  execution,
  className,
}: {
  execution?: Execution
  className?: string
}) {
  if (execution == null) return null

  const instanceId =
    execution.strategy_instance_id != null && Number.isFinite(Number(execution.strategy_instance_id))
      ? Number(execution.strategy_instance_id)
      : null
  if (instanceId == null) return null

  const instLabel = execution.strategy_instance_label?.trim()
  const title = instLabel ? `Instance: ${instLabel}` : `View instance #${instanceId}`

  return (
    <Link
      to={`/strategy/instances/${instanceId}`}
      className={cn(
        'shrink-0 inline-flex items-center',
        INSTANCE_ICON_CLASS.same,
        className,
      )}
      title={title}
      aria-label={title}
      onClick={e => e.stopPropagation()}
    >
      <InstanceSquareIcon className={INSTANCE_ICON_CLASS.same} />
    </Link>
  )
}

export function LedgerInstanceConsistencyIcon({
  trades,
  className,
}: {
  trades: Execution[]
  className?: string
}) {
  const state = getInstanceConsistencyState(trades)
  if (state === 'none') return null

  const colorCls = INSTANCE_ICON_CLASS[state] ?? INSTANCE_ICON_CLASS.mixed
  const icon = <InstanceSquareIcon className={colorCls} />

  if (state === 'same') {
    const instanceId = trades.find(
      t => t.strategy_instance_id != null && Number.isFinite(t.strategy_instance_id),
    )?.strategy_instance_id
    if (instanceId != null) {
      return (
        <Link
          to={`/strategy/instances/${instanceId}`}
          className={cn('mr-1.5 inline-flex items-center', colorCls, className)}
          title="All fills share one strategy instance (click to open)"
          aria-label="View strategy instance"
          onClick={e => e.stopPropagation()}
        >
          {icon}
        </Link>
      )
    }
  }

  const title =
    state === 'same'
      ? 'All fills share one strategy instance'
      : state === 'multiple'
        ? 'All fills have an instance; more than one distinct instance ID in this group'
        : 'At least one fill has no strategy instance in this group'

  return (
    <span
      className={cn('mr-1.5 inline-flex items-center', colorCls, className)}
      title={title}
      role="img"
      onClick={e => e.stopPropagation()}
    >
      {icon}
    </span>
  )
}

export type ViewLinksPayload = {
  title: string
  oid?: number
  links?: OptionStockLink[]
  slippageTotal?: number | null
}

type Props = {
  group: OptExecutionGroup
  linkByOptionId?: Record<number, OptionStockLinkSummary>
  onViewLinks?: (ctx: ViewLinksPayload) => void
  showExecId?: number | null
  /** Closed-option group rows — larger, option-colored contract label. */
  prominent?: boolean
  className?: string
}

export function LedgerOptContractCell({
  group,
  linkByOptionId,
  onViewLinks,
  showExecId,
  prominent = false,
  className,
}: Props) {
  const trades = group.trades ?? []
  const { namePart, rightLabel, strikeStr, full } = getLedgerOptContractLabelParts(group)

  const fillExec =
    showExecId != null ? trades.find(t => t.account_executions_id === showExecId) : undefined
  const fillLinkDetail =
    fillExec && linkByOptionId
      ? getOptionStockLinkDetailForExecution(fillExec, linkByOptionId)
      : null

  const linkRows = fillLinkDetail
    ? fillLinkDetail.links
    : linkByOptionId
      ? flattenLinksForOptGroup(group, linkByOptionId)
      : []
  const linkSlippageSum = fillLinkDetail
    ? fillLinkDetail.slippageTotal
    : linkByOptionId && linkRows.length > 0
      ? sumLinkSlippageForOptGroup(group, linkByOptionId)
      : null
  const linkModalTitle = fillLinkDetail && showExecId != null
    ? `Fill #${showExecId} — stock links`
    : `Linked stocks · ${full}`

  const isDetailRow = showExecId != null
  const InstanceIcon = isDetailRow ? (
    <LedgerDetailInstanceIcon
      execution={fillExec}
      className={prominent ? 'mr-1' : 'mr-1.5'}
    />
  ) : (
    <LedgerInstanceConsistencyIcon trades={trades} className={prominent ? 'mr-1' : undefined} />
  )

  return (
    <span
      className={cn(
        'inline-flex min-w-0 flex-wrap items-center gap-1 font-mono',
        prominent
          ? 'text-[0.8125rem] leading-snug tracking-tight'
          : 'text-[length:var(--text-dense-meta)]',
        className,
      )}
    >
      {InstanceIcon}
      <span className="min-w-0">
        <strong
          className={cn(
            prominent ? 'font-bold text-entity-option' : 'font-semibold text-foreground',
          )}
        >
          {namePart}
        </strong>
        {rightLabel ? (
          <span className={prominent ? 'font-semibold text-foreground' : undefined}>
            {' '}
            {rightLabel}
            {strikeStr}
          </span>
        ) : null}
        {showExecId != null && (
          <span className="ml-1.5 text-[0.72em] font-medium text-muted-foreground/75">
            #{showExecId}
          </span>
        )}
      </span>
      {onViewLinks && linkRows.length > 0 ? (
        <button
          type="button"
          className="ml-1 inline-flex items-center text-[var(--color-link)] hover:text-[var(--color-link-hover)]"
          title="Linked stock fills — open summary (details show per-fill link IDs)"
          aria-label="Linked stock fills"
          onClick={e => {
            e.stopPropagation()
            onViewLinks({
              title: linkModalTitle,
              oid: showExecId ?? undefined,
              links: linkRows,
              slippageTotal: linkSlippageSum,
            })
          }}
        >
          <StockLinkAggregateIcon />
        </button>
      ) : null}
    </span>
  )
}
