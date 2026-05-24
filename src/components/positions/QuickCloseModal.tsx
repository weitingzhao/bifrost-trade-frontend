import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createExecution } from '@/api/trading'
import { fmtUsd, fmtExpiry, rightLabel } from '@/utils/positions'
import type { Execution } from '@/types/positions'

interface Props {
  exec: Execution | null
  onClose: () => void
  onSuccess: () => void
}

export function QuickCloseModal({ exec, onClose, onSuccess }: Props) {
  const [price, setPrice] = useState('')
  const [commission, setCommission] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!exec) return null

  const closeSide = exec.side === 'Buy' ? 'SELL' : 'BUY'

  async function handleSubmit() {
    if (!exec) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await createExecution({
        account_id: exec.account_id,
        time: Math.floor(Date.now() / 1000),
        symbol: exec.symbol,
        sec_type: exec.sec_type as 'STK' | 'OPT',
        side: closeSide as 'BUY' | 'SELL',
        quantity: Math.abs(exec.qty),
        price: parseFloat(price) || 0,
        source: 'manual',
        expiry: exec.expiry,
        strike: exec.strike,
        option_right: exec.right,
        contract_key: exec.contract_key,
        commission: parseFloat(commission) || undefined,
        currency: 'USD',
      })
      if (!res.ok) throw new Error(res.error ?? 'Failed to close position')
      onSuccess()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!exec} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Trade (Close)</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Symbol:</span> <span className="font-mono font-medium">{exec.symbol}</span></div>
            <div><span className="text-muted-foreground">Account:</span> <span className="font-mono">{exec.account_id}</span></div>
            <div><span className="text-muted-foreground">Side:</span> {closeSide}</div>
            <div><span className="text-muted-foreground">Qty:</span> {Math.abs(exec.qty)}</div>
            {exec.sec_type === 'OPT' && (
              <>
                <div><span className="text-muted-foreground">Right:</span> {rightLabel(exec.right)}</div>
                <div><span className="text-muted-foreground">Strike:</span> {fmtUsd(exec.strike)}</div>
                <div><span className="text-muted-foreground">Expiry:</span> {fmtExpiry(exec.expiry)}</div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground">Price</label>
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Commission (optional)</label>
              <Input
                type="number"
                step="0.01"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder="0.00"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Closing…' : 'Close Position'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
