/**
 * One expiry card on the Chain face (design `Research Symbol.dc.html`,
 * §isOptions step 1): the date and days out, the fit's ATM IV, the chain's
 * ±1σ, straddle and open interest, and the earnings E when the next print —
 * Research's estimate — falls inside it (`symbolEarnings.expiryEarnings`).
 */
import { cn } from '@/lib/utils'
import type { ChainContract } from '@/utils/optionChain'
import { oiTotals, sigmaMove, straddleMid } from './symbolChainModel'
import type { ExpiryEarnings } from './symbolEarnings'

const cap =
  'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'
const mono = 'font-mono tabular-nums'

export function SymbolExpiryCard({
  expiry,
  dte,
  iv,
  ivMax,
  chain,
  spot,
  on,
  earn,
  onPick,
}: {
  expiry: string
  dte: number
  /** The fit's ATM vol, a fraction. */
  iv: number | null
  ivMax: number
  chain: readonly ChainContract[]
  spot: number | null
  on: boolean
  earn: ExpiryEarnings | null
  onPick: () => void
}) {
  const st = spot != null ? straddleMid(chain, spot) : null
  const mv = spot != null && iv != null ? sigmaMove(spot, iv, dte) : null
  const t = oiTotals(chain)
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'flex cursor-pointer flex-col gap-1.5 border-r border-border/60 px-3 py-2.5 text-left last:border-r-0 hover:bg-[var(--sk-surface)]',
        on && 'bg-[rgb(var(--sk-accent-rgb)/0.06)] shadow-[inset_0_-2px_0_var(--sk-ticker)]'
      )}
    >
      <span className="flex items-baseline gap-1.5">
        <span className={cn(mono, 'text-dense-body font-bold', on ? 'text-[var(--sk-ticker)]' : 'text-foreground')}>
          {expiry.slice(5)}
        </span>
        <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>{dte}d</span>
        {earn ? (
          <span
            className={cn(mono, 'ml-auto text-dense-micro font-bold', earn.tag === 'E' ? 'text-warning' : 'text-warning/60')}
            title={earn.title}
          >
            {earn.tag}
          </span>
        ) : null}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className={cn(mono, 'text-lg font-semibold')}>{iv != null ? (iv * 100).toFixed(1) : '—'}</span>
        <span className={cap}>atm iv</span>
      </span>
      <span className="relative block h-[5px] overflow-hidden rounded-[3px] bg-[var(--sk-line0)]">
        {iv != null ? (
          <span
            className={cn(
              'absolute inset-y-0 left-0',
              earn?.tag === 'E' ? 'bg-warning' : earn?.tag === 'E?' ? 'bg-warning/50' : 'bg-[var(--sk-line2)]'
            )}
            style={{ width: `${(iv / ivMax) * 100}%` }}
          />
        ) : null}
      </span>
      <span className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-dense-caption">
        <span className={cap}>±1σ</span>
        <span className={cn(mono, 'text-right text-secondary-foreground')}>
          {mv != null && spot != null ? `${(spot - mv).toFixed(0)}–${(spot + mv).toFixed(0)}` : '—'}
        </span>
        <span className={cap}>straddle</span>
        <span className={cn(mono, 'text-right text-secondary-foreground')}>{st != null ? st.toFixed(2) : '—'}</span>
        <span className={cap}>oi · p/c</span>
        <span className={cn(mono, 'text-right text-secondary-foreground')}>
          {t.total > 0 ? `${(t.total / 1000).toFixed(0)}k · ${t.pc != null ? t.pc.toFixed(2) : '—'}` : '—'}
        </span>
      </span>
    </button>
  )
}
