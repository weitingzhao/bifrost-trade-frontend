import { MessageCircle, Settings } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PinsTab } from '@/components/cockpit/PinsTab'
import { ContextTab } from '@/components/cockpit/ContextTab'
import { ActionsTab } from '@/components/cockpit/ActionsTab'
import { InboxTab } from '@/components/cockpit/InboxTab'
import { CopilotChatBody } from '@/components/cockpit/CopilotChatBody'
import { SettingsTab } from '@/components/cockpit/SettingsTab'
import {
  useCockpitDrawer,
  type CockpitTabId,
} from '@/hooks/useCockpitDrawer'
import { usePendingDraftCount } from '@/hooks/useResearchDrafts'
import { cn } from '@/lib/utils'

const PRIMARY_TAB =
  'h-8 gap-1.5 px-2.5 text-dense-label font-medium ' +
  'data-active:bg-primary/15 data-active:text-primary data-active:shadow-sm'
const WORKSPACE_TAB =
  'h-7 px-2 text-dense-meta text-muted-foreground ' +
  'hover:text-foreground data-active:bg-secondary data-active:text-foreground'
const UTILITY_TAB =
  'h-7 w-7 justify-center p-0 text-muted-foreground ' +
  'hover:text-foreground data-active:bg-secondary data-active:text-foreground'

/**
 * Unified Research panel tabs — hosted inside the floating Copilot bubble.
 *
 * Layout hierarchy (Wave RS-UX5):
 *   [ Copilot ●● ]  │  Inbox • Pins • Context • Actions  │ ⚙ Settings
 *   ═══ primary  ═══ ─── workspace utilities ───         ─ utility ─
 *
 * The primary Copilot tab is visually promoted (larger pill, primary tint) so
 * users understand the chat is the main surface.  Workspace tools sit in a
 * secondary group behind a subtle separator.  Settings collapses to an icon.
 */
export function CockpitTabs({ className }: { className?: string }) {
  const { tab, setTab } = useCockpitDrawer()
  const { count: pendingCount } = usePendingDraftCount()

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as CockpitTabId)}
      className={cn('flex min-h-0 flex-1 flex-col gap-2', className)}
    >
      <TabsList
        variant="default"
        className="h-auto w-full items-center gap-1 rounded-lg border border-border bg-secondary p-1"
      >
        <TabsTrigger value="copilot" className={PRIMARY_TAB} aria-label="Copilot chat">
          <MessageCircle className="size-3.5" aria-hidden />
          Copilot
        </TabsTrigger>
        <div className="mx-0.5 h-4 w-px shrink-0 bg-border/60" aria-hidden />
        <TabsTrigger value="inbox" className={WORKSPACE_TAB}>
          Inbox
          {pendingCount > 0 ? (
            <span
              className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-dense-micro font-semibold text-primary"
              aria-label={`${pendingCount} pending drafts`}
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="pins" className={WORKSPACE_TAB}>
          Pins
        </TabsTrigger>
        <TabsTrigger value="context" className={WORKSPACE_TAB}>
          Context
        </TabsTrigger>
        <TabsTrigger value="actions" className={WORKSPACE_TAB}>
          Actions
        </TabsTrigger>
        <div className="ml-auto" aria-hidden />
        <TabsTrigger value="settings" className={UTILITY_TAB} aria-label="Copilot settings">
          <Settings className="size-3.5" aria-hidden />
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="copilot"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden pr-1"
      >
        <CopilotChatBody />
      </TabsContent>
      <TabsContent value="inbox" className="mt-0 min-h-0 flex-1 overflow-y-auto pr-1">
        <InboxTab />
      </TabsContent>
      <TabsContent value="pins" className="mt-0 min-h-0 flex-1 overflow-y-auto pr-1">
        <PinsTab />
      </TabsContent>
      <TabsContent value="context" className="mt-0 min-h-0 flex-1 overflow-y-auto pr-1">
        <ContextTab />
      </TabsContent>
      <TabsContent value="actions" className="mt-0 min-h-0 flex-1 overflow-y-auto pr-1">
        <ActionsTab />
      </TabsContent>
      <TabsContent value="settings" className="mt-0 min-h-0 flex-1 overflow-y-auto pr-1">
        <SettingsTab />
      </TabsContent>
    </Tabs>
  )
}
