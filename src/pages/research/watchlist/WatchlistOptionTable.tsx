import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DenseDataTable,
  DenseLinkButton,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  IconActionButton,
  denseTableNumCell,
} from '@/components/data-display'
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

export interface WatchlistOptionTableProps {
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

export function WatchlistOptionTable({
  items,
  categories,
  quoteBySymbol,
  quoteByContractKey,
  hasPosition,
  onSymbolClick,
  onCategoryChange,
  onRemove,
  symbolFromItem,
}: WatchlistOptionTableProps) {
  if (items.length === 0) return null

  return (
    <DenseDataTable>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Symbol</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Last / B·A</DenseTableHead>
          <DenseTableHead>Expiry</DenseTableHead>
          <DenseTableHead className="w-10">R</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Strike</DenseTableHead>
          <DenseTableHead>Category</DenseTableHead>
          <DenseTableHead className="w-10" />
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {items.map(item => {
          const und = symbolFromItem(item)
          const q = quoteByContractKey[item.contract_key] ?? quoteBySymbol[und.toUpperCase()]
          const held = hasPosition(item)
          const right = (item.option_right || '').toUpperCase()
          const isCall = right === 'C' || right === 'CALL'
          const label = item.symbol || watchlistItemLabel(item)

          return (
            <DenseTableRow key={item.contract_key}>
              <DenseTableCell>
                <div className="flex items-center gap-1.5">
                  <DenseLinkButton
                    label={label}
                    onClick={() => onSymbolClick(item)}
                    ariaLabel={`Open inspector for ${label}`}
                    variant="option"
                    className="text-sm"
                  />
                  {held && (
                    <DenseTag variant="neutral" size="cell">
                      H
                    </DenseTag>
                  )}
                </div>
              </DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                <QuoteCell quote={q} />
              </DenseTableCell>
              <DenseTableCell className="font-mono text-xs">{formatExpiry(item.expiry)}</DenseTableCell>
              <DenseTableCell>
                <DenseTag variant={isCall ? 'success' : 'danger'} size="cell">
                  {formatOptionRight(item.option_right)}
                </DenseTag>
              </DenseTableCell>
              <DenseTableCell className={cn(denseTableNumCell, 'font-mono text-xs')}>
                {formatStrike(item.strike)}
              </DenseTableCell>
              <DenseTableCell>
                <Select
                  value={item.category_id != null ? String(item.category_id) : 'none'}
                  onValueChange={v => onCategoryChange(item, v === 'none' ? null : Number(v))}
                >
                  <SelectTrigger className="h-7 w-[130px] text-xs">
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
              </DenseTableCell>
              <DenseTableCell>
                <IconActionButton
                  onClick={() => onRemove(item)}
                  title="Remove from watchlist"
                  ariaLabel="Remove from watchlist"
                  tone="danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconActionButton>
              </DenseTableCell>
            </DenseTableRow>
          )
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}
