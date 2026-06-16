import { useCallback, useMemo, useState } from 'react'
import { SegmentControl } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import {
  fetchMassiveMarketConditions,
  fetchMassiveMarketExchanges,
  fetchMassiveMarketHolidays,
  fetchMassiveMarketStatus,
  type MassiveMarketHolidaysResponse,
} from '@/api/massive/commFeed'
import { feedMassiveCommonSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import { MO_SEGMENT_OPTS, type MoSubTabKey } from '@/pages/settings/feed/massive/comm/commTiMoConstants'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'

function MoTabDoc({ sub }: { sub: MoSubTabKey }) {
  if (sub === 'exchanges') {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Use case:</strong> List exchanges and metadata (MIC, type, locale).
        </p>
        <p className="font-mono text-xs">REST: GET /v3/reference/exchanges</p>
      </div>
    )
  }
  if (sub === 'market_holidays') {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Use case:</strong> Upcoming holidays from Massive API vs local{' '}
          <code className="font-mono text-xs">reference_us_holidays</code>.
        </p>
        <p className="font-mono text-xs">REST: GET /v1/marketstatus/upcoming</p>
      </div>
    )
  }
  if (sub === 'market_status') {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Use case:</strong> Real-time trading status across Massive-tracked
          markets.
        </p>
        <p className="font-mono text-xs">GET /v1/marketstatus/now — proxy GET /research/massive/market-ops/status</p>
      </div>
    )
  }
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <p>
        <strong className="text-foreground">Use case:</strong> Trade/quote condition codes across asset classes.
      </p>
      <p className="font-mono text-xs">REST: GET /v3/reference/conditions</p>
    </div>
  )
}

export function CommMarketOpsSection({
  row,
  effectiveStatus,
  expanded,
  highlighted,
  onToggle,
  configured,
}: {
  row: ChecklistRow
  effectiveStatus: EffectiveServiceStatus
  expanded: boolean
  highlighted?: boolean
  onToggle: () => void
  configured: boolean
}) {
  const [sub, setSub] = useState<MoSubTabKey>('exchanges')
  const [condAsset, setCondAsset] = useState('')
  const [condDataType, setCondDataType] = useState('')
  const [exchAsset, setExchAsset] = useState('')
  const [exchLocale, setExchLocale] = useState('')
  const [condBusy, setCondBusy] = useState(false)
  const [exchBusy, setExchBusy] = useState(false)
  const [holBusy, setHolBusy] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [condErr, setCondErr] = useState<string | null>(null)
  const [exchErr, setExchErr] = useState<string | null>(null)
  const [holErr, setHolErr] = useState<string | null>(null)
  const [statusErr, setStatusErr] = useState<string | null>(null)
  const [condResults, setCondResults] = useState<Record<string, unknown>[] | null>(null)
  const [exchResults, setExchResults] = useState<Record<string, unknown>[] | null>(null)
  const [holData, setHolData] = useState<MassiveMarketHolidaysResponse | null>(null)
  const [statusData, setStatusData] = useState<Record<string, unknown> | null>(null)

  const evidence = useMemo(() => {
    if (exchResults && exchResults.length > 0) return `Exchanges: ${exchResults.length} result(s).`
    if (holData?.ok) return `Massive holidays: ${holData.massive_count ?? 0}, local: ${holData.local_count ?? 0}.`
    if (statusData) return 'Market status loaded.'
    if (condResults && condResults.length > 0) return `Condition Codes: ${condResults.length} result(s).`
    return 'No data loaded. Use any tab to fetch.'
  }, [exchResults, holData, statusData, condResults])

  const runConditions = useCallback(async () => {
    setCondBusy(true)
    setCondErr(null)
    try {
      const res = await fetchMassiveMarketConditions({
        asset_class: condAsset || undefined,
        data_type: condDataType || undefined,
      })
      if (!res.ok) {
        setCondErr(res.error ?? 'Failed')
        return
      }
      setCondResults(res.results)
    } catch (e: unknown) {
      setCondErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setCondBusy(false)
    }
  }, [condAsset, condDataType])

  const runExchanges = useCallback(async () => {
    setExchBusy(true)
    setExchErr(null)
    try {
      const res = await fetchMassiveMarketExchanges({
        asset_class: exchAsset || undefined,
        locale: exchLocale || undefined,
      })
      if (!res.ok) {
        setExchErr(res.error ?? 'Failed')
        return
      }
      setExchResults(res.results)
    } catch (e: unknown) {
      setExchErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setExchBusy(false)
    }
  }, [exchAsset, exchLocale])

  const runHolidays = useCallback(async () => {
    setHolBusy(true)
    setHolErr(null)
    try {
      const res = await fetchMassiveMarketHolidays()
      if (!res.ok) {
        setHolErr(res.error ?? 'Failed')
        return
      }
      setHolData(res)
    } catch (e: unknown) {
      setHolErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setHolBusy(false)
    }
  }, [])

  const runStatus = useCallback(async () => {
    setStatusBusy(true)
    setStatusErr(null)
    try {
      const res = await fetchMassiveMarketStatus()
      if (!res.ok) {
        setStatusErr(res.error ?? 'Failed')
        return
      }
      setStatusData(res.status ?? null)
    } catch (e: unknown) {
      setStatusErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setStatusBusy(false)
    }
  }, [])

  return (
    <MassiveServicePanel
      row={row}
      effectiveStatus={effectiveStatus}
      expanded={expanded}
      highlighted={highlighted}
      onToggle={onToggle}
      anchorId={feedMassiveCommonSvcAnchorId(row.id)}
      evidence={<span>{evidence}</span>}
    >
      <p className="text-sm text-muted-foreground">{row.description}</p>
      <SegmentControl
        ariaLabel="Market Operations REST DocPage rows"
        options={MO_SEGMENT_OPTS}
        value={sub}
        onChange={v => setSub(v as MoSubTabKey)}
        className="mb-3"
      />
      <MoTabDoc sub={sub} />

      {sub === 'exchanges' ? (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-3 max-w-md">
            <div className="space-y-1">
              <Label>Asset class</Label>
              <Select value={exchAsset || '__all__'} onValueChange={v => setExchAsset(v === '__all__' ? '' : v)} disabled={exchBusy}>
                <SelectTrigger className="h-9 min-w-[8rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="options">Options</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="fx">FX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Locale</Label>
              <Select value={exchLocale || '__all__'} onValueChange={v => setExchLocale(v === '__all__' ? '' : v)} disabled={exchBusy}>
                <SelectTrigger className="h-9 min-w-[8rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="us">US</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="secondary" size="sm" disabled={exchBusy || !configured} onClick={() => void runExchanges()}>
              {exchBusy ? 'Loading…' : 'Fetch Exchanges'}
            </Button>
          </div>
          {exchErr ? <p className="mt-3 text-sm text-destructive">{exchErr}</p> : null}
          {exchResults ? (
            <div className="mt-3 max-h-80 overflow-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left">ID</th>
                    <th className="px-2 py-1.5 text-left">Name</th>
                    <th className="px-2 py-1.5 text-left">Type</th>
                    <th className="px-2 py-1.5 text-left">MIC</th>
                    <th className="px-2 py-1.5 text-left">Asset Class</th>
                    <th className="px-2 py-1.5 text-left">Locale</th>
                  </tr>
                </thead>
                <tbody>
                  {exchResults.map((ex, i) => (
                    <tr key={i} className="border-t border-border/60">
                      <td className="px-2 py-1">{String(ex.id ?? '')}</td>
                      <td className="px-2 py-1">{String(ex.name ?? '')}</td>
                      <td className="px-2 py-1">{String(ex.type ?? '')}</td>
                      <td className="px-2 py-1">{String(ex.mic ?? '')}</td>
                      <td className="px-2 py-1">{String(ex.asset_class ?? '')}</td>
                      <td className="px-2 py-1">{String(ex.locale ?? '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}

      {sub === 'market_holidays' ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={holBusy || !configured}
            onClick={() => void runHolidays()}
          >
            {holBusy ? 'Loading…' : 'Fetch & Compare Holidays'}
          </Button>
          {holErr ? <p className="mt-3 text-sm text-destructive">{holErr}</p> : null}
          {holData?.ok ? (
            <div className="mt-3 space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium mb-2">Massive holidays ({holData.massive_count ?? 0})</h4>
                  <div className="max-h-72 overflow-auto rounded-md border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-2 py-1.5 text-left">Date</th>
                          <th className="px-2 py-1.5 text-left">Exchange</th>
                          <th className="px-2 py-1.5 text-left">Name</th>
                          <th className="px-2 py-1.5 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holData.massive_holidays.map((h, i) => (
                          <tr key={i} className="border-t border-border/60">
                            <td className="px-2 py-1">{String(h.date ?? '')}</td>
                            <td className="px-2 py-1">{String(h.exchange ?? '')}</td>
                            <td className="px-2 py-1">{String(h.name ?? '')}</td>
                            <td className="px-2 py-1">{String(h.status ?? '')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Local holidays ({holData.local_count ?? 0})</h4>
                  <div className="max-h-72 overflow-auto rounded-md border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-2 py-1.5 text-left">Date</th>
                          <th className="px-2 py-1.5 text-left">Exchange</th>
                          <th className="px-2 py-1.5 text-left">Label</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holData.local_holidays.map((h, i) => (
                          <tr key={i} className="border-t border-border/60">
                            <td className="px-2 py-1">{String(h.holiday_date ?? '')}</td>
                            <td className="px-2 py-1">{String(h.exchange ?? '')}</td>
                            <td className="px-2 py-1">{String(h.label ?? '')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {holData.comparison ? (
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <p className="font-medium">Comparison summary</p>
                  <ul className="mt-2 list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      In both: <strong className="text-foreground">{holData.comparison.in_both.length}</strong> date(s)
                    </li>
                    <li>
                      Massive only: <strong className="text-foreground">{holData.comparison.in_massive_only.length}</strong>
                      {holData.comparison.in_massive_only.length > 0
                        ? ` — ${holData.comparison.in_massive_only.join(', ')}`
                        : ''}
                    </li>
                    <li>
                      Local only: <strong className="text-foreground">{holData.comparison.in_local_only.length}</strong>
                      {holData.comparison.in_local_only.length > 0
                        ? ` — ${holData.comparison.in_local_only.join(', ')}`
                        : ''}
                    </li>
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {sub === 'market_status' ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={statusBusy || !configured}
            onClick={() => void runStatus()}
          >
            {statusBusy ? 'Loading…' : 'Fetch Market Status'}
          </Button>
          {statusErr ? <p className="mt-3 text-sm text-destructive">{statusErr}</p> : null}
          {statusData ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(statusData)
                .filter(([k]) => k !== 'serverTime' && k !== 'server_time')
                .map(([key, val]) => (
                  <div key={key} className="rounded-md border border-border bg-muted/30 p-3">
                    <div className="text-xs text-muted-foreground mb-1">{key.replace(/_/g, ' ')}</div>
                    <div className="text-sm font-semibold">
                      {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '—')}
                    </div>
                  </div>
                ))}
              {statusData.serverTime != null || statusData.server_time != null ? (
                <p className="text-xs text-muted-foreground sm:col-span-full">
                  Server time: {String(statusData.serverTime ?? statusData.server_time ?? '')}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {sub === 'conditions' ? (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-3 max-w-md">
            <div className="space-y-1">
              <Label>Asset class</Label>
              <Select value={condAsset || '__all__'} onValueChange={v => setCondAsset(v === '__all__' ? '' : v)} disabled={condBusy}>
                <SelectTrigger className="h-9 min-w-[8rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="options">Options</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="fx">FX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data type</Label>
              <Select value={condDataType || '__all__'} onValueChange={v => setCondDataType(v === '__all__' ? '' : v)} disabled={condBusy}>
                <SelectTrigger className="h-9 min-w-[8rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="trade">Trade</SelectItem>
                  <SelectItem value="bbo">BBO</SelectItem>
                  <SelectItem value="nbbo">NBBO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="secondary" size="sm" disabled={condBusy || !configured} onClick={() => void runConditions()}>
              {condBusy ? 'Loading…' : 'Fetch Condition Codes'}
            </Button>
          </div>
          {condErr ? <p className="mt-3 text-sm text-destructive">{condErr}</p> : null}
          {condResults ? (
            <div className="mt-3 max-h-80 overflow-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left">ID</th>
                    <th className="px-2 py-1.5 text-left">Type</th>
                    <th className="px-2 py-1.5 text-left">Name</th>
                    <th className="px-2 py-1.5 text-left">Asset Class</th>
                    <th className="px-2 py-1.5 text-left">Data Types</th>
                    <th className="px-2 py-1.5 text-left">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {condResults.map((c, i) => (
                    <tr key={i} className="border-t border-border/60">
                      <td className="px-2 py-1">{String(c.id ?? '')}</td>
                      <td className="px-2 py-1">{String(c.type ?? '')}</td>
                      <td className="px-2 py-1">{String(c.name ?? '')}</td>
                      <td className="px-2 py-1">{String(c.asset_class ?? '')}</td>
                      <td className="px-2 py-1">
                        {Array.isArray(c.data_types) ? (c.data_types as string[]).join(', ') : String(c.data_types ?? '')}
                      </td>
                      <td className="px-2 py-1 max-w-xs whitespace-normal">{String(c.description ?? '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </MassiveServicePanel>
  )
}
