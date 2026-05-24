import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useExecutionsFreshness } from '@/hooks/useExecutionsFreshness'
import { postTwsFetch, postFlexFetch, postFlexUpload } from '@/api/trading'
import { fmtExecDaysAgo, formatLastUpdate } from '@/utils/positions'
import { cn } from '@/lib/utils'
import type { FlexFetchPerQuery } from '@/types/trading'

type TwsDays = 1 | 3 | 7

interface FlexResult {
  summary: string
  isError: boolean
  perQuery?: FlexFetchPerQuery[]
  dataSpan?: string
}

interface Props {
  accountsFetchedAt?: number | null
}

function buildFlexSuccessMessage(r: {
  count: number
  raw_count?: number
  updated_accounts?: number
  data_from?: string | null
  data_to?: string | null
  range_from?: string | null
  range_to?: string | null
  last_flex_date_after?: string | null
  message?: string
}): string {
  const parts: string[] = []
  const n = r.count ?? 0
  const accCount = r.updated_accounts ?? 0
  if (n > 0) {
    parts.push(`Upserted ${n} execution(s) from IB Flex for ${accCount} account(s).`)
  } else {
    parts.push('Fetched 0 executions from IB Flex (no new trades written to DB).')
  }
  if (r.raw_count != null && r.raw_count >= 0) {
    parts.push(`Flex report had ${r.raw_count} row(s).`)
  }
  if (r.data_from && r.data_to) {
    parts.push(`Data span: ${r.data_from} – ${r.data_to}.`)
  }
  if (r.range_from && r.range_to) {
    parts.push(`Request range: ${r.range_from} – ${r.range_to}.`)
  }
  if (r.last_flex_date_after) {
    parts.push(`Latest Flex date in DB: ${r.last_flex_date_after}.`)
  }
  if (r.message?.trim()) parts.push(r.message.trim())
  return parts.join(' ')
}

export function ExecutionImport({ accountsFetchedAt }: Props) {
  const { data: freshnessData } = useExecutionsFreshness()

  const [twsDays, setTwsDays] = useState<TwsDays>(1)
  const [twsLoading, setTwsLoading] = useState(false)
  const [twsResult, setTwsResult] = useState<{ msg: string; isError: boolean } | null>(null)

  const [flexUseUpload, setFlexUseUpload] = useState(false)
  const [flexLoading, setFlexLoading] = useState(false)
  const [flexResult, setFlexResult] = useState<FlexResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleTwsFetch() {
    setTwsLoading(true)
    setTwsResult(null)
    try {
      const r = await postTwsFetch(twsDays)
      setTwsResult({
        msg: r.ok
          ? `Fetched ${r.fetched_total} execution(s). ${r.message ?? ''}`.trim()
          : (r.error ?? 'Error'),
        isError: !r.ok,
      })
    } catch (e) {
      setTwsResult({ msg: (e as Error).message, isError: true })
    } finally {
      setTwsLoading(false)
    }
  }

  async function handleFlexFetch() {
    setFlexLoading(true)
    setFlexResult(null)
    try {
      const r = await postFlexFetch()
      if (r.ok) {
        setFlexResult({
          summary: buildFlexSuccessMessage(r),
          isError: false,
          perQuery: r.per_query?.length ? r.per_query : undefined,
          dataSpan: r.data_from && r.data_to ? `${r.data_from} – ${r.data_to}` : undefined,
        })
      } else {
        const parts: string[] = [r.error ?? 'Failed to fetch from IB Flex.']
        if (r.raw_count != null && r.raw_count > 0) parts.push(`Flex report had ${r.raw_count} row(s).`)
        if (r.data_from && r.data_to) parts.push(`Data span: ${r.data_from} – ${r.data_to}.`)
        setFlexResult({ summary: parts.join(' '), isError: true, perQuery: r.per_query?.length ? r.per_query : undefined })
      }
    } catch (e) {
      setFlexResult({ summary: (e as Error).message, isError: true })
    } finally {
      setFlexLoading(false)
    }
  }

  function handleFlexUploadClick() {
    fileRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFlexLoading(true)
    setFlexResult(null)
    try {
      const xml = await file.text()
      const r = await postFlexUpload(xml)
      setFlexResult({
        summary: r.ok
          ? `Imported ${r.count} trade(s) from XML.${r.message ? ` ${r.message}` : ''}`
          : (r.error ?? 'Error'),
        isError: !r.ok,
      })
    } catch (e) {
      setFlexResult({ summary: (e as Error).message, isError: true })
    } finally {
      setFlexLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const freshnessItems = freshnessData?.items ?? []
  const accountIds = [...new Set(freshnessItems.map((i) => i.account_id))]

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4 text-sm">
      {/* Data freshness table */}
      {accountIds.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Data Freshness
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>IB Flex</TableHead>
                <TableHead>IB Stream</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountIds.map((aid) => {
                const flexItem = freshnessItems.find(
                  (i) => i.account_id === aid && i.source === 'flex_trades'
                )
                const streamItems = freshnessItems.filter(
                  (i) => i.account_id === aid && i.source !== 'flex_trades'
                )
                const streamBest = streamItems.reduce<typeof streamItems[0] | null>(
                  (best, r) => (best == null || (r.latest_exec_ts ?? 0) > (best.latest_exec_ts ?? 0) ? r : best),
                  null
                )
                return (
                  <TableRow key={aid}>
                    <TableCell className="font-mono text-xs">{aid}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtExecDaysAgo(flexItem?.days_since_latest)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtExecDaysAgo(streamBest?.days_since_latest)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <Separator className="mt-4" />
        </div>
      )}

      <div className="flex flex-wrap gap-6">
        {/* TWS Fetch */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            TWS Execution Fetch
          </p>
          <RadioGroup
            value={String(twsDays)}
            onValueChange={(v) => setTwsDays(Number(v) as TwsDays)}
            className="flex gap-4"
            disabled={twsLoading}
          >
            {([1, 3, 7] as TwsDays[]).map((d) => (
              <label key={d} className="flex items-center gap-1.5 cursor-pointer">
                <RadioGroupItem value={String(d)} />
                <span className="text-sm">{d === 1 ? 'Today' : `Last ${d} days`}</span>
              </label>
            ))}
          </RadioGroup>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleTwsFetch} disabled={twsLoading}>
              {twsLoading ? 'Fetching…' : 'Tws Refresh'}
            </Button>
            {twsResult && (
              <span className={cn('text-xs', twsResult.isError ? 'text-destructive' : 'text-success')}>
                {twsResult.msg}
              </span>
            )}
          </div>
        </div>

        <Separator orientation="vertical" className="h-auto" />

        {/* Flex Fetch */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Flex Execution Import
          </p>
          <div className="flex items-center gap-2">
            <Switch
              checked={flexUseUpload}
              onCheckedChange={setFlexUseUpload}
              disabled={flexLoading}
              id="flex-upload-toggle"
            />
            <label htmlFor="flex-upload-toggle" className="text-sm cursor-pointer">
              Use local Flex XML
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={flexUseUpload ? handleFlexUploadClick : handleFlexFetch}
              disabled={flexLoading}
            >
              {flexLoading ? 'Fetching…' : 'Flex Refresh'}
            </Button>
          </div>
          {flexResult && (
            <div className="space-y-1 mt-1">
              <p className={cn('text-xs', flexResult.isError ? 'text-destructive' : 'text-success')}>
                {flexResult.summary}
              </p>
              {flexResult.perQuery && flexResult.perQuery.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-0.5 pl-2 border-l border-muted">
                  {flexResult.perQuery.map((q) => {
                    const role =
                      q.role === 'host' || q.role === 'primary' ? 'Host'
                      : q.role === 'secondary' ? 'Secondary'
                      : 'Flex'
                    const span = q.data_from && q.data_to ? ` · ${q.data_from} – ${q.data_to}` : ''
                    return (
                      <p key={q.query_id}>
                        {role}{q.label ? ` ${q.label}` : ''} [{q.query_id}]: {q.rows} row(s){span}
                      </p>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept=".xml" className="hidden" onChange={handleFileSelected} />
        </div>
      </div>

      {/* Inline accounts data freshness timestamp */}
      {accountsFetchedAt != null && (
        <p className="text-xs text-muted-foreground">
          Accounts data from {new Date(accountsFetchedAt * 1000).toLocaleString()}
          {' · '}{formatLastUpdate(accountsFetchedAt)} ago
        </p>
      )}
    </div>
  )
}
