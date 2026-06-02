import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { LayoutGrid, RefreshCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReactorMap } from '@/hooks/useReactorMap'
import { useSystemTopologyHealth } from '@/hooks/useSystemTopologyHealth'
import {
  idealReactorPanelHeight,
  reactorPanelMaxHeight,
  REACTOR_PANEL_MIN_HEIGHT,
} from './reactorMapPanelLayout'
import { ServiceTopologyOverview } from './ServiceTopologyOverview'
import {
  DEFAULT_TOPOLOGY_LAYOUT_MODE,
  getTopologyLayout,
  inferTopologyLayoutMode,
  type TopologyLayoutMode,
} from './topologyLayouts'

/** Global docked Reactor Map panel (above LogPanel). */
export function ReactorMapPanel() {
  const { open, toggle, reportAlertCount } = useReactorMap()
  const panelRef = useRef<HTMLDivElement>(null)
  const canvasAreaRef = useRef<HTMLDivElement>(null)
  const userAdjustedRef = useRef(false)
  const [height, setHeight] = useState(REACTOR_PANEL_MIN_HEIGHT)
  const [layoutMode, setLayoutMode] = useState<TopologyLayoutMode>(DEFAULT_TOPOLOGY_LAYOUT_MODE)
  const layout = getTopologyLayout(layoutMode)
  const { nodes, alertCount, isLoading, refetch } = useSystemTopologyHealth(open)

  useEffect(() => {
    reportAlertCount(alertCount)
  }, [alertCount, reportAlertCount])

  const applyIdealHeight = useCallback(() => {
    if (userAdjustedRef.current || !panelRef.current) return
    const w = panelRef.current.clientWidth
    if (w > 0) {
      setHeight(
        idealReactorPanelHeight(w, window.innerHeight, layout.viewBox.width, layout.viewBox.height),
      )
    }
  }, [layout.viewBox.height, layout.viewBox.width])

  useLayoutEffect(() => {
    if (!open) {
      userAdjustedRef.current = false
      return
    }
    applyIdealHeight()
    const el = panelRef.current
    if (!el) return

    const ro = new ResizeObserver(() => applyIdealHeight())
    ro.observe(el)

    const onWindowResize = () => applyIdealHeight()
    window.addEventListener('resize', onWindowResize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onWindowResize)
    }
  }, [open, applyIdealHeight])

  const autoArrangeLayout = () => {
    const panel = panelRef.current
    const canvas = canvasAreaRef.current
    if (!panel) return
    const w = panel.clientWidth
    const toolbarH = 28
    const canvasH = Math.max(120, (canvas?.clientHeight ?? height - toolbarH - 4) || height * 0.65)
    const next = inferTopologyLayoutMode(w, canvasH)
    userAdjustedRef.current = false
    setLayoutMode(next)
    const spec = getTopologyLayout(next)
    setHeight(idealReactorPanelHeight(w, window.innerHeight, spec.viewBox.width, spec.viewBox.height))
  }

  const onResizeStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const startY = e.clientY
    const startH = height
    const onMove = (ev: MouseEvent) => {
      const maxH = reactorPanelMaxHeight()
      setHeight(Math.min(maxH, Math.max(REACTOR_PANEL_MIN_HEIGHT, startH + (startY - ev.clientY))))
    }
    const onUp = () => {
      userAdjustedRef.current = true
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
      ref={panelRef}
      className="shrink-0 border-t border-border bg-background flex flex-col overflow-hidden"
      style={{ height }}
    >
      <div
        className="h-1 cursor-ns-resize bg-transparent hover:bg-primary/20 transition-colors shrink-0"
        onMouseDown={onResizeStart}
        title="Drag to resize"
        aria-label="Resize Reactor Map height"
      />
      <div className="flex items-center gap-2 px-3 py-1 border-b border-border/50 shrink-0">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-500/80">
          System topology
        </span>
        <span className="hidden font-mono text-[9px] text-muted-foreground sm:inline">{layout.label}</span>
        <div className="flex-1" />
        {isLoading && (
          <span className="text-[10px] text-muted-foreground">Scanning…</span>
        )}
        <button
          type="button"
          onClick={autoArrangeLayout}
          title="Auto-arrange layout for current panel size (wide / balanced / stacked)"
          aria-label="Auto-arrange Reactor Map layout"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
        >
          <LayoutGrid className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => refetch()}
          title="Refresh topology probes"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={toggle}
          title="Close Reactor Map"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div ref={canvasAreaRef} className={cn('flex-1 min-h-0 overflow-hidden')}>
        <ServiceTopologyOverview nodes={nodes} embedded layout={layout} />
      </div>
    </div>
  )
}
