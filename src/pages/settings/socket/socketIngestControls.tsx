import { Play, Square, RotateCcw, Zap } from 'lucide-react'
import type { MarketIngestAction } from '@/api/ops'
import {
  type MarketIngestServiceRow,
  type IngestLamp,
} from '@/utils/socketIngestLamp'
import {
  ingestActionBlockMessage,
  ingestActionButtonsForState,
  type IngestActionBlock,
} from '@/utils/ingestOpsShared'
import { DenseTag, IconActionButton } from '@/components/data-display'
import type { DenseTagVariant } from '@/components/data-display'
import {
  socketActionsInnerClass,
  socketControlBlockedMessageClass,
  socketControlStartButtonClass,
  socketLampDotClass,
  socketStartingIndicatorDotClass,
  socketStartingIndicatorLabelClass,
} from './socketIngestUi'

const PROCESS_TAG_VARIANT: Record<string, DenseTagVariant> = {
  active: 'success',
  activating: 'warning',
  deactivating: 'warning',
  reloading: 'warning',
  inactive: 'neutral',
  failed: 'danger',
  dead: 'danger',
}

export function IngestLampDot({ lamp, title }: { lamp: IngestLamp; title: string }) {
  return (
    <span className={socketLampDotClass(lamp)} title={title} />
  )
}

export function ProcessBadge({ active }: { active: string }) {
  const key = (active || '').toLowerCase().trim()
  const variant = PROCESS_TAG_VARIANT[key]
  if (variant) {
    return (
      <DenseTag variant={variant} size="pill" className="font-mono text-xs">
        {key}
      </DenseTag>
    )
  }
  return (
    <DenseTag variant="neutral" size="pill" className="font-mono text-xs">
      {active || '—'}
    </DenseTag>
  )
}

export function StartingStoppingIndicator({ mode }: { mode: 'starting' | 'stopping' }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className={socketStartingIndicatorDotClass()} aria-hidden />
      <span className={socketStartingIndicatorLabelClass()}>{mode}…</span>
    </div>
  )
}

export function ControlButtons({
  svc,
  actionBlock,
  redisLamp,
  isStarting,
  isStopping,
  onAction,
}: {
  svc: MarketIngestServiceRow
  actionBlock: IngestActionBlock
  redisLamp: IngestLamp
  isStarting?: boolean
  isStopping?: boolean
  onAction: (svc: MarketIngestServiceRow, action: MarketIngestAction) => void
}) {
  const rawButtons = ingestActionButtonsForState(svc.process_active)
  const showStart = isStarting ? false : isStopping ? false : redisLamp === 'green' ? false : rawButtons.showStart
  const showStop = isStarting ? true : isStopping ? false : redisLamp === 'green' ? true : rawButtons.showStop
  const blocked = actionBlock !== 'none'
  const blockMsg = ingestActionBlockMessage(actionBlock)
  const isIb = svc.id !== 'massive_ws'
  const blockedBySibling = actionBlock === 'remote_env' && !svc.redis_control_env

  if (blocked) {
    return (
      <span
        className={socketControlBlockedMessageClass()}
        title={blockedBySibling ? 'Peer service(s) held by other stack — stop them first.' : undefined}
      >
        {blockedBySibling
          ? 'Peer service(s) held by other stack — stop them first.'
          : blockMsg}
      </span>
    )
  }

  return (
    <div>
      {isStarting && <StartingStoppingIndicator mode="starting" />}
      {isStopping && <StartingStoppingIndicator mode="stopping" />}
      <div className={socketActionsInnerClass}>
        {showStart && (
          <IconActionButton
            title={`Start ${svc.label}`}
            ariaLabel={`Start ${svc.label}`}
            className={socketControlStartButtonClass()}
            onClick={() => onAction(svc, 'start')}
          >
            <Play className="h-3.5 w-3.5" />
          </IconActionButton>
        )}
        {showStop && (
          <IconActionButton
            title={`Stop ${svc.label}`}
            ariaLabel={`Stop ${svc.label}`}
            tone="danger"
            onClick={() => onAction(svc, 'stop')}
          >
            <Square className="h-3.5 w-3.5" />
          </IconActionButton>
        )}
        <IconActionButton
          title={`Restart ${svc.label}`}
          ariaLabel={`Restart ${svc.label}`}
          onClick={() => onAction(svc, 'restart')}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </IconActionButton>
        {isIb && (
          <IconActionButton
            title={`Reset ${svc.label}`}
            ariaLabel={`Reset ${svc.label}`}
            tone="warn"
            onClick={() => onAction(svc, 'reset')}
          >
            <Zap className="h-3.5 w-3.5" />
          </IconActionButton>
        )}
      </div>
    </div>
  )
}

export interface SocketConfirmState {
  open: boolean
  title: string
  description: string
  svc: MarketIngestServiceRow | null
  action: MarketIngestAction | null
}

export const CLOSED_SOCKET_CONFIRM: SocketConfirmState = {
  open: false,
  title: '',
  description: '',
  svc: null,
  action: null,
}
