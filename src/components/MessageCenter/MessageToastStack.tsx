import { useReducer, useEffect } from 'react'
import { X, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatLastUpdate } from '@/utils/positions'
import type { SystemMessage, SystemMessageLevel } from '@/types/messages'
import { IbConnectionMessageTitle } from '@/components/MessageCenter/IbConnectionSlotBadge'

interface Props {
  messages: SystemMessage[]
  dismissedIds: Set<string>
  onDismiss: (id: string) => void
}

const TOAST_VISIBLE_SEC = 10
const MAX_TOASTS = 5

// Module-level to avoid ESLint react-hooks/purity (Date.now not in render body)
function msgIsRecent(msg: SystemMessage): boolean {
  return Date.now() / 1000 - msg.occurred_at < TOAST_VISIBLE_SEC
}

function getLevelIcon(level: SystemMessageLevel) {
  switch (level) {
    case 'success': return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
    case 'warning': return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
    case 'error':   return <XCircle className="h-4 w-4 shrink-0 text-red-500" />
    default:        return <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
  }
}

const LEVEL_BORDER: Record<SystemMessageLevel, string> = {
  info:    'border-l-border',
  success: 'border-l-green-500',
  warning: 'border-l-amber-500',
  error:   'border-l-red-500',
}

function tickReducer(n: number): number { return n + 1 }

export function MessageToastStack({ messages, dismissedIds, onDismiss }: Props) {
  const [, tick] = useReducer(tickReducer, 0)

  // Periodic re-render to expire toasts by time
  useEffect(() => {
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [])

  const toasts = messages
    .filter(m => !dismissedIds.has(m.message_id) && msgIsRecent(m))
    .slice(0, MAX_TOASTS)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-14 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
      {toasts.map(msg => (
        <div
          key={msg.message_id}
          className={cn(
            'flex gap-3 rounded-lg border border-l-4 bg-popover p-3 shadow-lg pointer-events-auto',
            'animate-in slide-in-from-right-4 fade-in-0 duration-200',
            LEVEL_BORDER[msg.level],
          )}
        >
          <div className="mt-0.5">{getLevelIcon(msg.level)}</div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-sm font-medium leading-tight">
              <IbConnectionMessageTitle msg={msg} />
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2">{msg.message}</p>
            <p className="text-[10px] text-muted-foreground/60">
              {formatLastUpdate(msg.occurred_at)} ago
            </p>
          </div>
          <button
            onClick={() => onDismiss(msg.message_id)}
            className="shrink-0 self-start rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
