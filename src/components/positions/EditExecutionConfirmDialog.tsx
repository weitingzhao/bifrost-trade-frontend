import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export const EDIT_EXECUTION_CONFIRM_MESSAGE =
  'When Flex and TWS sync are healthy, missing or late fills usually appear automatically after the next Flex refresh. Manual edits can conflict with or duplicate those rows. Continue only if you are intentionally reconciling or correcting this line.'

interface Props {
  open: boolean
  onCancel: () => void
  onContinue: () => void
}

/** Gate before opening {@link ExecutionFormModal} for an existing fill (Positions / execution book). */
export function EditExecutionConfirmDialog({ open, onCancel, onContinue }: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      <DialogContent showCloseButton={false} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit execution?</DialogTitle>
          <DialogDescription className="text-left pt-1" role="alert">
            {EDIT_EXECUTION_CONFIRM_MESSAGE}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onContinue}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
