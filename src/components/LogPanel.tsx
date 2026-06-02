import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Trash2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dangerIconBtnClass } from '@/lib/uiClasses'
import { useLogPanel } from '@/hooks/useLogPanel'
import { LOG_SOURCES, LOG_SOURCE_GROUPS, LOG_SOURCE_TAGS } from '@/api/logs'
import { useLogStream, type LogEntry } from '@/hooks/useLogStream'
import {
  DEFAULT_LEVEL_FILTER,
  filterLogEntries,
  LEVEL_FILTER_OPTIONS,
  LEVEL_LABELS,
  LEVEL_STYLE,
  levelFilterExportLabel,
  levelFilterLabel,
  STREAM_STATUS_LABEL,
  type LevelFilterPreset,
} from '@/components/log/logConsoleShared'

const STATUS_DOT: Record<string, string> = {
  idle: 'bg-zinc-400',
  connecting: 'bg-yellow-400 animate-pulse',
  live: 'bg-green-500',
  error: 'bg-red-500',
}

type LevelFilter = LevelFilterPreset

function LogRow({ entry }: { entry: LogEntry }) {
  const s = LEVEL_STYLE[entry.level]
  const tagCls = LOG_SOURCE_TAGS[entry.service] ?? 'bg-muted text-muted-foreground'
  return (
    <div className={cn('flex items-baseline gap-2 px-3 py-[2px] text-xs hover:bg-muted/40 min-w-0 font-mono', s.row)}>
      <span className="shrink-0 text-muted-foreground/60 w-[62px]">{entry.ts}</span>
      <span className={cn('shrink-0 rounded px-1 font-semibold text-[10px] leading-4 w-[34px] text-center', s.badge)}>
        {LEVEL_LABELS[entry.level]}
      </span>
      <span className={cn('shrink-0 rounded px-1 text-[10px] truncate w-[100px]', tagCls)}>
        {entry.service}
      </span>
      <span className="text-foreground/85 break-all leading-4">{entry.message}</span>
    </div>
  )
}

/** Docked global log panel (sidebar toggle). Uses LogConsole shared styles; single SSE subscription. */
export function LogPanel() {
  const { open, toggle, reportErrorCount } = useLogPanel()

  const [height, setHeight] = useState(240)
  const [enabledSources, setEnabledSources] = useState<Record<string, boolean>>(
    () => Object.fromEntries(LOG_SOURCES.map(s => [s.key, true])),
  )
  const [levelFilter, setLevelFilter] = useState<LevelFilter>(DEFAULT_LEVEL_FILTER)
  const [search, setSearch] = useState('')

  const activeSources = useMemo(
    () => LOG_SOURCES.filter(s => enabledSources[s.key]),
    [enabledSources],
  )

  const { entries, status, errorCount, clear } = useLogStream(activeSources, open)

  useEffect(() => {
    reportErrorCount(errorCount)
  }, [errorCount, reportErrorCount])

  const scrollRef = useRef<HTMLDivElement>(null)
  const isAtBottom = useRef(true)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }

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

  function handleExport() {
    const now = new Date()
    const levelLabel = levelFilterExportLabel(levelFilter)
    const header = [
      '# Bifrost Trade — Log Export',
      `# Exported:      ${now.toISOString()}`,
      `# Level filter:  ${levelLabel}`,
      `# Search filter: ${search || '(none)'}`,
      `# Sources:       ${activeSources.map(s => s.label).join(', ')}`,
      `# Entries:       ${filtered.length}`,
      '',
    ].join('\n')
    const body = filtered
      .map(e => `${e.ts} [${e.level.padEnd(5)}] [${e.service.padEnd(16)}] ${e.message}`)
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bifrost-logs-${now.toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const onResizeStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const startY = e.clientY
    const startH = height
    const onMove = (ev: MouseEvent) => {
      setHeight(Math.min(600, Math.max(120, startH + (startY - ev.clientY))))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }

  if (!open) return null

  return (
    <div
      className="shrink-0 border-t border-border bg-background flex flex-col overflow-hidden"
      style={{ height }}
    >
      <div
        className="h-1 cursor-ns-resize bg-transparent hover:bg-primary/20 transition-colors shrink-0"
        onMouseDown={onResizeStart}
        title="Drag to resize"
      />
      <div className="flex items-center gap-2 px-3 py-1 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-0.5">
          {LEVEL_FILTER_OPTIONS.map(lv => (
            <button
              key={lv}
              onClick={() => setLevelFilter(lv)}
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors',
                levelFilter === lv
                  ? lv === 'ALL'
                    ? 'bg-foreground/10 text-foreground'
                    : lv === 'ALERTS'
                      ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                      : LEVEL_STYLE[lv].badge
                  : 'text-muted-foreground/50 hover:text-muted-foreground',
              )}
            >
              {levelFilterLabel(lv)}
            </button>
          ))}
        </div>
        <div className="w-px h-3 bg-border shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter…"
          className="h-5 rounded border border-border bg-muted/30 px-2 text-[11px] outline-none focus:ring-1 focus:ring-ring w-32 placeholder:text-muted-foreground/40"
        />
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground/50 shrink-0">
          {filtered.length} / {entries.length}
        </span>
        <div className="w-px h-3 bg-border shrink-0" />
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[status])} />
          <span className="text-[11px] text-muted-foreground font-medium">{STREAM_STATUS_LABEL[status]}</span>
        </div>
        <div className="w-px h-3 bg-border shrink-0" />
        <button
          onClick={handleExport}
          title="Export filtered logs as .txt"
          disabled={filtered.length === 0}
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Download className="h-3 w-3" />
        </button>
        <button
          onClick={clear}
          title="Clear log buffer"
          className={cn('flex h-5 w-5 items-center justify-center rounded transition-colors', dangerIconBtnClass)}
        >
          <Trash2 className="h-3 w-3" />
        </button>
        <button
          onClick={toggle}
          title="Close log panel"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="flex items-center gap-2 px-3 py-1 border-b border-border shrink-0 flex-wrap">
        {LOG_SOURCE_GROUPS.map((group, gi) => {
          const groupSources = LOG_SOURCES.filter(s => s.group === group.key)
          const allEnabled = groupSources.every(s => enabledSources[s.key])
          const someEnabled = groupSources.some(s => enabledSources[s.key])
          return (
            <div key={group.key} className="flex items-center gap-1 flex-wrap">
              {gi > 0 && <div className="w-px h-3 bg-border shrink-0" />}
              <button
                onClick={() => {
                  const enable = !allEnabled
                  setEnabledSources(prev => {
                    const u = { ...prev }
                    groupSources.forEach(s => { u[s.key] = enable })
                    return u
                  })
                }}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors select-none',
                  someEnabled
                    ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    : 'text-muted-foreground/35 hover:text-muted-foreground hover:bg-muted',
                )}
              >
                {group.label}
              </button>
              {groupSources.map(src => {
                const tagCls = LOG_SOURCE_TAGS[src.key]
                const on = enabledSources[src.key]
                return (
                  <button
                    key={src.key}
                    type="button"
                    onClick={() => setEnabledSources(prev => ({ ...prev, [src.key]: !prev[src.key] }))}
                    className={cn(
                      'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border transition-colors',
                      on
                        ? (tagCls ?? 'bg-primary/10 text-primary border-primary/20')
                        : 'bg-muted/30 text-muted-foreground/50 border-transparent line-through',
                    )}
                  >
                    {src.label}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto font-mono">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground/40">
            {status === 'connecting' ? 'Connecting to log streams…' : 'No entries'}
          </div>
        ) : (
          filtered.map(entry => <LogRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  )
}
