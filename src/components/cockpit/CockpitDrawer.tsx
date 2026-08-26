import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CockpitTabs } from '@/components/cockpit/CockpitTabs'
import { CockpitSaveHypothesisHost } from '@/components/cockpit/CockpitSaveHypothesisHost'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import { useCockpitDrawer } from '@/hooks/useCockpitDrawer'
import { cn } from '@/lib/utils'

const PANEL_W = 400

function CockpitPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2 pr-1">
        <div className="min-w-0">
          <h2 className="text-dense-body font-semibold text-foreground">Research Cockpit</h2>
          <p className="text-dense-meta text-muted-foreground">
            Pins · session context · quick actions. Press ⌘K to toggle.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={onClose}
          aria-label="Close Research Cockpit"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <CockpitTabs />
    </div>
  )
}

/** Non-modal right rail (overlay) or docked panel (D-RS-F-i). */
export function CockpitDrawer() {
  const { open, close, mode } = useCockpitDrawer()

  if (!open) return <CockpitSaveHypothesisHost />

  if (mode === 'dock') {
    return (
      <>
        <aside
          className={cn(
            'fixed inset-y-0 right-0 z-[200] flex w-[400px] max-w-[96vw] flex-col',
            'border-l border-border bg-card shadow-[-4px_0_24px_rgba(0,0,0,0.12)]',
          )}
          aria-label="Research Cockpit"
        >
          <CockpitPanel onClose={close} />
        </aside>
        <CockpitSaveHypothesisHost />
      </>
    )
  }

  return (
    <>
      <RightInspectorShell open={open} ariaLabel="Research Cockpit" panelWidthPx={PANEL_W}>
        <CockpitPanel onClose={close} />
      </RightInspectorShell>
      <CockpitSaveHypothesisHost />
    </>
  )
}

/** Apply to main content when dock mode + cockpit open. */
export function cockpitDockPaddingClass(open: boolean, mode: 'overlay' | 'dock'): string {
  if (!open || mode !== 'dock') return ''
  return 'pr-[400px] transition-[padding] duration-200'
}
