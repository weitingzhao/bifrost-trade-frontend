/**
 * Operator sign-in (debt TD-23): the token every Trade write carries.
 *
 * Mounted once in the shell. It opens from the user centre, or by itself when
 * the API refuses a write (`tradeFetch`), naming what was refused and the role
 * it needed. Nothing retries on its own: the refused change is the reader's to
 * make again.
 */
import { useState } from 'react'
import { KeyRound, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { closeTradeOperatorDialog, tradeOperatorStore, useTradeOperator } from '@/lib/auth/tradeOperator'

export function TradeOperatorDialog() {
  const { open, token, refused } = useTradeOperator()
  const [draft, setDraft] = useState('')

  const save = () => {
    tradeOperatorStore.setToken(draft)
    setDraft('')
    closeTradeOperatorDialog()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setDraft('')
          closeTradeOperatorDialog()
        }
      }}
    >
      <DialogContent stackLayer="elevated" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Operator sign-in</DialogTitle>
          <DialogDescription>
            Changes on this desk need an operator token: <code className="text-dense-caption">OPS_OPERATOR_TOKEN</code>{' '}
            for this environment, or <code className="text-dense-caption">OPS_ADMIN_TOKEN</code> to also stop processes
            and reconnect IB. It is kept in this browser only.
          </DialogDescription>
        </DialogHeader>
        {refused ? (
          <p className="rounded-md bg-[color-mix(in_srgb,var(--sk-warn)_12%,transparent)] px-3 py-2 text-dense-label text-foreground">
            Refused: <span className="font-mono">{refused.method}</span>{' '}
            <span className="font-mono break-all">{refused.path}</span> needs {refused.requiredRole}; this browser is{' '}
            {refused.currentRole}. Sign in, then make the change again.
          </p>
        ) : null}
        <div className="space-y-1 py-1">
          <label htmlFor="trade-operator-token" className="text-dense-caption text-muted-foreground">
            {token ? 'Replace the token' : 'Token'}
          </label>
          <Input
            id="trade-operator-token"
            type="password"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) save()
            }}
            placeholder={token ? 'A token is saved in this browser' : 'Paste the token'}
            className="h-8 font-mono text-dense-label"
          />
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {token ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                tradeOperatorStore.clear()
                setDraft('')
                closeTradeOperatorDialog()
              }}
            >
              <LogOut className="size-3.5" /> Sign out
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" size="sm" disabled={!draft.trim()} onClick={save}>
            <KeyRound className="size-3.5" /> Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
