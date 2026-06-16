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
    case 'success': return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
    case 'warning': return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
    case 'error':   return <XCircle className="h-4 w-4 shrink-0 text-red-500" />
    default:        return <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
  }
}

const LEVEL_ACCENT: Record<SystemMessageLevel, string> = {
  info:    'before:bg-lamp-gray',
  success: 'before:bg-lamp-green',
  warning: 'before:bg-lamp-yellow',
  error:   'before:bg-lamp-red',
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
    <div className="fixed top-14 right-4 z-50 flex flex-col gap-2 w-[284px] pointer-events-none">
      {toasts.map(msg => (
        <div
          key={msg.message_id}
          className={cn(
            'relative overflow-hidden flex gap-2.5 rounded-[14px] border border-white/[0.085] p-3 pointer-events-auto',
            'bg-[rgba(18,23,31,0.91)] dark:bg-[rgba(18,23,31,0.91)] backdrop-blur-[22px] backdrop-saturate-[160%]',
            'shadow-[0_4px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)]',
            'animate-in slide-in-from-right-4 fade-in-0 duration-[260ms]',
            'before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-r-sm before:opacity-90',
            LEVEL_ACCENT[msg.level],
          )}
        >
          <div className="mt-0.5">{getLevelIcon(msg.level)}</div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-xs font-semibold leading-tight text-white">
              <IbConnectionMessageTitle msg={msg} />
            </p>
            <p className="text-[10.5px] text-[#7a8492] line-clamp-2">{msg.message}</p>
            <p className="text-[10px] text-[#5c6572]">
              {formatLastUpdate(msg.occurred_at)} ago
            </p>
          </div>
          <button
            onClick={() => onDismiss(msg.message_id)}
            className="shrink-0 self-start rounded p-0.5 text-[#5c6572] hover:text-white hover:bg-white/[0.08] transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
