import { useEffect, useRef, useState } from 'react'
import {
  Expand,
  History,
  Maximize2,
  MessageCircle,
  Minimize2,
  MoveDiagonal2,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Shrink,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ResearchUserSwitcher } from '@/components/auth/ResearchUserSwitcher'
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
const EXPANDED_W = 900
const EXPANDED_H_MAX = 860
const DEFAULT_MARGIN = 24
const SESSIONS_RAIL_W = 240
const SESSIONS_RAIL_W_FS = 280

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
    toggleFullscreen,
    setPosition,
    resetPosition,
    toggleSessions,
  } = useCopilotBubble()
  const { streaming, capBreached } = useCopilotSession()

  const [dragging, setDragging] = useState(false)
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const isFullscreen = size === 'fullscreen'
  const panelWidth =
    size === 'fullscreen'
      ? window.innerWidth - 32
      : size === 'expanded'
        ? EXPANDED_W
        : COMPACT_W
  const panelHeight =
    size === 'fullscreen'
      ? window.innerHeight - 32
      : size === 'expanded'
        ? Math.min(EXPANDED_H_MAX, window.innerHeight * 0.9)
        : COMPACT_H

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
    if (isFullscreen) return // fullscreen — dragging disabled, panel anchored
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

  const positionStyle: React.CSSProperties = isFullscreen
    ? { top: 16, left: 16, right: 16, bottom: 16, width: 'auto', height: 'auto' }
    : position
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
          'fixed z-[190] flex flex-col overflow-hidden rounded-xl',
          // Copilot identity is delivered via border / ring / shadow only.  Body is
          // fully opaque so page content behind the panel does not bleed through
          // and confuse the reader — usability > cosmetic transparency.
          'border border-primary/40 ring-1 ring-primary/15',
          'bg-card',
          'shadow-[0_24px_60px_-12px_rgba(70,90,220,0.35),0_10px_20px_-6px_rgba(0,0,0,0.35)]',
          // Mobile / narrow — full-width bottom sheet (ignores position/drag)
          !isFullscreen && 'inset-x-3 max-w-none md:inset-x-auto md:max-w-[96vw]',
          !isFullscreen && 'h-[85vh] md:h-auto',
          // Desktop sizing
          !isFullscreen && size === 'expanded' && 'md:h-[min(860px,92vh)] md:w-[900px]',
          !isFullscreen && size === 'compact' && 'md:h-[640px] md:w-[440px]',
          dragging &&
            'shadow-[0_32px_70px_-10px_rgba(70,90,220,0.55),0_14px_28px_-8px_rgba(0,0,0,0.5)]',
        )}
      >
        <header
          onPointerDown={onHeaderPointerDown}
          onPointerMove={onHeaderPointerMove}
          onPointerUp={onHeaderPointerUp}
          onPointerCancel={onHeaderPointerUp}
          className={cn(
            'flex shrink-0 items-center justify-between gap-2 border-b border-primary/25 px-3 py-2 select-none',
            // Opaque header bar — Copilot brand color comes from icon + border,
            // never from a semi-transparent tint that lets page text bleed through.
            'bg-secondary',
            !isFullscreen && 'md:cursor-grab',
            !isFullscreen && dragging && 'md:cursor-grabbing',
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {!isFullscreen ? (
              <MoveDiagonal2
                className="hidden md:block h-3.5 w-3.5 text-muted-foreground/60"
                aria-hidden
              />
            ) : null}
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
            <ResearchUserSwitcher className="h-7 px-1.5" />
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
            {position && !isFullscreen ? (
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
            {!isFullscreen ? (
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
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  aria-pressed={isFullscreen}
                >
                  {isFullscreen ? (
                    <Shrink className="h-3.5 w-3.5" />
                  ) : (
                    <Expand className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
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
              className="hidden shrink-0 flex-col border-r border-border bg-background md:flex"
              style={{ width: isFullscreen ? SESSIONS_RAIL_W_FS : SESSIONS_RAIL_W }}
            >
              <div className="flex items-center gap-1.5 border-b border-border bg-secondary px-2.5 py-2">
                <History className="h-3.5 w-3.5 text-primary" />
                <span className="text-dense-label font-semibold text-foreground">
                  Chat history
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                <SessionListSidebar onLoaded={() => undefined} />
              </div>
            </div>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col bg-card p-3">
            <CockpitTabs />
          </div>
        </div>
      </aside>
      <CockpitSaveHypothesisHost />
    </>
  )
}
