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

const TAB_TRIGGER = 'h-7 px-2 text-dense-meta data-active:shadow-sm'

/**
 * Unified Research panel tabs — hosted inside the floating Copilot bubble.
 * Copilot chat sits alongside the workspace tabs (Inbox / Pins / Context / Actions / Settings)
 * so users get one entry point → one surface.
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
      <TabsList variant="default" className="h-auto w-full flex-wrap justify-start gap-0.5 p-1">
        <TabsTrigger value="copilot" className={TAB_TRIGGER}>
          Copilot
        </TabsTrigger>
        <TabsTrigger value="inbox" className={TAB_TRIGGER}>
          Inbox
          {pendingCount > 0 ? (
            <span className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-dense-micro font-semibold text-primary">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="pins" className={TAB_TRIGGER}>
          Pins
        </TabsTrigger>
        <TabsTrigger value="context" className={TAB_TRIGGER}>
          Context
        </TabsTrigger>
        <TabsTrigger value="actions" className={TAB_TRIGGER}>
          Actions
        </TabsTrigger>
        <TabsTrigger value="settings" className={TAB_TRIGGER}>
          Settings
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
