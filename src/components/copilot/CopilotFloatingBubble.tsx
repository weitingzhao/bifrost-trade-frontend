import { useEffect, useRef, useState } from 'react'
import {
  History,
  Maximize2,
  MessageCircle,
  Minimize2,
  MoveDiagonal2,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CockpitTabs } from '@/components/cockpit/CockpitTabs'
import { CockpitSaveHypothesisHost } from '@/components/cockpit/CockpitSaveHypothesisHost'
import { SessionListSidebar } from '@/components/cockpit/SessionListSidebar'
import {
  copilotBubbleStore,
  useCopilotBubble,
  type CopilotBubblePosition,
} from '@/hooks/useCopilotBubble'
import { useCopilotSession } from '@/hooks/useCopilotSession'
import { cn } from '@/lib/utils'

const COMPACT_W = 440
const COMPACT_H = 640
const EXPANDED_W = 720
const EXPANDED_H_MAX = 800
const DEFAULT_MARGIN = 24
const SESSIONS_RAIL_W = 220

function clampPosition(pos: CopilotBubblePosition, size: { w: number; h: number }): CopilotBubblePosition {
  if (pos === null) return null
  const maxX = Math.max(0, window.innerWidth - size.w - 8)
  const maxY = Math.max(0, window.innerHeight - size.h - 8)
  return {
    x: Math.min(Math.max(0, pos.x), maxX),
    y: Math.min(Math.max(0, pos.y), maxY),
  }
}

/**
 * Research Copilot Panel — single unified floating surface (Wave RS-UX2 → RS-UX3).
 *
 * FAB (closed):  right-bottom brand-color circle button (customer-support style)
 * Panel (open):  draggable card with header grip; sessions history rail on the left
 *                (ChatGPT/Claude style) toggle-able via header button.
 *                Panel + rail state persist to localStorage.
 *
 * Non-modal, no backdrop → underlying page remains fully clickable.
 * Mobile (< md) falls back to a bottom sheet spanning the viewport and drag is disabled.
 */
export function CopilotFloatingBubble() {
  const {
    open,
    size,
    position,
    sessionsOpen,
    close,
    toggle,
    toggleSize,
    setPosition,
    resetPosition,
    toggleSessions,
  } = useCopilotBubble()
  const { streaming, capBreached } = useCopilotSession()

  const [dragging, setDragging] = useState(false)
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const panelWidth = size === 'expanded' ? EXPANDED_W : COMPACT_W
  const panelHeight = size === 'expanded' ? Math.min(EXPANDED_H_MAX, window.innerHeight * 0.88) : COMPACT_H

  useEffect(() => {
    if (!open) return
    function onResize() {
      const clamped = clampPosition(copilotBubbleStore.getState().position, {
        w: panelWidth,
        h: panelHeight,
      })
      if (clamped && (clamped.x !== position?.x || clamped.y !== position?.y)) {
        setPosition(clamped)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, panelWidth, panelHeight, position?.x, position?.y, setPosition])

  if (!open) {
    return (
      <>
        <div className="fixed bottom-6 right-6 z-[190]">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggle}
                aria-label="Open Research Copilot"
                className={cn(
                  'group relative flex h-14 w-14 items-center justify-center rounded-full',
                  'bg-primary text-primary-foreground',
                  'shadow-[0_10px_30px_-4px_rgba(0,0,0,0.35)]',
                  'transition-all duration-200',
                  'hover:scale-105 hover:shadow-[0_14px_36px_-4px_rgba(0,0,0,0.45)]',
                  'active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30',
                )}
              >
                <MessageCircle
                  className="h-6 w-6 transition-transform group-hover:scale-110"
                  strokeWidth={2.25}
                />
                {streaming ? (
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/40"
                  />
                ) : null}
                {capBreached ? (
                  <span
                    aria-hidden
                    className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card bg-destructive"
                  />
                ) : (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card',
                      streaming ? 'bg-primary' : 'bg-success',
                    )}
                  />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Ask Research Copilot (⌘J)</TooltipContent>
          </Tooltip>
        </div>
        <CockpitSaveHypothesisHost />
      </>
    )
  }

  function onHeaderPointerDown(e: React.PointerEvent<HTMLElement>) {
    if (window.innerWidth < 768) return // mobile — no drag
    if ((e.target as HTMLElement).closest('button, [role="button"], input, textarea, select, a')) {
      return
    }
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return
    dragOffsetRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onHeaderPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (!dragging || !dragOffsetRef.current) return
    const nextX = e.clientX - dragOffsetRef.current.dx
    const nextY = e.clientY - dragOffsetRef.current.dy
    const clamped = clampPosition({ x: nextX, y: nextY }, { w: panelWidth, h: panelHeight })
    setPosition(clamped)
  }

  function onHeaderPointerUp(e: React.PointerEvent<HTMLElement>) {
    if (!dragging) return
    dragOffsetRef.current = null
    setDragging(false)
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const positionStyle: React.CSSProperties = position
    ? { top: position.y, left: position.x, right: 'auto', bottom: 'auto' }
    : { bottom: DEFAULT_MARGIN, right: DEFAULT_MARGIN }

  return (
    <>
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label="Research Copilot"
        style={positionStyle}
        className={cn(
          'fixed z-[190] flex flex-col overflow-hidden rounded-xl border border-border bg-card',
          'shadow-[0_20px_50px_-8px_rgba(0,0,0,0.35)]',
          // Mobile / narrow — full-width bottom sheet (ignores position/drag)
          'inset-x-3 max-w-none md:inset-x-auto md:max-w-[92vw]',
          'h-[85vh] md:h-auto',
          // Desktop sizing
          size === 'expanded'
            ? 'md:h-[min(800px,88vh)] md:w-[720px]'
            : 'md:h-[640px] md:w-[440px]',
          dragging && 'shadow-[0_28px_60px_-8px_rgba(0,0,0,0.55)]',
        )}
      >
        <header
          onPointerDown={onHeaderPointerDown}
          onPointerMove={onHeaderPointerMove}
          onPointerUp={onHeaderPointerUp}
          onPointerCancel={onHeaderPointerUp}
          className={cn(
            'flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-card px-3 py-2 select-none',
            'md:cursor-grab',
            dragging && 'md:cursor-grabbing',
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <MoveDiagonal2
              className="hidden md:block h-3.5 w-3.5 text-muted-foreground/60"
              aria-hidden
            />
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <MessageCircle className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />
            </span>
            <span className="truncate text-dense-body font-semibold text-foreground">
              Research Copilot
            </span>
            {streaming ? (
              <span
                className="ml-1 inline-flex h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary"
                aria-label="Streaming"
              />
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleSessions}
                  aria-label={sessionsOpen ? 'Hide sessions' : 'Show sessions'}
                  aria-pressed={sessionsOpen}
                >
                  {sessionsOpen ? (
                    <PanelLeftClose className="h-3.5 w-3.5" />
                  ) : (
                    <PanelLeftOpen className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {sessionsOpen ? 'Hide sessions' : 'Sessions history'}
              </TooltipContent>
            </Tooltip>
            {position ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={resetPosition}
                    aria-label="Reset position"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Reset to bottom-right</TooltipContent>
              </Tooltip>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleSize}
                  aria-label={size === 'compact' ? 'Expand panel' : 'Collapse panel'}
                >
                  {size === 'compact' ? (
                    <Maximize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Minimize2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {size === 'compact' ? 'Expand' : 'Collapse'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={close}
                  aria-label="Close Research Copilot"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close (⌘J)</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {sessionsOpen ? (
            <div
              className="hidden shrink-0 border-r border-border/60 bg-background/60 md:block"
              style={{ width: SESSIONS_RAIL_W }}
            >
              <div className="flex items-center gap-1 border-b border-border/40 px-2 py-1.5">
                <History className="h-3 w-3 text-muted-foreground" />
                <span className="text-dense-caption font-medium uppercase tracking-wide text-muted-foreground">
                  Sessions
                </span>
              </div>
              <div className="h-[calc(100%-2rem)] overflow-y-auto px-1.5 py-1.5">
                <SessionListSidebar onLoaded={() => undefined} />
              </div>
            </div>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col p-3">
            <CockpitTabs />
          </div>
        </div>
      </aside>
      <CockpitSaveHypothesisHost />
    </>
  )
}
