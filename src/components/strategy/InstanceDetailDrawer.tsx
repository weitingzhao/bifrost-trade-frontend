import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import type { StrategyInstance } from '@/types/positions'
import { InstanceDetailPanel } from './InstanceDetailPanel'

interface Props {
  instance: StrategyInstance | null
  open: boolean
  onClose: () => void
}

/** Modal drawer wrapper — content matches docked DetailSidebar via InstanceDetailPanel. */
export function InstanceDetailDrawer({ instance, open, onClose }: Props) {
  if (!instance) return null

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="w-[960px] sm:max-w-[960px] overflow-y-auto p-0" side="right">
        <SheetHeader className="px-5 pt-4 pb-3 sticky top-0 bg-background z-10 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">
              Strategy Instance · #{instance.strategy_instance_id}
            </SheetTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
        <div className="px-5 py-4">
          <InstanceDetailPanel instance={instance} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
