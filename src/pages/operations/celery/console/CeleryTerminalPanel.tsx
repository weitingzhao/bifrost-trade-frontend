import { useState } from 'react'
import { Trash2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CeleryConsoleStatus } from '@/hooks/useCeleryWorkerConsole'

export interface CeleryTerminalPanelProps {
  lines: string[]
  status: CeleryConsoleStatus
  errorDetail?: string | null
  consoleRef?: React.RefObject<HTMLPreElement>
  loadingText?: string
  errorText?: string
  emptyText?: string
  onClear?: () => void | Promise<void>
  onSelectAll?: () => void
  clearTitle?: string
  showPause?: boolean
  paused?: boolean
  onPauseToggle?: () => void
  defaultHeight?: number
  className?: string
}

function statusLabel(status: CeleryConsoleStatus): string {
  if (status === 'connecting') return 'Connecting…'
  if (status === 'connected') return '● Live'
  if (status === 'error') return '● Disconnected'
  return 'Idle'
}

export function CeleryTerminalPanel({
  lines,
  status,
  errorDetail,
  consoleRef,
  loadingText = 'Connecting…',
  errorText = 'Unable to load stream.',
  emptyText = 'No log lines yet.',
  onClear,
  onSelectAll,
  clearTitle = 'Clear console',
  showPause = false,
  paused = false,
  onPauseToggle,
  defaultHeight = 280,
  className,
}: CeleryTerminalPanelProps) {
  const [height, setHeight] = useState(defaultHeight)

  const body =
    status === 'connecting' && lines.length === 0
      ? loadingText
      : status === 'error' && lines.length === 0
        ? `${errorText}${errorDetail ? `\n\n${errorDetail}` : ''}`
        : lines.length === 0
          ? emptyText
          : lines.join('\n')

  return (
    <div className={cn('rounded-lg border bg-card overflow-hidden', className)}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-muted/20 text-xs">
        <span
          className={cn(
            'font-semibold',
            status === 'connected' ? 'text-success' : 'text-muted-foreground',
          )}
        >
          {statusLabel(status)}
        </span>
        <span className="text-muted-foreground">{lines.length} lines</span>
        {showPause && onPauseToggle && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onPauseToggle}>
            {paused ? 'Resume' : 'Pause'}
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1">
          {onSelectAll && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onSelectAll} title="Select all">
              <Copy className="h-3 w-3" />
              Select all
            </Button>
          )}
          {onClear && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => void onClear()}
              title={clearTitle}
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div style={{ height }} className="overflow-y-auto bg-zinc-950 text-zinc-100 p-3">
        <pre
          ref={consoleRef}
          className="text-dense-meta font-mono whitespace-pre-wrap break-all leading-relaxed m-0"
        >
          {body}
          {status === 'error' && lines.length > 0 && errorDetail && (
            <>
              {'\n\n'}
              <span className="text-red-400">{errorText} {errorDetail}</span>
            </>
          )}
        </pre>
      </div>

      <div
        role="separator"
        aria-label="Resize console height"
        className="h-2 cursor-row-resize bg-muted/40 hover:bg-muted/60 border-t"
        onMouseDown={e => {
          e.preventDefault()
          const startY = e.clientY
          const startH = height
          function onMove(ev: MouseEvent) {
            setHeight(Math.max(120, Math.min(600, startH + (ev.clientY - startY))))
          }
          function onUp() {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
          }
          window.addEventListener('mousemove', onMove)
          window.addEventListener('mouseup', onUp)
        }}
      />
    </div>
  )
}
