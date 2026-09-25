/**
 * The Account control — the shell's account scope, beside the Objective
 * (design `_Shell TopBar.dc.html`, 2026-09-25: "the Lens split").
 *
 * Long-lived and the riskiest scope, so it gets its own control, drawn to be
 * **quiet on All, loud when it narrows the book**: a narrowed chip wears the
 * amber line and fill and says `only`. On the two pages where plans are put
 * into an account — Desk and Plans — All is not offered and the chip says
 * `pick one` until it has one.
 *
 * Wired this round: Positions, Desk and Plans (the route table's
 * `accountScope`). Anywhere else the scope is carried, not applied, and the
 * popover says so rather than letting a narrowed chip imply a narrowed page.
 */
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { setAccountScope, useAccountScope, type AccountScope } from '@/lib/accountScope'
import { cn } from '@/lib/utils'
import { PAGE_ROUTES, routeFor } from './routeRegistry'
import { SHELL_TOP_BAR_CONTROL_CLASS } from './shellChrome'

/** Where plans are put into one account: All is not a place to put one. */
const ORDER_PAGES = new Set(['/trade/desk', '/trade/plans'])

const LABEL: Record<AccountScope, string> = { all: 'All', HOST: 'HOST', SEC: 'SEC' }

export function AccountControl() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const scope = useAccountScope()
  const status = useMonitorStatus().data
  const hostId = status?.config?.ib_client?.account?.event_host ?? ''
  const secondaryId = status?.config?.ib_client?.account?.event_secondary ?? ''
  const wired = Boolean(routeFor(pathname).accountScope)
  const orderPage = ORDER_PAGES.has(pathname)
  const narrowed = scope !== 'all'
  const blocked = orderPage && !narrowed
  // The Desk's own route label is its layer's name, `Trade`; here it is the Desk.
  const wiredPages = PAGE_ROUTES.filter((r) => r.accountScope)
    .map((r) => (r.path === '/trade/desk' ? 'Desk' : r.label))
    .join(' · ')

  const chipTitle = blocked
    ? 'Plans go into one account — pick HOST or SEC'
    : narrowed
      ? `Account scope: ${LABEL[scope]} only — ${wired ? 'totals and risk here read this account' : 'this page is not wired to it yet and shows the whole book'}`
      : 'Account scope: the whole book'

  const rows: { id: AccountScope; sub: string }[] = [
    { id: 'all', sub: orderPage ? 'not offered where plans are placed' : 'Both accounts · margin listed per account' },
    { id: 'HOST', sub: hostId ? `${hostId} · the host account` : 'the host account' },
    { id: 'SEC', sub: secondaryId ? `${secondaryId} · the secondary account` : 'the secondary account' },
  ]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={chipTitle}
          aria-label={chipTitle}
          className={cn(
            SHELL_TOP_BAR_CONTROL_CLASS,
            'hidden gap-1.5 whitespace-nowrap sm:inline-flex',
            narrowed || blocked
              ? 'border-[var(--color-lamp-yellow)]'
              : 'border-[var(--sk-line)] hover:bg-secondary',
            narrowed && 'bg-[color-mix(in_srgb,var(--color-lamp-yellow)_10%,transparent)]',
            open && !narrowed && !blocked && 'border-[var(--sk-accent)]',
          )}
        >
          <span className="font-mono text-dense-micro tracking-[0.1em] text-muted-foreground">ACCT</span>
          <span className={cn(narrowed ? 'font-semibold text-foreground' : blocked ? 'text-foreground' : 'text-[var(--sk-mute2)]')}>
            {LABEL[scope]}
          </span>
          {narrowed || blocked ? (
            <span className={cn('font-mono text-dense-micro', blocked ? 'text-[var(--color-lamp-yellow)]' : 'text-[var(--sk-mute2)]')}>
              {blocked ? 'pick one' : !wired ? 'held' : orderPage ? 'plans go here' : 'only'}
            </span>
          ) : null}
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[300px] p-0">
        <div className="flex items-baseline gap-2 border-b border-border px-3 py-2">
          <span className="text-dense-body font-semibold">Account</span>
          <span className="text-dense-meta text-muted-foreground">
            {narrowed ? (wired ? 'narrowed — this page shows part of the book' : 'held — not wired on this page') : 'whole book'}
          </span>
        </div>
        <div className="py-1">
          {rows.map((r) => {
            const off = r.id === 'all' && orderPage
            const on = r.id === scope
            return (
              <button
                key={r.id}
                type="button"
                disabled={off}
                title={off ? 'Plans go into one account — pick HOST or SEC' : `Scope → ${LABEL[r.id]}`}
                onClick={() => {
                  if (off) return
                  setAccountScope(r.id)
                  setOpen(false)
                }}
                className={cn(
                  'grid w-full cursor-pointer grid-cols-[14px_minmax(0,1fr)] items-center gap-2 border-0 px-3 py-1.5 text-left hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-45',
                  on ? 'bg-[rgb(var(--sk-accent-rgb)/0.08)]' : 'bg-transparent',
                )}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: on ? 'var(--sk-accent)' : 'var(--sk-line2)' }}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-dense-body text-foreground">{LABEL[r.id]}</span>
                  <span className="block truncate text-dense-meta text-muted-foreground">{r.sub}</span>
                </span>
              </button>
            )
          })}
        </div>
        <p className="m-0 border-t border-border px-3 pt-1.5 pb-2 text-dense-caption leading-normal text-muted-foreground">
          {orderPage
            ? 'Desk and Plans put plans into one account, so All is not offered here.'
            : 'Margin and buying power cannot be summed across accounts. Under All they are listed per account, never added.'}{' '}
          Read on {wiredPages}; every other page shows the whole book — not wired yet.
        </p>
      </PopoverContent>
    </Popover>
  )
}
