import { useReducer, useEffect } from 'react'
import { X, Info, CheckCircle2, AlertTriangle, XCircle, BellOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { formatLastUpdate } from '@/utils/positions'
import type { SystemMessage, SystemMessageLevel } from '@/types/messages'
import {
  IbConnectionMessageTitle,
  ibSlotDisplayLabel,
} from '@/components/MessageCenter/IbConnectionSlotBadge'

interface Props {
  open: boolean
  messages: SystemMessage[]
  dismissedIds: Set<string>
  onDismiss: (id: string) => void
  onDismissAll: () => void
  onClose: () => void
}

function getLevelIcon(level: SystemMessageLevel) {
  switch (level) {
    case 'success': return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
    case 'warning': return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
    case 'error':   return <XCircle className="h-4 w-4 shrink-0 text-red-500" />
    default:        return <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
  }
}

const LEVEL_BG: Record<SystemMessageLevel, string> = {
  info:    '',
  success: 'bg-green-500/5',
  warning: 'bg-amber-500/5',
  error:   'bg-red-500/5',
}

function fmtMeta(msg: SystemMessage): string {
  if (msg.topic === 'ib.connection' && msg.slot) {
    return [msg.service, ibSlotDisplayLabel(msg.slot), msg.account]
      .filter(Boolean)
      .join(' · ')
  }
  return [msg.service, msg.slot, msg.account]
    .filter(Boolean)
    .join(' · ')
}

function tickReducer(n: number): number { return n + 1 }

export function MessageDrawer({ open, messages, dismissedIds, onDismiss, onDismissAll, onClose }: Props) {
  // Keep relative timestamps fresh while drawer is open
  const [, tick] = useReducer(tickReducer, 0)
  useEffect(() => {
    if (!open) return
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [open])

  const active = messages.filter(m => !dismissedIds.has(m.message_id))

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-96 flex-col bg-popover border-l shadow-xl',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Messages</span>
            {active.length > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                {active.length > 99 ? '99+' : active.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {active.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onDismissAll}>
                Dismiss all
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto">
          {active.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <BellOff className="h-10 w-10 opacity-30" />
              <p className="text-sm">No messages</p>
            </div>
          ) : (
            <div className="divide-y">
              {active.map(msg => (
                <div
                  key={msg.message_id}
                  className={cn('flex gap-3 px-4 py-3', LEVEL_BG[msg.level])}
                >
                  <div className="mt-0.5">{getLevelIcon(msg.level)}</div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium leading-tight">
                      <IbConnectionMessageTitle msg={msg} />
                    </p>
                    <p className="text-xs text-muted-foreground">{msg.message}</p>
                    {msg.reason && (
                      <p className="text-xs text-muted-foreground/70 italic">{msg.reason}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground/60">
                      {fmtMeta(msg) && <span>{fmtMeta(msg)}</span>}
                      <span>{formatLastUpdate(msg.occurred_at)} ago</span>
                    </div>
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
          )}
        </div>
      </div>
    </>
  )
}
