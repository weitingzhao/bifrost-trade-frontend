import { useEffect, useMemo, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LogSourceDef } from '@/api/logs'
import { useLogStream, type LogEntry } from '@/hooks/useLogStream'
import {
  DEFAULT_LEVEL_FILTER,
  filterLogEntries,
  LEVEL_FILTER_OPTIONS,
  LEVEL_LABELS,
  LEVEL_STYLE,
  levelFilterLabel,
  STREAM_STATUS_LABEL,
  type LevelFilterPreset,
} from './logConsoleShared'

function LogRow({
  entry,
  sourceTags,
  serviceWidth = 'w-[100px]',
}: {
  entry: LogEntry
  sourceTags?: Record<string, string>
  serviceWidth?: string
}) {
  const s = LEVEL_STYLE[entry.level]
  const tagCls = sourceTags?.[entry.service] ?? 'bg-muted text-muted-foreground'
  return (
    <div className={cn('flex items-baseline gap-2 px-3 py-[2px] text-xs hover:bg-muted/40 min-w-0 font-mono', s.row)}>
      <span className="shrink-0 text-muted-foreground/60 w-[62px]">{entry.ts}</span>
      <span className={cn('shrink-0 rounded px-1 font-semibold text-[10px] leading-4 w-[34px] text-center', s.badge)}>
        {LEVEL_LABELS[entry.level]}
      </span>
      <span className={cn('shrink-0 rounded px-1 text-[10px] truncate', serviceWidth, tagCls)}>
        {entry.service}
      </span>
      <span className="text-foreground/85 break-all leading-4">{entry.message}</span>
    </div>
  )
}

export interface LogConsoleProps {
  sources: LogSourceDef[]
  enabled?: boolean
  defaultHeight?: number
  sourceTags?: Record<string, string>
  emptyMessage?: string
  clearTitle?: string
  onClearServer?: () => Promise<{ ok: boolean; errors?: string[] }>
  className?: string
  /** Show level filter + search toolbar (dock-style). */
  showAdvancedFilters?: boolean
}

export function LogConsole({
  sources,
  enabled = true,
  defaultHeight = 280,
  sourceTags,
  emptyMessage = 'No log lines yet.',
  clearTitle = 'Clear log buffer',
  onClearServer,
  className,
  showAdvancedFilters = false,
}: LogConsoleProps) {
  const [height, setHeight] = useState(defaultHeight)
  const [enabledSources, setEnabledSources] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sources.map(s => [s.key, true])),
  )
  const [clearing, setClearing] = useState(false)
  const [levelFilter, setLevelFilter] = useState<LevelFilterPreset>(DEFAULT_LEVEL_FILTER)
  const [search, setSearch] = useState('')

  const activeSources = useMemo(
    () => sources.filter(s => enabledSources[s.key] !== false),
    [sources, enabledSources],
  )

  const { entries, status, clear } = useLogStream(activeSources, enabled)

  const scrollRef = useRef<HTMLDivElement>(null)
  const isAtBottom = useRef(true)

  useEffect(() => {
    if (isAtBottom.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries.length])

  const filtered = useMemo(() => {
    let result = filterLogEntries(entries, levelFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(e =>
        e.message.toLowerCase().includes(q) || e.service.toLowerCase().includes(q),
      )
    }
    return result
  }, [entries, levelFilter, search])

  async function handleClear() {
    setClearing(true)
    try {
      if (onClearServer) await onClearServer()
      clear()
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className={cn('rounded-lg border bg-card overflow-hidden', className)}>
      <div className="flex flex-col gap-0 border-b bg-muted/20">
        {showAdvancedFilters && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 border-b border-border/50">
            <div className="flex items-center gap-0.5">
              {LEVEL_FILTER_OPTIONS.map(lv => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setLevelFilter(lv)}
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors',
                    levelFilter === lv
                      ? lv === 'ALL'
                        ? 'bg-foreground/10 text-foreground'
                        : lv === 'ALERTS'
                          ? 'bg-warning-soft text-warning'
                          : LEVEL_STYLE[lv].badge
                      : 'text-muted-foreground/50 hover:text-muted-foreground',
                  )}
                >
                  {levelFilterLabel(lv)}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter…"
              className="h-5 rounded border border-border bg-muted/30 px-2 text-[11px] outline-none focus:ring-1 focus:ring-ring w-32 placeholder:text-muted-foreground/40"
            />
            <span className="text-[10px] text-muted-foreground/50 ml-auto">
              {filtered.length} / {entries.length}
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          {sources.map(src => (
            <button
              key={src.key}
              type="button"
              onClick={() => setEnabledSources(prev => ({ ...prev, [src.key]: !prev[src.key] }))}
              className={cn(
                'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border transition-colors',
                enabledSources[src.key]
                  ? (sourceTags?.[src.key] ?? 'bg-primary/10 text-primary border-primary/30')
                  : 'bg-muted/30 text-muted-foreground/50 border-transparent line-through',
              )}
            >
              {src.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase">
              {STREAM_STATUS_LABEL[status] ?? status}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={clearing}
              onClick={() => void handleClear()}
              title={clearTitle}
            >
              <Trash2 className="h-3 w-3" />
              {clearing ? 'Clearing…' : 'Clear'}
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={() => {
          const el = scrollRef.current
          if (!el) return
          isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
        }}
        style={{ height }}
        className="overflow-y-auto bg-background/50"
      >
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground p-4 text-center">
            {status === 'connecting' ? 'Connecting…' : emptyMessage}
          </p>
        ) : (
          filtered.map(e => (
            <LogRow
              key={e.id}
              entry={e}
              sourceTags={sourceTags}
              serviceWidth={showAdvancedFilters ? 'w-[120px]' : 'w-[100px]'}
            />
          ))
        )}
      </div>

      <div
        role="separator"
        aria-label="Resize log console height"
        className="h-2 cursor-row-resize bg-muted/40 hover:bg-muted/60 border-t"
        onMouseDown={(e) => {
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
