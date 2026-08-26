import { Maximize2, MessageCircle, Minimize2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CockpitTabs } from '@/components/cockpit/CockpitTabs'
import { CockpitSaveHypothesisHost } from '@/components/cockpit/CockpitSaveHypothesisHost'
import { useCopilotBubble } from '@/hooks/useCopilotBubble'
import { useCopilotSession } from '@/hooks/useCopilotSession'
import { cn } from '@/lib/utils'

/**
 * Research Copilot Panel — single unified floating surface (Wave RS-UX2).
 *
 * FAB (closed):  right-bottom brand-color circle button (customer-support style)
 * Panel (open):  right-bottom card with tabbed content —
 *                Copilot chat + Pins/Inbox/Context/Actions/Settings all inside.
 *
 * Non-modal, no backdrop → underlying page remains fully clickable.
 * Small screens (< md) fall back to a bottom sheet spanning the viewport.
 */
export function CopilotFloatingBubble() {
  const { open, size, close, toggle, toggleSize } = useCopilotBubble()
  const { streaming, capBreached } = useCopilotSession()

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

  return (
    <>
      <aside
        role="dialog"
        aria-modal="false"
        aria-label="Research Copilot"
        className={cn(
          'fixed bottom-6 right-6 z-[190] flex flex-col overflow-hidden rounded-xl border border-border bg-card',
          'shadow-[0_20px_50px_-8px_rgba(0,0,0,0.35)]',
          // Mobile / narrow — full-width bottom sheet
          'inset-x-3 max-w-none md:inset-x-auto md:max-w-[92vw]',
          'h-[85vh] md:h-auto',
          // Desktop sizing
          size === 'expanded'
            ? 'md:h-[min(800px,88vh)] md:w-[720px]'
            : 'md:h-[640px] md:w-[440px]',
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-card px-3 py-2">
          <div className="flex min-w-0 items-center gap-1.5">
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

        <div className="flex min-h-0 flex-1 flex-col p-3">
          <CockpitTabs />
        </div>
      </aside>
      <CockpitSaveHypothesisHost />
    </>
  )
}
