import { useMemo, useState, useRef, useCallback } from 'react'
import { Trash2, RefreshCw, Plus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useQuotes } from '@/hooks/useQuotes'
import { useBenchmarks } from '@/hooks/useBenchmarks'
import { postWatchlistItem, deleteWatchlistItem } from '@/api/market'
import type { WatchlistItem, QuoteItem, DailyBenchmark } from '@/types/market'

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '—'
  return `$${n.toFixed(2)}`
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

function fmtAge(ts: number | null | undefined): string {
  if (ts == null) return '—'
  const s = Math.floor(Date.now() / 1000 - ts)
  if (s < 0) return '0s'
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}

function pnlClass(n: number | null | undefined): string {
  if (n == null) return 'text-muted-foreground'
  return n > 0.001 ? 'text-green-600 dark:text-green-400' : n < -0.001 ? 'text-red-500' : 'text-muted-foreground'
}

function computeDailyPct(last: number | null, bench: DailyBenchmark | undefined): number | null {
  const prev = bench?.prev_close ?? null
  if (last == null || prev == null || prev === 0) return null
  return (last - prev) / prev * 100
}

interface GroupedItems {
  category: string
  items: WatchlistItem[]
}

function groupByCategory(items: WatchlistItem[]): GroupedItems[] {
  const map = new Map<string, WatchlistItem[]>()
  for (const item of items) {
    const key = item.category ?? 'Uncategorized'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  const result: GroupedItems[] = []
  if (map.has('Uncategorized')) {
    result.push({ category: 'Uncategorized', items: map.get('Uncategorized')! })
    map.delete('Uncategorized')
  }
  for (const [cat, catItems] of Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    result.push({ category: cat, items: catItems })
  }
  return result
}

interface WatchlistRowProps {
  item: WatchlistItem
  quote: QuoteItem | undefined
  bench: DailyBenchmark | undefined
  onToggleOptionable: (item: WatchlistItem, val: boolean) => void
  onDelete: (item: WatchlistItem) => void
  deleting: boolean
}

function WatchlistRow({ item, quote, bench, onToggleOptionable, onDelete, deleting }: WatchlistRowProps) {
  const last = quote?.last ?? null
  const dailyPct = computeDailyPct(last, bench)

  return (
    <TableRow className={cn(deleting && 'opacity-40')}>
      <TableCell className="font-mono text-sm font-medium">{item.symbol}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-[10px] font-mono">
          {item.sec_type}
        </Badge>
      </TableCell>
      <TableCell>
        <button
          type="button"
          onClick={() => onToggleOptionable(item, !item.optionable)}
          className={cn(
            'text-[10px] px-2 py-0.5 rounded-full border transition-colors',
            item.optionable
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:border-foreground/40',
          )}
        >
          {item.optionable ? 'ON' : 'OFF'}
        </button>
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {fmtPrice(last)}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-muted-foreground">
        {quote?.bid != null && quote?.ask != null
          ? `${fmtPrice(quote.bid)} / ${fmtPrice(quote.ask)}`
          : '—'}
      </TableCell>
      <TableCell className={cn('text-right font-mono text-xs font-medium', pnlClass(dailyPct))}>
        {fmtPct(dailyPct)}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-muted-foreground">
        {fmtAge(quote?.timestamp)}
      </TableCell>
      <TableCell className="p-1 w-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(item)}
          disabled={deleting}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

export default function WatchlistPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useWatchlist()
  const [deletingKeys, setDeletingKeys] = useState<Set<string>>(new Set())
  const [addInput, setAddInput] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = useMemo(() => data?.items ?? [], [data])

  const allSymbols = useMemo(
    () => Array.from(new Set(items.map((i) => i.symbol.toUpperCase()))),
    [items],
  )

  const { data: quotesData } = useQuotes(allSymbols)
  const { data: benchData } = useBenchmarks(allSymbols)

  const quoteMap = useMemo(() => {
    const m: Record<string, QuoteItem> = {}
    for (const q of quotesData?.quotes ?? []) {
      if (q.symbol) m[q.symbol.toUpperCase()] = q
    }
    return m
  }, [quotesData])

  const benchMap = benchData?.benchmarks ?? {}

  const groups = useMemo(() => groupByCategory(items), [items])

  const handleAdd = useCallback(async () => {
    const raw = addInput.trim().toUpperCase()
    if (!raw) return
    const ck = raw.includes('|') ? raw : `${raw}|STK|||`
    const sym = raw.includes('|') ? raw.split('|')[0] : raw
    setIsAdding(true)
    try {
      await postWatchlistItem({ contract_key: ck, symbol: sym, sec_type: 'STK', source: 'manual' })
      setAddInput('')
      queryClient.invalidateQueries({ queryKey: ['market', 'watchlist'] })
    } finally {
      setIsAdding(false)
    }
  }, [addInput, queryClient])

  const handleToggleOptionable = useCallback(async (item: WatchlistItem, val: boolean) => {
    await postWatchlistItem({ contract_key: item.contract_key, optionable: val })
    queryClient.invalidateQueries({ queryKey: ['market', 'watchlist'] })
  }, [queryClient])

  const handleDelete = useCallback(async (item: WatchlistItem) => {
    setDeletingKeys((prev) => new Set(prev).add(item.contract_key))
    try {
      await deleteWatchlistItem(item.contract_key)
      queryClient.invalidateQueries({ queryKey: ['market', 'watchlist'] })
    } finally {
      setDeletingKeys((prev) => {
        const next = new Set(prev)
        next.delete(item.contract_key)
        return next
      })
    }
  }, [queryClient])

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Watchlist</h1>
          <span className="text-xs text-muted-foreground">{items.length} symbols</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              placeholder="AAPL"
              className="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm font-mono uppercase placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button size="sm" variant="outline" onClick={handleAdd} disabled={isAdding || !addInput.trim()}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['market', 'watchlist'] })}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {groups.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground py-4">
          No symbols in watchlist. Type a symbol above and press Enter to add one.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.category} className="space-y-1">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {group.category}
            </span>
            <span className="text-xs text-muted-foreground">({group.items.length})</span>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Symbol</TableHead>
                  <TableHead className="w-16">Type</TableHead>
                  <TableHead className="w-16">Opt</TableHead>
                  <TableHead className="text-right w-24">Last</TableHead>
                  <TableHead className="text-right w-36">Bid / Ask</TableHead>
                  <TableHead className="text-right w-20">Daily%</TableHead>
                  <TableHead className="text-right w-20">Updated</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.items.map((item) => (
                  <WatchlistRow
                    key={item.contract_key}
                    item={item}
                    quote={quoteMap[item.symbol.toUpperCase()]}
                    bench={benchMap[item.symbol.toUpperCase()]}
                    onToggleOptionable={handleToggleOptionable}
                    onDelete={handleDelete}
                    deleting={deletingKeys.has(item.contract_key)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  )
}
