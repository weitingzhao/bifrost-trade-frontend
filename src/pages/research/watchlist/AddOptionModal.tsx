import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SegmentControl } from '@/components/data-display'
import { normalizeExpiryInput } from '@/utils/watchlistHelpers'
import {
  addOptionDialogFooterClass,
  addOptionFieldLabelClass,
  addOptionFormPanelClass,
  addOptionHintClass,
  addOptionPreviewClass,
  addOptionSymbolBadgeClass,
} from './addOptionModalUi'

const RIGHT_OPTIONS = [
  { value: 'CALL', label: 'Call' },
  { value: 'PUT', label: 'Put' },
] as const

export interface AddOptionFields {
  expiry: string
  strike: number
  right: 'CALL' | 'PUT'
}

interface Props {
  symbol: string | null
  pending?: boolean
  onClose: () => void
  onSubmit: (fields: AddOptionFields) => Promise<void>
}

function AddOptionModalBody({
  symbol,
  pending = false,
  onClose,
  onSubmit,
}: Omit<Props, 'symbol'> & { symbol: string }) {
  const [expiry, setExpiry] = useState('')
  const [right, setRight] = useState<'CALL' | 'PUT'>('CALL')
  const [strike, setStrike] = useState('')
  const [error, setError] = useState<string | null>(null)

  const normalizedExpiry = useMemo(() => normalizeExpiryInput(expiry), [expiry])
  const strikeNum = useMemo(() => parseFloat(strike.trim()), [strike])
  const strikeValid = strike.trim() !== '' && Number.isFinite(strikeNum) && strikeNum >= 0
  const expiryValid = /^\d{6,8}$/.test(normalizedExpiry)
  const canSubmit = expiryValid && strikeValid && !pending

  const preview = useMemo(() => {
    if (!expiryValid || !strikeValid) return null
    const rightLabel = right === 'CALL' ? 'Call' : 'Put'
    const rightLetter = right === 'CALL' ? 'C' : 'P'
    const contractKey = `${symbol}|OPT|${normalizedExpiry}|${strikeNum}|${rightLetter}`
    return {
      label: `${symbol} · ${normalizedExpiry} · ${rightLabel} · ${strikeNum}`,
      contractKey,
    }
  }, [symbol, normalizedExpiry, strikeNum, right, expiryValid, strikeValid])

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!canSubmit) {
      setError('Enter a valid expiry (YYYYMMDD) and strike.')
      return
    }
    setError(null)
    try {
      await onSubmit({ expiry: normalizedExpiry, strike: strikeNum, right })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add option')
    }
  }

  return (
    <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
      <DialogHeader className="space-y-1.5 border-b border-border bg-secondary/40 px-5 py-4">
        <DialogTitle className="flex flex-wrap items-center gap-2">
          <span>Add option contract</span>
          <span className={addOptionSymbolBadgeClass}>{symbol}</span>
        </DialogTitle>
        <p className={addOptionHintClass}>
          Adds an option leg to the watchlist for quote streaming and discovery workflows.
        </p>
      </DialogHeader>

      <form id="watchlist-add-option-form" onSubmit={ev => void handleSubmit(ev)} className="px-5 py-4">
        <div className={addOptionFormPanelClass}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
            <div className="space-y-1.5">
              <Label htmlFor="watchlist-opt-expiry" className={addOptionFieldLabelClass}>
                Expiry
              </Label>
              <Input
                id="watchlist-opt-expiry"
                value={expiry}
                onChange={e => {
                  setExpiry(e.target.value)
                  setError(null)
                }}
                placeholder="yyyy-mm-dd"
                inputMode="numeric"
                autoComplete="off"
                className="h-9 font-mono text-sm tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <span className={addOptionFieldLabelClass}>Right</span>
              <SegmentControl
                size="sm"
                ariaLabel="Option right"
                value={right}
                onChange={v => setRight(v as 'CALL' | 'PUT')}
                options={RIGHT_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="watchlist-opt-strike" className={addOptionFieldLabelClass}>
                Strike
              </Label>
              <Input
                id="watchlist-opt-strike"
                type="number"
                step="0.01"
                min="0"
                value={strike}
                onChange={e => {
                  setStrike(e.target.value)
                  setError(null)
                }}
                placeholder="e.g. 250"
                className="h-9 font-mono text-sm tabular-nums"
              />
            </div>
          </div>

          {preview ? (
            <div className={addOptionPreviewClass} aria-live="polite">
              <span className="text-foreground">{preview.label}</span>
              <span className="mt-1 block truncate text-[10px] opacity-80">{preview.contractKey}</span>
            </div>
          ) : (
            <p className={addOptionHintClass}>Expiry accepts YYYYMMDD or yyyy-mm-dd.</p>
          )}
        </div>

        {error ? (
          <p className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </form>

      <DialogFooter className={addOptionDialogFooterClass}>
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          form="watchlist-add-option-form"
          disabled={!canSubmit}
        >
          {pending ? 'Adding…' : 'Add to watchlist'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

export function AddOptionModal({ symbol, pending, onClose, onSubmit }: Props) {
  const open = symbol != null
  const sym = symbol?.trim().toUpperCase() ?? ''

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      {open && sym ? (
        <AddOptionModalBody
          key={sym}
          symbol={sym}
          pending={pending}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      ) : null}
    </Dialog>
  )
}
