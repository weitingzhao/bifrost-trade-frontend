import { cn } from '@/lib/utils'
import type { SystemMessage } from '@/types/messages'

const IB_SERVICE_LABELS: Record<string, string> = {
  ib_operator: 'IB Operator',
  ib_ingestor: 'IB Ingestor',
  ib_account_agent: 'IB Account Agent',
}

/** IB Broker slot colors — align with Socket page Host (sky) / Sec (violet). */
export function ibSlotBadgeClass(slot?: string): string {
  const key = (slot || 'host').trim().toLowerCase()
  if (key === 'secondary') {
    return 'text-violet-600 dark:text-violet-400'
  }
  return 'text-sky-600 dark:text-sky-400'
}

export function ibSlotDisplayLabel(slot?: string): string {
  const key = (slot || 'host').trim().toLowerCase()
  return key === 'secondary' ? 'SECONDARY' : 'HOST'
}

interface Props {
  slot?: string
  className?: string
}

export function IbConnectionSlotBadge({ slot, className }: Props) {
  return (
    <span
      className={cn(
        'font-semibold tracking-wide',
        ibSlotBadgeClass(slot),
        className,
      )}
    >
      {ibSlotDisplayLabel(slot)}
    </span>
  )
}

function connectionStatusVerb(statusTo?: string | null): string {
  if (statusTo === 'disconnected') return 'disconnected'
  if (statusTo === 'connected') return 'connected'
  return 'connection changed'
}

export function IbConnectionMessageTitle({ msg }: { msg: SystemMessage }) {
  if (msg.topic !== 'ib.connection' || !msg.slot) {
    return <>{msg.title}</>
  }
  const service =
    IB_SERVICE_LABELS[msg.service || ''] ||
    (msg.service || 'IB').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <>
      {service} — <IbConnectionSlotBadge slot={msg.slot} /> {connectionStatusVerb(msg.status_to)}
    </>
  )
}
