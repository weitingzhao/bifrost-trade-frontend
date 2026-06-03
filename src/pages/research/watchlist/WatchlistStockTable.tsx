import { Plus, Trash2 } from 'lucide-react'
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
  DenseTagButton,
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
import { watchlistItemLabel } from '@/utils/watchlistHelpers'
import { QuoteCell } from './QuoteCell'
import {
  WATCHLIST_STOCK_COL_WIDTHS,
  watchlistCategorySelectClass,
  watchlistOptCellClass,
  watchlistQuoteCellClass,
  watchlistStockTableClass,
} from './watchlistUi'

export interface WatchlistStockTableProps {
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

export function WatchlistStockTable({
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
}: WatchlistStockTableProps) {
  if (items.length === 0) return null

  return (
    <DenseDataTable tableClassName={watchlistStockTableClass}>
      <colgroup>
        <col style={{ width: WATCHLIST_STOCK_COL_WIDTHS.symbol }} />
        <col style={{ width: WATCHLIST_STOCK_COL_WIDTHS.quote }} />
        {!hideOpt && <col style={{ width: WATCHLIST_STOCK_COL_WIDTHS.opt }} />}
        {!hideCategory && <col style={{ width: WATCHLIST_STOCK_COL_WIDTHS.category }} />}
        <col style={{ width: WATCHLIST_STOCK_COL_WIDTHS.actions }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Symbol</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, watchlistQuoteCellClass)}>
            Last / B·A
          </DenseTableHead>
          {!hideOpt && (
            <DenseTableHead className={watchlistOptCellClass}>Opt</DenseTableHead>
          )}
          {!hideCategory && <DenseTableHead>Category</DenseTableHead>}
          <DenseTableHead className="w-0" />
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {items.map(item => {
          const sym = symbolFromItem(item)
          const q = quoteByContractKey[item.contract_key] ?? quoteBySymbol[sym.toUpperCase()]
          const held = hasPosition(item)
          const optOn = item.optionable === true
          const symU = sym.trim().toUpperCase()
          const selU = (selectedSizingSymbol ?? '').trim().toUpperCase()
          const isSelected = Boolean(showSizeBtn && symU && selU === symU)

          return (
            <DenseTableRow
              key={item.contract_key}
              className={cn(
                isSelected && 'bg-primary/10',
                !optOn && !hideOpt && 'opacity-70',
              )}
            >
              <DenseTableCell>
                <div className="flex items-center gap-1.5">
                  <DenseLinkButton
                    label={watchlistItemLabel(item)}
                    onClick={() => onSymbolClick(item, showSizeBtn)}
                    ariaLabel={
                      showSizeBtn
                        ? `Open inspector and sizing for ${watchlistItemLabel(item)}`
                        : `Open inspector for ${watchlistItemLabel(item)}`
                    }
                    variant="stock"
                    className="text-sm"
                  />
                  {held && (
                    <DenseTag variant="neutral" size="cell">
                      H
                    </DenseTag>
                  )}
                </div>
              </DenseTableCell>
              <DenseTableCell className={cn(denseTableNumCell, watchlistQuoteCellClass)}>
                <QuoteCell quote={q} />
              </DenseTableCell>
              {!hideOpt && (
                <DenseTableCell className={watchlistOptCellClass}>
                  <DenseTagButton
                    variant={optOn ? 'success' : 'neutral'}
                    size="cell"
                    onClick={() => onToggleOptionable(item)}
                    aria-label={optOn ? 'Disable options for symbol' : 'Enable options for symbol'}
                  >
                    {optOn ? 'ON' : 'OFF'}
                  </DenseTagButton>
                </DenseTableCell>
              )}
              {!hideCategory && (
                <DenseTableCell>
                  <Select
                    value={item.category_id != null ? String(item.category_id) : 'none'}
                    onValueChange={v =>
                      onCategoryChange(item, v === 'none' ? null : Number(v))
                    }
                  >
                    <SelectTrigger className={watchlistCategorySelectClass}>
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
              )}
              <DenseTableCell>
                <div className="flex items-center justify-end gap-0.5">
                  {onAddOption && (
                    <IconActionButton
                      onClick={() => onAddOption(item)}
                      title="Add option contract"
                      ariaLabel="Add option contract"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </IconActionButton>
                  )}
                  <IconActionButton
                    onClick={() => onRemove(item)}
                    title="Remove from watchlist"
                    ariaLabel="Remove from watchlist"
                    tone="danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconActionButton>
                </div>
              </DenseTableCell>
            </DenseTableRow>
          )
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}
