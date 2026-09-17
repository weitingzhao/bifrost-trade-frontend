import { useRef, useState } from 'react'
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
  const [writing, setWriting] = useState(false)
  // A ref, not only state: two clicks in one tick both read `writing` as false,
  // and each would send its own POST — a duplicate journal row or stock link.
  const inFlight = useRef(false)
  const locked = Boolean(busy) || writing

  async function confirm() {
    if (inFlight.current) return
    inFlight.current = true
    setWriting(true)
    setError(null)
    try {
      await onCommit()
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Write failed')
      setStep('confirm')
    } finally {
      inFlight.current = false
      setWriting(false)
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
            disabled={locked}
            onClick={() => void confirm()}
          >
            {locked ? 'Writing…' : 'Confirm'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={locked}
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
      disabled={disabled || locked}
      onClick={() => setStep('confirm')}
    >
      {idleLabel}
    </Button>
  )
}
