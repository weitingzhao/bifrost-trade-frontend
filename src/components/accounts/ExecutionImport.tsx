import { useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { postTwsFetch, postFlexFetch, postFlexUpload } from '@/api/trading'
import { formatLastUpdate } from '@/utils/positions'
import { cn } from '@/lib/utils'
import type { FlexFetchPerQuery } from '@/types/trading'

type TwsDays = 1 | 3 | 7

interface FlexResult {
  summary: string
  isError: boolean
  perQuery?: FlexFetchPerQuery[]
}

interface Props {
  accountsFetchedAt?: number | null
  hasAccounts: boolean
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

const pillGroupClass =
  'inline-flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1.5 min-h-[30px]'

export function ExecutionImport({ accountsFetchedAt, hasAccounts }: Props) {
  const [twsDays, setTwsDays] = useState<TwsDays>(1)
  const [twsLoading, setTwsLoading] = useState(false)
  const [twsResult, setTwsResult] = useState<{ msg: string; isError: boolean } | null>(null)

  const [flexUseUpload, setFlexUseUpload] = useState(false)
  const [flexLoading, setFlexLoading] = useState(false)
  const [flexResult, setFlexResult] = useState<FlexResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const busy = twsLoading || flexLoading

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

  return (
    <section aria-label="Execution import from Tws and Flex" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={pillGroupClass}
          role="radiogroup"
          aria-label="Execution fetch time range"
        >
          <RadioGroup
            value={String(twsDays)}
            onValueChange={(v) => setTwsDays(Number(v) as TwsDays)}
            className="flex flex-wrap items-center gap-3"
            disabled={busy}
          >
            {([1, 3, 7] as TwsDays[]).map((d) => (
              <label key={d} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <RadioGroupItem value={String(d)} className="h-3 w-3" />
                <span>{d === 1 ? 'Today' : `Last ${d} days`}</span>
              </label>
            ))}
          </RadioGroup>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleTwsFetch}
            disabled={busy}
            aria-label="Fetch executions from IB Tws and write to DB"
          >
            <RefreshCw className={cn('h-3 w-3', twsLoading && 'animate-spin')} />
            {twsLoading ? 'Fetching…' : 'Tws Refresh'}
          </Button>
        </div>

        {hasAccounts && (
          <>
            <Separator orientation="vertical" className="hidden sm:block h-7" />
            <div
              className={pillGroupClass}
              role="group"
              aria-label="Flex executions import"
            >
              <div className="flex items-center gap-2">
                <Switch
                  checked={flexUseUpload}
                  onCheckedChange={setFlexUseUpload}
                  disabled={busy}
                  id="flex-upload-toggle"
                  className="scale-90"
                />
                <label htmlFor="flex-upload-toggle" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                  Use local Flex XML
                </label>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={flexUseUpload ? handleFlexUploadClick : handleFlexFetch}
                disabled={busy}
              >
                <RefreshCw className={cn('h-3 w-3', flexLoading && 'animate-spin')} />
                {flexLoading ? 'Fetching…' : 'Flex Refresh'}
              </Button>
            </div>
          </>
        )}
      </div>

      {twsLoading && (
        <p className="text-xs text-muted-foreground">Fetching executions from IB…</p>
      )}

      {twsResult && (
        <p className={cn('text-xs', twsResult.isError ? 'text-destructive' : 'text-success')}>
          {twsResult.msg}
        </p>
      )}

      {flexResult && (
        <div className="space-y-1">
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

      {accountsFetchedAt != null && (
        <p className="text-xs text-muted-foreground">
          Data from {new Date(accountsFetchedAt * 1000).toLocaleString()}
          {', '}
          {formatLastUpdate(accountsFetchedAt)}
        </p>
      )}

      <input ref={fileRef} type="file" accept=".xml" className="hidden" onChange={handleFileSelected} />
    </section>
  )
}
