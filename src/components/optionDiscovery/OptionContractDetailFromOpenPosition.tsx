import { useCallback, useEffect, useMemo, useState } from 'react'
import { DiscoveryHint } from '@/components/optionDiscovery/DiscoveryHint'
import { RightInspectorHeader } from '@/components/layout/RightInspectorHeader'
import { inspectorShell } from '@/components/layout/rightInspectorUi'
/* eslint-disable react-hooks/set-state-in-effect -- loads contract snapshot on mount */
import type { OptionSnapshotRow, GreeksCoverageResponse } from '@/types/optionDiscovery'
import { fetchGreeksCoverage, fetchOptionSnapshotsPg } from '@/api/research/optionDiscovery'
import { postWatchlistItem } from '@/api/market'
import type { QuoteItem } from '@/types/market'
import { getContractLabelParts, parseOptionContractKey } from '@/lib/format'
import type { OpenOptionPosition } from '@/types/positions'
import { OptionContractDetailPanel } from './OptionContractDetailPanel'
import { computeDerivedMetrics, normalizeOptionRight, parseDteNumeric } from '@/utils/optionDiscovery/optionContractMetrics'
import { useOptionContractLiquidity } from './useOptionContractLiquidity'

function expirationDigitsFromPosition(pos: OpenOptionPosition): string {
  const fromKey = parseOptionContractKey(pos.contract_key).expiry
  const raw = ((pos.expiry ?? '').trim() || fromKey).replace(/\D/g, '')
  if (raw.length === 8) return raw
  if (raw.length === 6) {
    const y = parseInt(raw.slice(0, 4), 10)
    const m = parseInt(raw.slice(4, 6), 10)
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return raw
    const last = new Date(y, m, 0).getDate()
    return `${raw.slice(0, 6)}${String(last).padStart(2, '0')}`
  }
  return raw
}

function strikeIncrement(center: number): number {
  if (!Number.isFinite(center) || center <= 0) return 1
  if (center >= 250) return 5
  if (center >= 100) return 2.5
  if (center >= 25) return 1
  if (center >= 5) return 0.5
  return 0.05
}

function buildStrikesCsvAround(center: number, count = 17): string {
  if (!Number.isFinite(center) || center <= 0) return String(center)
  const inc = strikeIncrement(center)
  const half = Math.floor(count / 2)
  const set = new Set<number>()
  for (let i = -half; i <= half; i += 1) {
    const v = Math.round((center + i * inc) / inc) * inc
    const rounded = Number(v.toFixed(6))
    if (rounded > 0) set.add(rounded)
  }
  return [...set].sort((a, b) => a - b).map(String).join(',')
}

function mergeRealtimeQuote(row: OptionSnapshotRow, q?: QuoteItem): OptionSnapshotRow {
  if (!q) return row
  const mid = q.mid ?? (q.bid != null && q.ask != null ? (q.bid + q.ask) / 2 : null)
  return {
    ...row,
    bid: q.bid ?? row.bid ?? null,
    ask: q.ask ?? row.ask ?? null,
    last: q.last ?? row.last ?? null,
    mid: mid ?? row.mid ?? null,
  }
}

function syntheticSnapshotRow(
  pos: OpenOptionPosition,
  right: 'C' | 'P',
  optQuote?: QuoteItem,
): OptionSnapshotRow {
  const mid = optQuote?.mid ?? (optQuote?.bid != null && optQuote?.ask != null ? (optQuote.bid + optQuote.ask) / 2 : null)
  const mark = pos.mark_price != null && Number.isFinite(pos.mark_price) ? pos.mark_price : mid
  return {
    strike: pos.strike,
    right,
    mark: mark != null && Number.isFinite(mark) ? mark : null,
    bid: optQuote?.bid ?? null,
    ask: optQuote?.ask ?? null,
    last: optQuote?.last ?? null,
    mid: optQuote?.mid ?? null,
  }
}

function pickSnapshotRow(rows: OptionSnapshotRow[], strike: number, right: 'C' | 'P'): OptionSnapshotRow | null {
  const hit = rows.find(
    r =>
      normalizeOptionRight(r.right) === right &&
      Number.isFinite(r.strike) &&
      Number.isFinite(strike) &&
      Math.abs(r.strike - strike) < 1e-4,
  )
  return hit ?? null
}

export function OptionContractDetailFromOpenPosition({
  position,
  optionQuote,
  underlyingHint,
  onClose,
  onOpenOptionDiscovery,
}: {
  position: OpenOptionPosition
  optionQuote?: QuoteItem
  /** Underlying spot when PG has no underlying_price (e.g. from live STK quote). */
  underlyingHint?: number | null
  onClose: () => void
  onOpenOptionDiscovery?: () => void
}) {
  const symbol = useMemo(
    () => getContractLabelParts(position.contract_key).symbol.trim().toUpperCase(),
    [position.contract_key],
  )
  const expirationDigits = useMemo(() => expirationDigitsFromPosition(position), [position])
  const expirationDisplay = useMemo(() => {
    const d = expirationDigits
    if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
    return expirationDigits
  }, [expirationDigits])

  const targetRight = useMemo((): 'C' | 'P' => {
    const r = normalizeOptionRight(parseOptionContractKey(position.contract_key).right)
    return r === 'P' ? 'P' : 'C'
  }, [position.contract_key])

  const [snapshotRows, setSnapshotRows] = useState<OptionSnapshotRow[]>([])
  const [underlyingPrice, setUnderlyingPrice] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [greeksCoverage, setGreeksCoverage] = useState<GreeksCoverageResponse | null>(null)
  const [greeksSource, setGreeksSource] = useState<'snapshot' | 'bs'>('snapshot')
  const [eventContextWarnings, setEventContextWarnings] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    if (!symbol || !expirationDigits) {
      setLoading(false)
      setLoadError('Missing symbol or expiration for this contract.')
      setSnapshotRows([])
      setUnderlyingPrice(null)
      return
    }
    setLoading(true)
    setLoadError(null)
    const strikesCsv = buildStrikesCsvAround(position.strike)
    void fetchOptionSnapshotsPg(symbol, expirationDigits, strikesCsv, 'massive')
      .then(sn => {
        if (cancelled) return
        const rows = sn.rows ?? []
        setSnapshotRows(rows)
        const up =
          sn.underlying_price != null && Number.isFinite(Number(sn.underlying_price))
            ? Number(sn.underlying_price)
            : null
        setUnderlyingPrice(up ?? (underlyingHint != null && Number.isFinite(underlyingHint) ? underlyingHint : null))
        if (sn.error) setLoadError(sn.error)
        else if (rows.length === 0) setLoadError(null)
      })
      .catch(e => {
        if (!cancelled) {
          setSnapshotRows([])
          setUnderlyingPrice(underlyingHint != null && Number.isFinite(underlyingHint) ? underlyingHint : null)
          setLoadError(e instanceof Error ? e.message : String(e))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [symbol, expirationDigits, position.strike, position.contract_key, underlyingHint])

  useEffect(() => {
    if (snapshotRows.length === 0) {
      setGreeksCoverage(null)
      return
    }
    let cancelled = false
    void fetchGreeksCoverage(symbol, expirationDisplay, 'massive').then(r => {
      if (!cancelled) setGreeksCoverage(r)
    })
    return () => {
      cancelled = true
    }
  }, [snapshotRows.length, symbol, expirationDisplay])

  const selectedRowRaw = useMemo(() => {
    if (snapshotRows.length > 0) {
      const hit = pickSnapshotRow(snapshotRows, position.strike, targetRight)
      if (hit) return hit
    }
    return syntheticSnapshotRow(position, targetRight, optionQuote)
  }, [snapshotRows, position, targetRight, optionQuote])

  const selectedRow = useMemo(
    () => mergeRealtimeQuote(selectedRowRaw, optionQuote),
    [selectedRowRaw, optionQuote],
  )

  const selectedDerived = useMemo(
    () => computeDerivedMetrics(selectedRow, underlyingPrice),
    [selectedRow, underlyingPrice],
  )

  useEffect(() => {
    const warnings: string[] = []
    const dte = parseDteNumeric(expirationDisplay)
    if (dte != null && dte <= 3) warnings.push(`DTE is ${dte} — high theta decay, exercise/assignment risk.`)
    if (dte != null && dte === 0) warnings.push('Expiration day — avoid market orders, liquidity may vanish.')
    if (greeksCoverage?.freshness?.stale_rows != null && greeksCoverage.freshness.stale_rows > 0) {
      warnings.push(`${greeksCoverage.freshness.stale_rows} stale snapshot row(s) older than 24h.`)
    }
    if (snapshotRows.length === 0) {
      warnings.push('No Massive snapshot rows in PostgreSQL for this expiry/strike band — Greeks/IV charts may be sparse. Use Research → Option Discovery to sync chain, or wait for backfill.')
    }
    setEventContextWarnings(warnings)
  }, [expirationDisplay, greeksCoverage, snapshotRows.length])

  const {
    liquidityLastTrade,
    liquidityQuoteCount,
    liquidityLoading,
    serverLiquidity,
    serverRelativeValue,
  } = useOptionContractLiquidity(symbol, expirationDigits, selectedRow)

  const handleAddToWatchlist = useCallback(
    async (row: OptionSnapshotRow) => {
      const exp = expirationDigits
      if (!symbol || !exp) return
      const contract_key = `${symbol}|OPT|${exp}|${row.strike}|${row.right}`
      await postWatchlistItem({
        contract_key,
        symbol,
        sec_type: 'OPT',
        expiry: exp,
        strike: row.strike,
        option_right: row.right,
        source: 'positions',
      })
    },
    [symbol, expirationDigits],
  )

  const handleAddToCompare = useCallback(() => {
    onClose()
    onOpenOptionDiscovery?.()
  }, [onClose, onOpenOptionDiscovery])

  if (loading) {
    return (
      <div className={inspectorShell.panel} aria-busy="true" aria-label="Loading option contract">
        <RightInspectorHeader
          title={symbol || '—'}
          meta="· loading…"
          onClose={onClose}
          closeLabel="Close contract detail"
        />
        <div className={inspectorShell.section}>
          <DiscoveryHint className="" style={{ margin: 0 }}>
            Loading contract detail (Massive snapshots)…
          </DiscoveryHint>
        </div>
      </div>
    )
  }

  return (
    <div className={inspectorShell.panel}>
      {loadError != null && (
        <DiscoveryHint className=" replay-form-error" style={{ margin: '0 0 0.75rem' }} role="alert">
          {loadError}
        </DiscoveryHint>
      )}
      <OptionContractDetailPanel
        symbol={symbol}
        expiration={expirationDisplay}
        underlyingPrice={underlyingPrice}
        selectedRow={selectedRow}
        selectedDerived={selectedDerived}
        snapshotRows={snapshotRows.length > 0 ? snapshotRows : [selectedRow]}
        greeksCoverage={greeksCoverage}
        eventContextWarnings={eventContextWarnings}
        greeksSource={greeksSource}
        onGreeksSourceChange={setGreeksSource}
        liquidityLastTrade={liquidityLastTrade}
        liquidityQuoteCount={liquidityQuoteCount}
        liquidityLoading={liquidityLoading}
        serverLiquidity={serverLiquidity}
        serverRelativeValue={serverRelativeValue}
        onClose={onClose}
        onAddToWatchlist={() => void handleAddToWatchlist(selectedRow)}
        onAddToCompare={handleAddToCompare}
      />
    </div>
  )
}
