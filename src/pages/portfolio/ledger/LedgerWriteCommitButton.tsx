import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LEDGER_WRITE_DONE } from './ledgerWriteConfirm'

export function LedgerWriteCommitButton({
  idleLabel,
  confirmTitle,
  confirmBody,
  disabled,
  busy,
  onCommit,
}: {
  idleLabel: string
  confirmTitle: string
  confirmBody: string
  disabled?: boolean
  busy?: boolean
  onCommit: () => Promise<void>
}) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setError(null)
    try {
      await onCommit()
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Write failed')
      setStep('confirm')
    }
  }

  if (step === 'done') {
    return (
      <p className="text-dense-meta text-[var(--color-success)] leading-relaxed" role="status">
        {LEDGER_WRITE_DONE}
      </p>
    )
  }

  if (step === 'confirm') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-dense-body font-semibold text-foreground">{confirmTitle}</p>
        <p className="text-dense-meta text-muted-foreground leading-relaxed">{confirmBody}</p>
        {error ? (
          <p className="text-dense-meta text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy ? 'Writing…' : 'Confirm'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={busy}
            onClick={() => setStep('idle')}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button
      type="button"
      size="sm"
      className="h-7 text-xs"
      disabled={disabled || busy}
      onClick={() => setStep('confirm')}
    >
      {idleLabel}
    </Button>
  )
}
