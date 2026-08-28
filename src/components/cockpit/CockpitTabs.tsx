import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopilotChatBody } from '@/components/cockpit/CopilotChatBody'
import { SettingsTab } from '@/components/cockpit/SettingsTab'
import { useCockpitDrawer } from '@/hooks/useCockpitDrawer'
import { cn } from '@/lib/utils'

/**
 * Research panel body (Wave RS-UX6).
 *
 * The five-tab bar is gone.  It put a workspace (chat), a queue (inbox), a
 * bookmark list (pins), an input control (context) and a launcher (actions) on
 * one flat row — a category mismatch that no amount of visual weight could fix,
 * and four of the five showed an empty state most of the day.
 *
 * Those surfaces now sit where their job is done:
 *   inbox   → `InboxBanner` above the message list
 *   context → `CopilotContextPopover` on the composer chip
 *   actions → `AgentActionsMenu` in the composer (Lab links dropped — the
 *             sidebar already routes to every one of them)
 *   pins    → `PinsSection` in the session rail
 *
 * What is left is a single work surface plus a settings view reachable from the
 * panel's More menu, so the panel reads as: rail (jump) · chat (work) ·
 * composer (context + command).
 */
export function CockpitTabs({ className }: { className?: string }) {
  const { tab, setTab } = useCockpitDrawer()

  if (tab === 'settings') {
    return (
      <div className={cn('flex min-h-0 flex-1 flex-col gap-2', className)}>
        <div className="flex items-center gap-1 border-b border-border/50 pb-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-1.5 text-dense-label"
            onClick={() => setTab('copilot')}
          >
            <ChevronLeft className="size-3.5" />
            Back to chat
          </Button>
          <span className="text-dense-label font-semibold text-foreground">
            Copilot settings
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <SettingsTab />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
      <CopilotChatBody />
    </div>
  )
}
