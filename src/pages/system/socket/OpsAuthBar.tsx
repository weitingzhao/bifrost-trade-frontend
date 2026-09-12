import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { setOpsToken } from '@/api/ops'
import type { OpsCapabilities } from '@/api/ops'
import {
  opsAuthAuthenticatedBadgeClass,
  opsAuthRoleBadgeClass,
  opsAuthTokenRequiredBadgeClass,
} from './socketIngestUi'

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
  const isInvalidToken =
    Boolean(token) && !isAuthenticated && caps?.identity?.name === 'invalid-token'

  function handleConnect() {
    const t = tokenInput.trim()
    if (!t) return
    setOpsToken(t)
    onTokenChange(t)
    setAuthOpen(false)
    setTokenInput('')
    queueMicrotask(() => onRefresh())
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
            className={opsAuthRoleBadgeClass(role)}
          >
            {role}
          </Badge>
          {caps?.identity?.name && caps.identity.name !== 'anonymous' && (
            <span className="text-muted-foreground">{caps.identity.name}</span>
          )}
          {isAuthenticated ? (
            <Badge variant="outline" className={opsAuthAuthenticatedBadgeClass()}>
              Authenticated
            </Badge>
          ) : isInvalidToken ? (
            <Badge variant="outline" className={opsAuthTokenRequiredBadgeClass()}>
              Invalid token
            </Badge>
          ) : authRequired ? (
            <Badge variant="outline" className={opsAuthTokenRequiredBadgeClass()}>
              Token required for control
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onRefresh}>
            Refresh
          </Button>
          {isAuthenticated ? (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleSignOut}>
              Sign out
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setAuthOpen(v => !v)}
              >
                {token ? 'Change token' : 'Authenticate'}
              </Button>
              {token ? (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleSignOut}>
                  Sign out
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
      {authOpen && !isAuthenticated && (
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
