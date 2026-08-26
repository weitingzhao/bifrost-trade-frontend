import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { CockpitTabs } from '@/components/cockpit/CockpitTabs'
import { CockpitSaveHypothesisHost } from '@/components/cockpit/CockpitSaveHypothesisHost'
import { useCockpitDrawer } from '@/hooks/useCockpitDrawer'

export function CockpitDrawer() {
  const { open, setOpen } = useCockpitDrawer()

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-3 p-4 sm:max-w-[400px]"
        >
          <SheetHeader className="pr-8 text-left">
            <SheetTitle className="text-dense-body">Research Cockpit</SheetTitle>
            <SheetDescription className="text-dense-meta">
              Pins · session context · quick actions. Press ⌘K to toggle.
            </SheetDescription>
          </SheetHeader>
          <CockpitTabs />
        </SheetContent>
      </Sheet>
      <CockpitSaveHypothesisHost />
    </>
  )
}
