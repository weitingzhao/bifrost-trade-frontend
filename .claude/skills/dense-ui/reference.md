# Dense UI — Reference

## Tokens (`src/index.css`)

| Token | Typical use |
|-------|-------------|
| `--text-dense` | Table body text |
| `--text-dense-meta` | Captions, secondary labels |
| `--table-cell-py` / `--table-cell-px` | Cell padding (via `denseTableCellPadding`) |

## Import cheat sheet

```tsx
import {
  DenseDataTable,
  DenseTableHeader,
  DenseTableBody,
  DenseTableHeadRow,
  DenseTableHead,
  DenseTableRow,
  DenseTableCell,
  DenseTableSubheadRow,
  DenseTableDetailRow,
  denseTableNumCell,
  GroupHeaderRow,
  NestedDenseTable,
  PnlCell,
  InlinePnl,
  IconActionButton,
  ExpandToggleCell,
  SegmentControl,
  IncludeExcludeToggle,
  CollapsibleGroup,
  CollapsibleGroupHeader,
  CollapsibleGroupBody,
  CollapsibleGroupStats,
  CollapsibleChevron,
  CollapsibleBucketHeader,
  SymbolLinkButton,
  denseTable,
} from '@/components/data-display'

import { pnlColorClass } from '@/utils/dailyChange'
```

## Semantic constants (`denseTable`)

- `denseTable.sectionTitle` — subsection heading above a table
- `denseTable.emptyHint` — no-data message
- `denseTable.sortableHead` — clickable column header
- `denseTable.mutedMeta` — inline meta text

## Verification

```bash
npm run lint
npm run build
npm run check:legacy-css
```

## Deprecated shims (do not use in new code)

- `src/components/positions/ui.tsx`
- `src/components/positions/denseTableClasses.ts`
- `src/components/positions/positionsControlClasses.ts`

Import directly from `@/components/data-display`.
