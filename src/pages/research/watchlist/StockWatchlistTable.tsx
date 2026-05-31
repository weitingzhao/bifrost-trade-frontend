import { Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dangerGhostBtnClass } from '@/lib/uiClasses'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { QuoteItem, WatchlistItem } from '@/types/market'
import type { PositionCategory } from '@/types/portfolio'
import {
  formatExpiry,
  formatOptionRight,
  formatStrike,
  watchlistItemLabel,
} from '@/utils/watchlistHelpers'
import { QuoteCell } from './QuoteCell'
import styles from './watchlist.module.css'

interface StockTableProps {
  items: WatchlistItem[]
  categories: PositionCategory[]
  quoteBySymbol: Record<string, QuoteItem>
  quoteByContractKey: Record<string, QuoteItem>
  hasPosition: (item: WatchlistItem) => boolean
  selectedSizingSymbol?: string | null
  showSizeBtn?: boolean
  hideCategory?: boolean
  hideOpt?: boolean
  onSymbolClick: (item: WatchlistItem, openSizing?: boolean) => void
  onToggleOptionable: (item: WatchlistItem) => void
  onCategoryChange: (item: WatchlistItem, categoryId: number | null) => void
  onRemove: (item: WatchlistItem) => void
  onAddOption?: (item: WatchlistItem) => void
  symbolFromItem: (item: WatchlistItem) => string
}

export function StockWatchlistTable({
  items,
  categories,
  quoteBySymbol,
  quoteByContractKey,
  hasPosition,
  selectedSizingSymbol,
  showSizeBtn,
  hideCategory,
  hideOpt,
  onSymbolClick,
  onToggleOptionable,
  onCategoryChange,
  onRemove,
  onAddOption,
  symbolFromItem,
}: StockTableProps) {
  if (items.length === 0) return null

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table className={styles.compactTable}>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Last / B·A</TableHead>
            {!hideOpt && <TableHead className="w-16">Opt</TableHead>}
            {!hideCategory && <TableHead>Category</TableHead>}
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => {
            const sym = symbolFromItem(item)
            const q = quoteByContractKey[item.contract_key] ?? quoteBySymbol[sym.toUpperCase()]
            const held = hasPosition(item)
            const optOn = item.optionable === true
            const symU = sym.trim().toUpperCase()
            const selU = (selectedSizingSymbol ?? '').trim().toUpperCase()
            const isSelected = Boolean(showSizeBtn && symU && selU === symU)

            return (
              <TableRow
                key={item.contract_key}
                className={cn(
                  isSelected && 'bg-primary/10',
                  !optOn && !hideOpt && 'opacity-70',
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="font-mono text-sm font-medium hover:text-primary text-left"
                      onClick={() => onSymbolClick(item, showSizeBtn)}
                      title={showSizeBtn ? 'Inspector + position sizing' : 'Open inspector'}
                    >
                      {watchlistItemLabel(item)}
                    </button>
                    {held && (
                      <span className="text-[10px] font-bold px-1 rounded bg-muted text-muted-foreground">
                        H
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <QuoteCell quote={q} />
                </TableCell>
                {!hideOpt && (
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onToggleOptionable(item)}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                        optOn
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-foreground/40',
                      )}
                    >
                      {optOn ? 'ON' : 'OFF'}
                    </button>
                  </TableCell>
                )}
                {!hideCategory && (
                  <TableCell>
                    <Select
                      value={item.category_id != null ? String(item.category_id) : 'none'}
                      onValueChange={v =>
                        onCategoryChange(item, v === 'none' ? null : Number(v))
                      }
                    >
                      <SelectTrigger className="h-7 text-xs w-[130px]">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-0.5 justify-end">
                    {onAddOption && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onAddOption(item)}
                        title="Add option contract"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn('h-7 w-7', dangerGhostBtnClass)}
                      onClick={() => onRemove(item)}
                      title="Remove from watchlist"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

interface OptionTableProps {
  items: WatchlistItem[]
  categories: PositionCategory[]
  quoteBySymbol: Record<string, QuoteItem>
  quoteByContractKey: Record<string, QuoteItem>
  hasPosition: (item: WatchlistItem) => boolean
  onSymbolClick: (item: WatchlistItem) => void
  onCategoryChange: (item: WatchlistItem, categoryId: number | null) => void
  onRemove: (item: WatchlistItem) => void
  symbolFromItem: (item: WatchlistItem) => string
}

export function OptionWatchlistTable({
  items,
  categories,
  quoteBySymbol,
  quoteByContractKey,
  hasPosition,
  onSymbolClick,
  onCategoryChange,
  onRemove,
  symbolFromItem,
}: OptionTableProps) {
  if (items.length === 0) return null

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table className={styles.compactTable}>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Last / B·A</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead className="w-10">R</TableHead>
            <TableHead>Strike</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => {
            const und = symbolFromItem(item)
            const q = quoteByContractKey[item.contract_key] ?? quoteBySymbol[und.toUpperCase()]
            const held = hasPosition(item)
            const right = (item.option_right || '').toUpperCase()
            const isCall = right === 'C' || right === 'CALL'

            return (
              <TableRow key={item.contract_key}>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="font-mono text-sm font-medium hover:text-primary text-left"
                      onClick={() => onSymbolClick(item)}
                    >
                      {item.symbol || watchlistItemLabel(item)}
                    </button>
                    {held && (
                      <span className="text-[10px] font-bold px-1 rounded bg-muted">H</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <QuoteCell quote={q} />
                </TableCell>
                <TableCell className="text-xs font-mono">{formatExpiry(item.expiry)}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded',
                      isCall ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400',
                    )}
                  >
                    {formatOptionRight(item.option_right)}
                  </span>
                </TableCell>
                <TableCell className="text-xs font-mono">{formatStrike(item.strike)}</TableCell>
                <TableCell>
                  <Select
                    value={item.category_id != null ? String(item.category_id) : 'none'}
                    onValueChange={v => onCategoryChange(item, v === 'none' ? null : Number(v))}
                  >
                    <SelectTrigger className="h-7 text-xs w-[130px]">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn('h-7 w-7', dangerGhostBtnClass)}
                    onClick={() => onRemove(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
