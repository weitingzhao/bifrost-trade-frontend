import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ReactNode } from 'react'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  confirming?: boolean
  bodyExtra?: ReactNode
  /**
   * Default elevated — above RightInspector (z-200) and Copilot (z-190).
   * Without this, confirms opened while a drawer is open sit under it and look
   * like the destructive action "did nothing".
   */
  stackLayer?: 'default' | 'elevated'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  confirming = false,
  bodyExtra,
  stackLayer = 'elevated',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      <DialogContent showCloseButton={false} stackLayer={stackLayer}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        {bodyExtra ? <div className="py-1">{bodyExtra}</div> : null}
        <DialogFooter>
          <Button variant="outline" disabled={confirming} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={confirming} onClick={onConfirm}>
            {confirming ? '…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
