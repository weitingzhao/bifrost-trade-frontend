/**
 * Account + Book — one menu-bar item (design Rev .60 §2, "不写英文").
 *
 * The account scope (Rev .58's ACCT chip) and the book the status pill used to
 * carry fuse into one button: an account badge (a stack for All, `H` / `S`
 * for one account), the day's P&L in direction ink, `Δ+N`, an amber ▲N for
 * short legs inside the warning line and an octagon ⯃N for breached limits.
 * Every word is in the tip.
 *
 * It opens the Book Control Center: the account segment on top (each with its
 * own day; All is not offered where plans go into one account), a grid of
 * modules — the day (2×2, with the holdings count), Δ, legs, breaches — and
 * under them the list a module opens: the holdings (what the retired bottom
 * drawer held, one row each), the legs near their strikes, the breached lines.
 *
 * The badge says the scope and nothing else: amber fill = narrowed, amber
 * ring = an order page still on All. A page that does not read the scope yet
 * shows the whole book, and the tip says so.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useBookLive } from '@/hooks/useBookLive'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useRiskLimitWatch } from '@/hooks/useRiskLimitWatch'
import { inAccountScope, scopeAccountId, setAccountScope, useAccountScope, type AccountScope } from '@/lib/accountScope'
import { withSymbolParam } from '@/lib/symbolLink'
import { cn } from '@/lib/utils'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { routeFor } from '../routeRegistry'
import { MenubarTip } from './MenubarTip'
import { useShellPopover } from '@/lib/shellPopover'
import css from './menubar.module.css'

/** Where plans go into one account: All is not a place to put one. */
const ORDER_PAGES = new Set(['/trade/desk', '/trade/plans'])

const LABEL: Record<AccountScope, string> = { all: 'All', HOST: 'HOST', SEC: 'SEC' }

function dirInk(v: number | null): string {
  return v == null || Math.round(v) === 0 ? 'var(--sk-mute2)' : v > 0 ? 'var(--color-profit)' : 'var(--color-loss)'
}

function signedInt(v: number): string {
  const r = Math.round(v)
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toLocaleString('en-US')}`
}

const TRIANGLE = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
    <path d="M12 3.5 2.5 20h19L12 3.5Z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
)
const OCTAGON = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
    <path d="M8 2.5h8l5.5 5.5v8L16 21.5H8L2.5 16V8L8 2.5Z" />
    <path d="M12 8v5M12 16h.01" />
  </svg>
)
const STACK = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
)
const TREND = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M4 18 9 12l4 3 7-8" />
    <path d="M15 7h5v5" />
  </svg>
)

type ListKind = 'pos' | 'legs' | 'breach'

interface ListRow {
  key: string
  dot: string
  name: string
  sub: string
  right: string
  rightInk: string
  to: string
}

export function BookControl() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  // One shell popover at a time (Rev .68).
  const [open, setOpen] = useShellPopover('book')
  const [list, setList] = useState<ListKind | null>(null)
  const scope = useAccountScope()
  const status = useMonitorStatus().data
  const hostId = status?.config?.ib_client?.account?.event_host ?? ''
  const secondaryId = status?.config?.ib_client?.account?.event_secondary ?? ''
  // Every 3s while the centre is open, every 30s while shut — the bar only
  // needs the day, and the drawer's ledger basis waits for the list.
  const book = useBookLive(open)
  const limits = useRiskLimitWatch()

  const orderPage = ORDER_PAGES.has(pathname)
  const wired = Boolean(routeFor(pathname).accountScope)
  const narrowed = scope !== 'all'
  const blocked = orderPage && !narrowed

  const scoped = useMemo(
    () => book.rows.filter((r) => inAccountScope(r.accountId, scope, hostId, secondaryId)),
    [book.rows, scope, hostId, secondaryId],
  )
  const dayOf = (rows: typeof book.rows) => rows.reduce((s, r) => s + (r.dayUsd ?? 0), 0)
  const day = dayOf(scoped)
  const dayUnknown = scoped.filter((r) => r.dayUsd == null).length
  const scopedId = scopeAccountId(scope, hostId, secondaryId)
  const delta = scopedId ? (book.modelDeltaByAccount[scopedId] ?? null) : book.modelDelta
  const legs = scoped.filter((r) => r.next.warn)
  const breaches = limits.breaches
  const hardBreach = breaches.some((b) => b.kind === 'hard')
  const breachInk = breaches.length === 0 ? 'var(--sk-mute2)' : hardBreach ? 'var(--color-loss)' : 'var(--color-lamp-yellow)'
  const hasBook = book.rows.length > 0
  const dayText = hasBook ? `${fmtSignedUsd0(day)}${dayUnknown > 0 ? '+?' : ''}` : '—'

  const acctTitle = blocked
    ? 'Plans go into one account — pick HOST or SEC'
    : narrowed
      ? `Account scope: ${LABEL[scope]} only — ${wired ? 'totals and risk here read this account' : 'this page is not wired to it yet and shows the whole book'}`
      : 'Account scope: the whole book'
  const tip = [
    acctTitle,
    hasBook
      ? `Day ${fmtSignedUsd0(day)} over ${scoped.length - dayUnknown} of ${scoped.length} holdings${dayUnknown > 0 ? ` — ${dayUnknown} without a day figure` : ''}`
      : 'No holdings read yet',
    delta == null ? 'Δ: the model service has not answered' : `Δ ${signedInt(delta)} shares-equivalent (model service)`,
    `▲ ${legs.length} short ${legs.length === 1 ? 'leg' : 'legs'} inside the warning line`,
    `⯃ ${breaches.length} breached ${breaches.length === 1 ? 'limit' : 'limits'}${breaches.length ? ` — ${breaches.map((b) => b.name).join(' · ')}` : ''}`,
  ].join('\n')

  const badge = narrowed
    ? { bg: 'color-mix(in srgb, var(--color-lamp-yellow) 22%, transparent)', ink: 'var(--sk-ink)', ring: 'transparent' }
    : blocked
      ? { bg: 'color-mix(in srgb, var(--sk-ink) 8%, transparent)', ink: 'var(--sk-soft)', ring: 'var(--color-lamp-yellow)' }
      : { bg: 'color-mix(in srgb, var(--sk-ink) 8%, transparent)', ink: 'var(--sk-mute2)', ring: 'transparent' }

  const perAccount = (s: AccountScope) =>
    dayOf(book.rows.filter((r) => inAccountScope(r.accountId, s, hostId, secondaryId)))

  const rows: ListRow[] =
    list === 'pos'
      ? scoped.map((r) => ({
          key: r.key,
          dot: r.kind === 'opt' ? 'var(--sk-contract)' : 'var(--sk-ticker)',
          name: r.label,
          sub: `${book.tagOf(r.accountId)} · ${r.qty > 0 ? '+' : ''}${r.qty}${r.next.text ? ` · ${r.next.text}` : ''}`,
          right: r.dayUsd == null ? '—' : fmtSignedUsd0(r.dayUsd),
          rightInk: dirInk(r.dayUsd),
          to: withSymbolParam('/portfolio/positions', r.symbol),
        }))
      : list === 'legs'
        ? legs.map((r) => ({
            key: r.key,
            dot: 'var(--color-lamp-yellow)',
            name: r.label,
            sub: `${book.tagOf(r.accountId)} · ${r.next.title}`,
            right: r.next.text,
            rightInk: 'var(--color-lamp-yellow)',
            to: withSymbolParam('/portfolio/positions', r.symbol),
          }))
        : list === 'breach'
          ? breaches.map((b) => ({
              key: b.key,
              dot: b.kind === 'hard' ? 'var(--color-loss)' : 'var(--color-lamp-yellow)',
              name: b.name,
              sub: b.onBreach,
              right: b.use == null ? '—' : `${Math.round(b.use * 100)}%`,
              rightInk: b.kind === 'hard' ? 'var(--color-loss)' : 'var(--color-lamp-yellow)',
              to: '/risk/limits',
            }))
          : []
  const emptyText =
    list === 'pos' ? 'Nothing held in this scope.' : list === 'legs' ? 'No short leg is inside the warning line.' : 'No line the bar watches is crossed.'

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }
  const tile = (kind: ListKind): { 'data-on': '1' | '0'; onClick: () => void } => ({
    'data-on': list === kind ? '1' : '0',
    onClick: () => setList((v) => (v === kind ? null : kind)),
  })

  const accountFoot = orderPage
    ? 'Desk and Plans put plans into one account, so All is not offered here.'
    : 'Margin and buying power are per account — under All they are listed per account, never added.'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <MenubarTip tip={tip}>
        <PopoverTrigger asChild>
          <button type="button" className={cn(css.item, 'gap-1.5 pr-[7px] pl-[5px]')} aria-label={acctTitle}>
            <span
              aria-hidden
              className={cn('inline-flex size-[18px] flex-none items-center justify-center rounded-[5px] font-mono font-bold leading-none', css.fs10)}
              style={{ background: badge.bg, color: badge.ink, boxShadow: `inset 0 0 0 1px ${badge.ring}` }}
            >
              {scope === 'all' ? STACK : scope.charAt(0)}
            </span>
            <span className={cn(css.book, 'inline-flex items-center gap-1.5 border-l border-[color-mix(in_srgb,var(--sk-ink)_12%,transparent)] pl-[7px]')}>
              <span className={cn(css.mono, 'font-semibold', css.fs12)} style={{ color: dirInk(hasBook ? day : null) }}>
                {dayText}
              </span>
              <span className={cn(css.mono, css.bookDelta, 'text-[var(--sk-mute2)]', css.fs11)}>
                Δ{delta == null ? '—' : signedInt(delta)}
              </span>
            </span>
            {legs.length > 0 ? (
              <span className={cn(css.bookLegs, 'inline-flex items-center gap-[3px] text-[var(--color-lamp-yellow)]')}>
                {TRIANGLE}
                <span className={cn(css.mono, css.fs11)}>{legs.length}</span>
              </span>
            ) : null}
            {breaches.length > 0 ? (
              <span className="inline-flex flex-none items-center gap-[3px]" style={{ color: breachInk }}>
                {OCTAGON}
                <span className={cn(css.mono, css.fs11)}>{breaches.length}</span>
              </span>
            ) : null}
          </button>
        </PopoverTrigger>
      </MenubarTip>
      <PopoverContent
        align="end"
        sideOffset={6}
        className={cn(css.pop, 'flex max-h-[calc(100vh-64px)] w-[360px] max-w-[calc(100vw-24px)] flex-col gap-2 overflow-y-auto rounded-[16px] p-2.5')}
        style={{ borderRadius: 16, padding: 10 }}
        aria-label="Book"
      >
        <div className={css.seg} role="group" aria-label="Account scope">
          {(['all', 'HOST', 'SEC'] as const).map((s) => {
            const off = s === 'all' && orderPage
            const pl = perAccount(s)
            return (
              <button
                key={s}
                type="button"
                data-on={scope === s ? '1' : '0'}
                disabled={off}
                title={off ? 'Plans go into one account — pick HOST or SEC' : `Scope → ${LABEL[s]}`}
                onClick={() => setAccountScope(s)}
              >
                <span className={cn(css.fs12)}>{LABEL[s]}</span>
                <span className={cn(css.mono, 'font-medium', css.fs11)} style={{ color: dirInk(hasBook ? pl : null) }}>
                  {hasBook ? fmtSignedUsd0(pl) : '—'}
                </span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-4 grid-rows-[64px_64px] gap-2">
          <button
            type="button"
            className={cn(css.tile, 'col-span-2 row-span-2 flex-col items-start justify-between p-3')}
            title={`Holdings · ${scoped.length}`}
            {...tile('pos')}
          >
            <span className="flex items-center gap-1.5 text-[var(--sk-mute2)]">
              {TREND}
              <span className={cn(css.mono, css.fs11)}>{scoped.length}</span>
            </span>
            <span className={cn(css.mono, 'font-semibold tracking-[-0.01em]', css.fs24)} style={{ color: dirInk(hasBook ? day : null) }}>
              {dayText}
            </span>
          </button>
          <div className={cn(css.tile, 'col-span-2 justify-start gap-2.5 px-3')} title="Effective delta — the model service's">
            <span className={cn(css.round, 'font-mono font-bold', css.fs14)}>Δ</span>
            <span className={cn(css.mono, 'font-semibold', css.fs16)}>{delta == null ? '—' : signedInt(delta)}</span>
          </div>
          <button type="button" className={cn(css.tile, 'flex-col gap-[3px]')} title="Short legs inside the warning line" {...tile('legs')}>
            <span
              className={css.round}
              style={legs.length ? { background: 'color-mix(in srgb, var(--color-lamp-yellow) 22%, transparent)', color: 'var(--color-lamp-yellow)' } : undefined}
            >
              {TRIANGLE}
            </span>
            <span className={cn(css.mono, 'font-semibold', css.fs12)}>{legs.length}</span>
          </button>
          <button type="button" className={cn(css.tile, 'flex-col gap-[3px]')} title="Breached limits" {...tile('breach')}>
            <span
              className={css.round}
              style={breaches.length ? { background: `color-mix(in srgb, ${breachInk} 22%, transparent)`, color: breachInk } : undefined}
            >
              {OCTAGON}
            </span>
            <span className={cn(css.mono, 'font-semibold', css.fs12)}>{breaches.length}</span>
          </button>
        </div>

        {list ? (
          <div className={cn(css.card, 'p-1')}>
            {rows.length === 0 ? (
              <div className={cn('px-2 py-2.5 text-[var(--sk-mute2)]', css.fs12)}>{emptyText}</div>
            ) : (
              rows.map((r) => (
                <div key={r.key} className={css.row} onClick={() => go(r.to)} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go(r.to)}>
                  <span className="size-[7px] rounded-full" style={{ background: r.dot }} />
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className={cn(css.mono, 'truncate text-[var(--sk-ink)]', css.fs12)}>{r.name}</span>
                    <span className={cn('truncate text-[var(--sk-mute2)]', css.fs11)}>{r.sub}</span>
                  </span>
                  <span className={cn(css.mono, 'text-right', css.fs12)} style={{ color: r.rightInk }}>
                    {r.right}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : null}

        <Foot text={accountFoot}>
          <button type="button" className={cn('flex-none border-0 bg-transparent p-0 text-[var(--sk-accent)]', css.fs11)} onClick={() => go('/portfolio/positions')}>
            Positions →
          </button>
        </Foot>
      </PopoverContent>
    </Popover>
  )
}

function Foot({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span title={text} className={cn('min-w-0 flex-1 truncate text-[var(--sk-mute)]', css.fs11)}>
        {text}
      </span>
      {children}
    </div>
  )
}
