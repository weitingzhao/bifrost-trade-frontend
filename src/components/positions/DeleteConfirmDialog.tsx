import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  title: string
  message: string
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteConfirmDialog({ open, title, message, onClose, onConfirm }: Props) {
  const [confirming, setConfirming] = useState(false)

  async function handleConfirm() {
    setConfirming(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !confirming) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={confirming}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirm} disabled={confirming}>
            {confirming ? 'Deleting…' : 'Confirm delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
