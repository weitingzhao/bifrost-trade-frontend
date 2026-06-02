import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface OptionCategoryCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  newCode: string
  newName: string
  onNewCodeChange: (v: string) => void
  onNewNameChange: (v: string) => void
  onCreate: () => void
}

export function OptionCategoryCreateDialog({
  open,
  onOpenChange,
  newCode,
  newName,
  onNewCodeChange,
  onNewNameChange,
  onCreate,
}: OptionCategoryCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs">Template code (snake_case)</Label>
            <Input
              className="h-8 font-mono text-sm"
              value={newCode}
              onChange={(e) => onNewCodeChange(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCreate()
              }}
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Display name</Label>
            <Input
              className="h-8 text-sm"
              value={newName}
              onChange={(e) => onNewNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCreate()
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={onCreate} disabled={!newCode.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
