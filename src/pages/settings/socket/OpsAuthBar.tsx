import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { setOpsToken } from '@/api/ops'
import type { OpsCapabilities } from '@/api/ops'
import { cn } from '@/lib/utils'

const ROLE_CLASS: Record<string, string> = {
  viewer: 'bg-muted text-muted-foreground border-border',
  operator: 'bg-primary/15 text-primary border-primary/30',
  admin: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
}

export function OpsAuthBar({
  token,
  caps,
  onTokenChange,
  onRefresh,
}: {
  token: string
  caps: OpsCapabilities | undefined
  onTokenChange: (token: string) => void
  onRefresh: () => void
}) {
  const [authOpen, setAuthOpen] = useState(false)
  const [tokenInput, setTokenInput] = useState('')

  const role = (caps?.identity?.role ?? 'viewer').toLowerCase()
  const isAuthenticated = caps?.identity?.authenticated === true
  const authRequired = caps?.auth_required !== false

  function handleConnect() {
    const t = tokenInput.trim()
    if (!t) return
    setOpsToken(t)
    onTokenChange(t)
    setAuthOpen(false)
    setTokenInput('')
  }

  function handleSignOut() {
    setOpsToken('')
    onTokenChange('')
    setAuthOpen(false)
    setTokenInput('')
  }

  return (
    <div className="flex flex-col items-end gap-2 shrink-0">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge
            variant="outline"
            className={cn('font-bold uppercase tracking-wide', ROLE_CLASS[role] ?? ROLE_CLASS.viewer)}
          >
            {role}
          </Badge>
          {caps?.identity?.name && caps.identity.name !== 'anonymous' && (
            <span className="text-muted-foreground">{caps.identity.name}</span>
          )}
          {isAuthenticated ? (
            <Badge variant="outline" className="border-green-600/40 text-green-500 bg-green-500/10">
              Authenticated
            </Badge>
          ) : authRequired ? (
            <Badge variant="outline" className="border-warning/40 text-warning bg-warning-soft">
              Token required for control
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onRefresh}>
            Refresh
          </Button>
          {isAuthenticated || token ? (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleSignOut}>
              Sign out
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setAuthOpen(v => !v)}>
              Authenticate
            </Button>
          )}
        </div>
      </div>
      {authOpen && !isAuthenticated && !token && (
        <div className="flex items-center gap-2">
          <Input
            type="password"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConnect()}
            placeholder="Ops API token…"
            className="h-8 w-52 text-xs font-mono"
            autoFocus
          />
          <Button size="sm" className="h-8 text-xs" disabled={!tokenInput.trim()} onClick={handleConnect}>
            Connect
          </Button>
        </div>
      )}
    </div>
  )
}
