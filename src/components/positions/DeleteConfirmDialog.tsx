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
  // A refused delete keeps the dialog open with the server's reason.
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setConfirming(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setConfirming(false)
    }
  }

  function close() {
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !confirming) close() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{message}</p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={close} disabled={confirming}>
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
