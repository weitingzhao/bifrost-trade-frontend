/**
 * Three pieces of the Chain face the retired Discovery page carried
 * (S4, 2026-09-26): the strike window by count, by the expiry's priced σ, or a
 * custom σ multiple; the contract's liquidity and checks; and adding the
 * contract to the watchlist. Kept out of SymbolChainFace so the face stays
 * under the 800-line ratchet.
 */
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { postWatchlistItem } from '@/api/market'
import type { VendorGreeksRow } from '@/api/marketData/optionGreeks'
import type { ExpectedEarnings } from '@/api/research/narrative'
import { SegmentControl } from '@/components/data-display'
import { FaceKv } from '@/components/research/FaceKv'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { ordinal } from '@/lib/analyzeDepth'
import { cn } from '@/lib/utils'
import type { ChainContract } from '@/utils/optionChain'
import { contractChecks, optionWatchlistKey, type StrikeWindow } from './symbolChainModel'

const cap = 'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground'

export function StrikeWindowControl({
  win,
  onChange,
  move,
}: {
  win: StrikeWindow
  onChange: (w: StrikeWindow) => void
  /** One standard deviation at this expiry, in price; null without an ATM fit. */
  move: number | null
}) {
  const [customK, setCustomK] = useState('')
  return (
    <>
      <SegmentControl
        ariaLabel="Strike window"
        size="xs"
        value={win.kind === 'count' ? `n${win.n}` : win.kind === 'all' ? 'all' : `s${win.k}`}
        onChange={(v) => {
          setCustomK('')
          onChange(
            v === 'all'
              ? { kind: 'all' }
              : v.startsWith('s')
                ? { kind: 'sigma', k: Number(v.slice(1)) }
                : { kind: 'count', n: Number(v.slice(1)) },
          )
        }}
        options={[
          { value: 'n5', label: '±5' },
          { value: 'n9', label: '±9' },
          { value: 'n14', label: '±14' },
          { value: 'all', label: 'All' },
          ...(move != null
            ? [
                { value: 's1', label: '1σ' },
                { value: 's2', label: '2σ' },
              ]
            : []),
        ]}
      />
      {move != null ? (
        <label
          className="inline-flex items-center gap-1 text-dense-micro text-muted-foreground"
          title={`Strikes within k standard deviations of spot: k × ${move.toFixed(2)} — spot × ATM IV × √(DTE/365) at this expiry.`}
        >
          <input
            type="number"
            inputMode="decimal"
            min={0.25}
            step={0.25}
            placeholder="k"
            aria-label="Custom sigma multiple"
            value={customK}
            onChange={(e) => {
              setCustomK(e.target.value)
              const k = Number(e.target.value)
              if (Number.isFinite(k) && k > 0) onChange({ kind: 'sigma', k })
            }}
            className="mat-field h-5 w-12 px-1 text-right font-mono text-dense-micro tabular-nums"
          />
          σ
        </label>
      ) : null}
    </>
  )
}

export function ContractChecksBlock({
  chain,
  selected,
  dte,
  earnings,
  snapshotRows,
  today,
}: {
  chain: readonly ChainContract[]
  selected: ChainContract
  dte: number | null
  earnings: ExpectedEarnings | null
  /** The expiry's snapshot rows — the selected contract's observation time is read off them. */
  snapshotRows: readonly VendorGreeksRow[]
  today: string
}) {
  const snapshotTs = snapshotRows.find((row) => row.option_ticker === selected.ticker)?.snapshot_ts ?? null
  const r = contractChecks(chain, selected, {
    dte,
    earningsDaysAway: earnings?.days_away ?? null,
    earningsDate: earnings?.date ?? null,
    snapshotTs,
    today,
  })
  return (
    <div className="border-b border-border/60 px-3 py-2">
      <div className="mb-1 flex gap-2">
        <span className={cap}>liquidity · checks</span>
        <span
          className="ml-auto text-dense-micro text-muted-foreground"
          title="The plan carries last trades, not quotes, so there is no spread to rank; liquidity is the contract's open interest among its own side of the expiry."
        >
          no quote on the plan — no spread
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <FaceKv
          label="OI rank"
          value={r.oiPctile != null ? `${ordinal(Math.round(r.oiPctile * 100))} of ${r.sameSide}` : '—'}
          title={`Share of the ${selected.right === 'C' ? 'calls' : 'puts'} at this expiry with open interest at or below this one.`}
        />
        <FaceKv
          label="vol / OI"
          value={r.volOi != null ? r.volOi.toFixed(2) : '—'}
          cls={r.volOi != null && r.volOi > 1 ? 'text-warning' : undefined}
          title="The session's volume against the open interest carried into it; above 1 is new positioning."
        />
        <FaceKv label="snapshot" value={snapshotTs ? snapshotTs.slice(5, 10) : '—'} title={snapshotTs ?? undefined} />
      </div>
      {r.warnings.length > 0 ? (
        <ul className="m-0 mt-1.5 flex list-none flex-col gap-0.5 p-0">
          {r.warnings.map((w) => (
            <li key={w} className="text-dense-micro leading-normal text-warning text-pretty">
              {w}
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 mt-1.5 text-dense-micro text-muted-foreground">No warnings on this contract.</p>
      )}
    </div>
  )
}

export function WatchlistAddButton({
  symbol,
  expiry,
  contract,
}: {
  symbol: string
  expiry: string
  contract: ChainContract
}) {
  const qc = useQueryClient()
  const key = optionWatchlistKey(symbol, expiry, contract.strike, contract.right)
  const [state, setState] = useState<{ key: string; msg: string; ok: boolean } | null>(null)
  const shown = state?.key === key ? state : null
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          try {
            const res = await postWatchlistItem({
              contract_key: key,
              symbol: symbol.trim().toUpperCase(),
              sec_type: 'OPT',
              expiry: expiry.replace(/-/g, ''),
              strike: contract.strike,
              option_right: contract.right,
              source: 'symbol_chain',
            })
            setState({ key, ok: res.ok, msg: res.ok ? 'on the watchlist' : (res.error ?? 'add failed') })
            if (res.ok) await qc.invalidateQueries({ queryKey: QUERY_KEYS.research.watchlist })
          } catch (e) {
            setState({ key, ok: false, msg: e instanceof Error ? e.message : 'add failed' })
          }
        }}
        className="cursor-pointer rounded-full border border-border px-2.5 py-1 text-dense-label text-muted-foreground hover:bg-[var(--sk-surface)]"
        title={`Add ${key} to the watchlist.`}
      >
        Watchlist +
      </button>
      {shown ? (
        <span className={cn('text-dense-micro', shown.ok ? 'text-success' : 'text-destructive')}>{shown.msg}</span>
      ) : null}
    </>
  )
}
