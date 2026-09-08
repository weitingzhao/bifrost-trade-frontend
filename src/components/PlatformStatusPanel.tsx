import { useEffect, useState } from 'react'
import { X, RefreshCw, ChevronRight, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlatformPanel } from '@/hooks/usePlatformPanel'
import { usePlatformPlugins, type PluginRow } from '@/hooks/usePlatformPlugins'
import type { PluginLamp } from '@/api/platformPlugins'
import { OPS_CONSOLE_URL } from '@/lib/opsConsole'

const LAMP: Record<PluginLamp, { dot: string; label: string }> = {
  ok: { dot: 'bg-green-500', label: 'ok' },
  degraded: { dot: 'bg-yellow-400', label: 'degraded' },
  down: { dot: 'bg-red-500', label: 'down' },
  unknown: { dot: 'bg-zinc-400', label: 'unknown' },
}

function Cell({ children, className, title }: {
  children: React.ReactNode
  className?: string
  title?: string
}) {
  return (
    <span className={cn('text-dense-caption text-muted-foreground/70', className)} title={title}>
      {children}
    </span>
  )
}

/**
 * Deployments and workers only. `slots[]` carries IB login names, which were
 * deliberately purged from this UI — accounts are identified by U-number here.
 */
function PluginDetail({ row }: { row: PluginRow }) {
  const s = row.status
  if (row.fetchError) {
    return (
      <div className="px-3 pb-2 text-dense-caption text-destructive">
        Could not reach platform-api: {row.fetchError}
      </div>
    )
  }
  if (!s) return null
  return (
    <div className="px-3 pb-2 flex flex-col gap-1.5">
      {s.error && (
        <div className="text-dense-caption text-yellow-500 dark:text-yellow-400">
          Platform probe failed: {s.error}
          {s.hint ? <span className="text-muted-foreground/60"> · {s.hint}</span> : null}
        </div>
      )}
      {!!s.deployments?.length && (
        <div className="flex flex-col gap-0.5">
          <Cell className="uppercase tracking-wide text-muted-foreground/40">Deployments</Cell>
          {s.deployments.map(d => (
            <div key={`${d.namespace}/${d.name}`} className="flex items-baseline gap-2 font-mono">
              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0 self-center',
                LAMP[(d.reachability as PluginLamp) in LAMP ? (d.reachability as PluginLamp) : 'unknown'].dot)} />
              <Cell className="w-[252px] shrink-0 truncate text-foreground/80" title={`${d.namespace}/${d.name}`}>
                {d.namespace}/{d.name}
              </Cell>
              <Cell className="w-[52px] shrink-0 tabular-nums">{d.ready}</Cell>
              <Cell className="truncate">{d.detail}</Cell>
            </div>
          ))}
        </div>
      )}
      {!!s.workers?.length && (
        <div className="flex flex-col gap-0.5">
          <Cell className="uppercase tracking-wide text-muted-foreground/40">Workers</Cell>
          {s.workers.map(w => (
            <div key={w.pool} className="flex items-baseline gap-2 font-mono">
              <Cell className="w-[252px] shrink-0 truncate text-foreground/80">{w.pool}</Cell>
              <Cell className="w-[52px] shrink-0">{w.status}</Cell>
              <Cell className="tabular-nums">
                {w.jobs_done ?? 0} done · {w.jobs_failed ?? 0} failed
                {w.last_claim_at ? ` · last claim ${w.last_claim_at.slice(5, 19).replace('T', ' ')}` : ''}
              </Cell>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PluginRowView({ row }: { row: PluginRow }) {
  const [open, setOpen] = useState(false)
  const lamp = LAMP[row.lamp]
  const summary = row.fetchError
    ? 'platform-api unreachable'
    : row.isLoading
      ? 'checking…'
      : (row.status?.summary ?? row.status?.error ?? 'no detail reported')
  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-baseline gap-2 px-3 py-1 text-xs hover:bg-muted/40 text-left"
      >
        <ChevronRight className={cn('h-3 w-3 shrink-0 self-center text-muted-foreground/40 transition-transform', open && 'rotate-90')} />
        <span className={cn('h-2 w-2 rounded-full shrink-0 self-center', lamp.dot, row.isLoading && 'animate-pulse')} />
        <span className="shrink-0 w-[104px] font-semibold text-foreground/90">{row.def.label}</span>
        <span className="shrink-0 w-[62px] text-dense-caption text-muted-foreground/60">{lamp.label}</span>
        <span className="shrink-0 w-[300px] text-dense-caption text-muted-foreground/45 truncate hidden lg:inline">
          {row.def.supports}
        </span>
        <span className="font-mono text-dense-caption text-foreground/70 truncate">{summary}</span>
      </button>
      {open && <PluginDetail row={row} />}
    </div>
  )
}

/** Docked global panel (sidebar toggle): the Ops Platform plugins Trade runs on. */
export function PlatformStatusPanel() {
  const { open, toggle, reportAttentionCount } = usePlatformPanel()
  const [height, setHeight] = useState(200)
  const { rows, attentionCount, isLoading, refetch } = usePlatformPlugins(open)

  useEffect(() => {
    reportAttentionCount(attentionCount)
  }, [attentionCount, reportAttentionCount])

  const onResizeStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const startY = e.clientY
    const startH = height
    const onMove = (ev: MouseEvent) => setHeight(Math.min(520, Math.max(96, startH + (startY - ev.clientY))))
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

  const generatedAt = rows.find(r => r.status?.generated_at)?.status?.generated_at
  return (
    <div className="shrink-0 border-t border-border bg-background flex flex-col overflow-hidden" style={{ height }}>
      <div
        className="h-1 cursor-ns-resize bg-transparent hover:bg-primary/20 transition-colors shrink-0"
        onMouseDown={onResizeStart}
        title="Drag to resize"
      />
      <div className="flex items-center gap-2 px-3 py-1 border-b border-border/50 shrink-0">
        <span className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
          Platform Plugins
        </span>
        <span className="text-dense-caption text-muted-foreground/50">
          {attentionCount === 0 ? 'all ok' : `${attentionCount} need${attentionCount > 1 ? '' : 's'} a look`}
        </span>
        <div className="flex-1" />
        {generatedAt && (
          <span className="text-dense-caption text-muted-foreground/40 tabular-nums">
            checked {generatedAt.slice(11, 19)} UTC
          </span>
        )}
        <div className="w-px h-3 bg-border shrink-0" />
        <a
          href={OPS_CONSOLE_URL}
          target="_blank"
          rel="noreferrer"
          title="Open Bifrost Ops"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
        <button
          onClick={refetch}
          title="Re-check now"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
        </button>
        <button
          onClick={toggle}
          title="Close panel"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {rows.map(row => <PluginRowView key={row.def.key} row={row} />)}
      </div>
    </div>
  )
}
