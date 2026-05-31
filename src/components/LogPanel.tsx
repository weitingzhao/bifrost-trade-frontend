import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Trash2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLogPanel } from '@/hooks/useLogPanel'
import { LOG_SOURCES, LOG_SOURCE_GROUPS } from '@/api/logs'
import { useLogStream, type LogLevel, type LogEntry } from '@/hooks/useLogStream'

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_STYLE: Record<LogLevel, { badge: string; row: string }> = {
  ERROR: { badge: 'bg-red-500/15 text-red-500',                                  row: 'bg-red-500/[0.04]' },
  WARN:  { badge: 'bg-yellow-500/15 text-yellow-500 dark:text-yellow-400',        row: 'bg-yellow-500/[0.03]' },
  INFO:  { badge: 'bg-blue-500/10 text-blue-500',                                 row: '' },
  DEBUG: { badge: 'bg-zinc-500/10 text-zinc-500',                                 row: '' },
  OTHER: { badge: 'bg-zinc-500/10 text-zinc-400',                                 row: '' },
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  ERROR: 'ERR', WARN: 'WARN', INFO: 'INFO', DEBUG: 'DBG', OTHER: '···',
}

const STATUS_DOT: Record<string, string> = {
  idle:       'bg-zinc-400',
  connecting: 'bg-yellow-400 animate-pulse',
  live:       'bg-green-500',
  error:      'bg-red-500',
}

const STATUS_LABEL: Record<string, string> = {
  idle: 'Idle', connecting: 'Connecting…', live: 'Live', error: 'Disconnected',
}

type LevelFilter = LogLevel | 'ALL'

// ── Log row ───────────────────────────────────────────────────────────────────

function LogRow({ entry }: { entry: LogEntry }) {
  const s = LEVEL_STYLE[entry.level]
  return (
    <div className={cn('flex items-baseline gap-2 px-3 py-[2px] text-xs hover:bg-muted/40 min-w-0', s.row)}>
      <span className="shrink-0 font-mono text-muted-foreground/60 w-[62px]">{entry.ts}</span>
      <span className={cn('shrink-0 rounded px-1 font-mono font-semibold text-[10px] leading-4 w-[34px] text-center', s.badge)}>
        {LEVEL_LABELS[entry.level]}
      </span>
      <span className="shrink-0 w-[120px] text-muted-foreground/70 truncate">{entry.service}</span>
      <span className="font-mono text-foreground/85 break-all leading-4">{entry.message}</span>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function LogPanel() {
  const { open, toggle, reportErrorCount } = useLogPanel()

  const [height, setHeight] = useState(240)
  const [enabledSources, setEnabledSources] = useState<Record<string, boolean>>(
    () => Object.fromEntries(LOG_SOURCES.map(s => [s.key, true])),
  )
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL')
  const [search, setSearch] = useState('')

  const activeSources = useMemo(
    () => LOG_SOURCES.filter(s => enabledSources[s.key]),
    [enabledSources],
  )

  const { entries, status, errorCount, clear } = useLogStream(activeSources, open)

  // Report error count up to context for the sidebar badge
  useEffect(() => {
    reportErrorCount(errorCount)
  }, [errorCount, reportErrorCount])

  // Auto-scroll
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

  // Filtered view
  const filtered = useMemo(() => {
    let result = entries
    if (levelFilter !== 'ALL') result = result.filter(e => e.level === levelFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(e =>
        e.message.toLowerCase().includes(q) || e.service.toLowerCase().includes(q),
      )
    }
    return result
  }, [entries, levelFilter, search])

  // Export filtered entries as LLM-friendly plain text
  const handleExport = () => {
    const now = new Date()
    const levelLabel = levelFilter === 'ALL' ? 'ALL' : LEVEL_LABELS[levelFilter as LogLevel]
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

  // Resize handle
  const onResizeStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const startY = e.clientY
    const startH = height
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(600, Math.max(120, startH + (startY - ev.clientY)))
      setHeight(next)
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

  const LEVELS: LevelFilter[] = ['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG']

  return (
    <div
      className="shrink-0 border-t border-border bg-background flex flex-col overflow-hidden"
      style={{ height }}
    >
      {/* Resize handle */}
      <div
        className="h-1 cursor-ns-resize bg-transparent hover:bg-primary/20 transition-colors shrink-0"
        onMouseDown={onResizeStart}
        title="Drag to resize"
      />

      {/* Header — Row 1: toolbar */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-border/50 shrink-0">
        {/* Level filter */}
        <div className="flex items-center gap-0.5">
          {LEVELS.map(lv => (
            <button
              key={lv}
              onClick={() => setLevelFilter(lv)}
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors',
                levelFilter === lv
                  ? lv === 'ALL'
                    ? 'bg-foreground/10 text-foreground'
                    : LEVEL_STYLE[lv as LogLevel].badge
                  : 'text-muted-foreground/50 hover:text-muted-foreground',
              )}
            >
              {lv === 'ALL' ? 'All' : LEVEL_LABELS[lv as LogLevel]}
            </button>
          ))}
        </div>

        <div className="w-px h-3 bg-border shrink-0" />

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter…"
          className="h-5 rounded border border-border bg-muted/30 px-2 text-[11px] outline-none focus:ring-1 focus:ring-ring w-32 placeholder:text-muted-foreground/40"
        />

        <div className="flex-1" />

        {/* Entry count */}
        <span className="text-[10px] text-muted-foreground/50 shrink-0">
          {filtered.length} / {entries.length}
        </span>

        <div className="w-px h-3 bg-border shrink-0" />

        {/* Status — right side */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[status])} />
          <span className="text-[11px] text-muted-foreground font-medium">{STATUS_LABEL[status]}</span>
        </div>

        <div className="w-px h-3 bg-border shrink-0" />

        {/* Export */}
        <button
          onClick={handleExport}
          title="Export filtered logs as .txt"
          disabled={filtered.length === 0}
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Download className="h-3 w-3" />
        </button>

        {/* Clear */}
        <button
          onClick={clear}
          title="Clear log buffer"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>

        {/* Close */}
        <button
          onClick={toggle}
          title="Close log panel"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Header — Row 2: source chips (full width, wraps freely) */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-border shrink-0 flex-wrap">
        {LOG_SOURCE_GROUPS.map((group, gi) => {
          const groupSources = LOG_SOURCES.filter(s => s.group === group.key)
          const allEnabled = groupSources.every(s => enabledSources[s.key])
          const someEnabled = groupSources.some(s => enabledSources[s.key])
          return (
            <div key={group.key} className="flex items-center gap-1 flex-wrap">
              {gi > 0 && <div className="w-px h-3 bg-border shrink-0" />}
              {/* Group label — click to toggle all in group */}
              <button
                onClick={() => {
                  const enable = !allEnabled
                  setEnabledSources(prev => {
                    const u = { ...prev }
                    groupSources.forEach(s => { u[s.key] = enable })
                    return u
                  })
                }}
                title={allEnabled ? `Disable all ${group.label}` : `Enable all ${group.label}`}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors select-none',
                  someEnabled
                    ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    : 'text-muted-foreground/35 hover:text-muted-foreground hover:bg-muted',
                )}
              >
                {group.label}
              </button>
              {/* Individual source chips */}
              {groupSources.map(src => (
                <button
                  key={src.key}
                  onClick={() => setEnabledSources(prev => ({ ...prev, [src.key]: !prev[src.key] }))}
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors',
                    enabledSources[src.key]
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-muted text-muted-foreground/50 border border-transparent',
                  )}
                >
                  {src.label}
                </button>
              ))}
            </div>
          )
        })}
      </div>

      {/* Log body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto font-mono"
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground/40">
            {status === 'connecting' ? 'Connecting to log streams…' : 'No entries'}
          </div>
        ) : (
          filtered.map((entry: LogEntry) => <LogRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  )
}
