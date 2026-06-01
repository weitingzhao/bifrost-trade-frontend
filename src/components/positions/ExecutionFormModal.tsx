import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { updateExecution, createExecution } from '@/api/trading'
import type { Execution } from '@/types/positions'

interface Props {
  open: boolean
  exec: Execution | null
  accountOptions: string[]
  createSource?: 'manual' | 'journal_closed'
  onClose: () => void
  onSuccess: () => void
}

export function ExecutionFormModal({
  open,
  exec,
  accountOptions,
  createSource = 'manual',
  onClose,
  onSuccess,
}: Props) {
  const [accountId, setAccountId] = useState(exec?.account_id ?? '')
  const [symbol, setSymbol] = useState(exec?.symbol ?? '')
  const [secType, setSecType] = useState<'STK' | 'OPT'>(exec?.sec_type === 'OPT' ? 'OPT' : 'STK')
  const [side, setSide] = useState<'BUY' | 'SELL'>(exec?.side === 'Sell' ? 'SELL' : 'BUY')
  const [quantity, setQuantity] = useState(exec ? String(Math.abs(exec.qty)) : '')
  const [price, setPrice] = useState(exec ? String(exec.price) : '')
  const [execTime, setExecTime] = useState(
    exec?.time ? new Date(exec.time * 1000).toISOString().slice(0, 16) : '',
  )
  const [expiry, setExpiry] = useState(exec?.expiry ?? '')
  const [strike, setStrike] = useState(exec?.strike != null ? String(exec.strike) : '')
  const [right, setRight] = useState<'C' | 'P'>((exec?.right ?? 'C') as 'C' | 'P')
  const [commission, setCommission] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCreate = !exec?.account_executions_id
  const isJournal = isCreate && createSource === 'journal_closed'

  useEffect(() => {
    if (!open || !exec?.account_executions_id) return
    const sideRaw = (exec.side ?? 'BUY').toUpperCase()
    const isSell = sideRaw === 'SELL' || sideRaw === 'SLD' || sideRaw === 'S'
    const qty = Math.abs(Number(exec.quantity ?? exec.qty) || 0)
    setAccountId(exec.account_id ?? '')
    setSymbol(exec.symbol ?? '')
    setSecType(exec.sec_type === 'OPT' ? 'OPT' : 'STK')
    setSide(isSell ? 'SELL' : 'BUY')
    setQuantity(qty > 0 ? String(qty) : '')
    setPrice(exec.price != null ? String(exec.price) : '')
    setExecTime(exec.time ? new Date(exec.time * 1000).toISOString().slice(0, 16) : '')
    setExpiry(exec.expiry ?? '')
    setStrike(exec.strike != null ? String(exec.strike) : '')
    const r = (exec.right ?? exec.option_right ?? 'C').toString().toUpperCase().slice(0, 1)
    setRight(r === 'P' ? 'P' : 'C')
    setCommission(exec.commission != null ? String(exec.commission) : '')
    setError(null)
  }, [open, exec])

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    const timeEpoch = execTime ? Math.floor(new Date(execTime).getTime() / 1000) : Math.floor(Date.now() / 1000)
    try {
      if (isCreate) {
        const res = await createExecution({
          account_id: accountId,
          symbol: symbol.toUpperCase(),
          sec_type: secType,
          side,
          quantity: parseFloat(quantity) || 0,
          price: parseFloat(price) || 0,
          time: timeEpoch,
          source: isJournal ? 'journal_closed' : 'manual',
          ...(secType === 'OPT' ? {
            expiry,
            strike: parseFloat(strike) || undefined,
            option_right: right,
          } : {}),
          ...(commission ? { commission: parseFloat(commission) } : {}),
        })
        if (!res.ok) throw new Error(res.error ?? 'Create failed')
      } else {
        const res = await updateExecution(exec!.account_executions_id!, {
          account_id: accountId,
          symbol: symbol.toUpperCase(),
          sec_type: secType,
          side,
          quantity: parseFloat(quantity) || 0,
          price: parseFloat(price) || 0,
          exec_time: timeEpoch,
          ...(secType === 'OPT' ? {
            expiry,
            strike: parseFloat(strike) || undefined,
            option_right: right,
          } : {}),
          ...(commission ? { commission: parseFloat(commission) } : {}),
        })
        if (!res.ok) throw new Error(res.error ?? 'Update failed')
      }
      onSuccess()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreate ? (isJournal ? 'Add journal' : 'Add Journal Entry') : 'Edit execution'}</DialogTitle>
        </DialogHeader>

        {isJournal && (
          <p className="text-xs text-muted-foreground">
            Manual journal entry stored as <code className="font-mono text-[11px]">journal_closed</code> in the journal table for reconciliation.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm pt-2">
          <div>
            <label className="text-xs text-muted-foreground">Account</label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountOptions.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Time</label>
            <Input
              type="datetime-local"
              value={execTime}
              onChange={(e) => setExecTime(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Symbol</label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="h-8 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={secType} onValueChange={(v) => setSecType(v as 'STK' | 'OPT')}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STK">STK</SelectItem>
                <SelectItem value="OPT">OPT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Side</label>
            <Select value={side} onValueChange={(v) => setSide(v as 'BUY' | 'SELL')}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">Buy</SelectItem>
                <SelectItem value="SELL">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Quantity</label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-8 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Price</label>
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-8 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Commission</label>
            <Input
              type="number"
              step="0.01"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="h-8 text-sm font-mono"
              placeholder="0.00"
            />
          </div>

          {secType === 'OPT' && (
            <>
              <div>
                <label className="text-xs text-muted-foreground">Expiry (YYYYMMDD)</label>
                <Input
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="h-8 text-sm font-mono"
                  maxLength={8}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Strike</label>
                <Input
                  type="number"
                  step="0.5"
                  value={strike}
                  onChange={(e) => setStrike(e.target.value)}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Right</label>
                <Select value={right} onValueChange={(v) => setRight(v as 'C' | 'P')}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C">Call</SelectItem>
                    <SelectItem value="P">Put</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2 mt-2">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : isCreate ? (isJournal ? 'Add journal' : 'Save') : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
