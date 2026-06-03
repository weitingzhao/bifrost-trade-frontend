import type { LucideIcon } from 'lucide-react'
import { Hash, SlidersHorizontal } from 'lucide-react'
import {
  groupedCommonFeedChecklistRows,
  groupedOptionFeedChecklistRows,
  shortServiceLabel as optionShortLabel,
} from '../checklist/optionStatus'
import {
  groupedStockChecklistRows,
  shortServiceLabel as stockShortLabel,
} from '../checklist/stockStatus'
import type { CapabilityGroup, ChecklistRow } from '../checklist/types'
import { CAPABILITY_GROUP_LABELS } from '../checklist/types'
import {
  feedMassiveCommonSvcAnchorId,
  feedMassiveOptionSvcAnchorId,
  feedMassiveStockSvcAnchorId,
  MASSIVE_COMM_BASE,
  MASSIVE_OPTION_BASE,
  MASSIVE_STOCK_BASE,
  massiveStockCapTo,
} from './anchors'

export interface MassiveCapNavLeaf {
  id: string
  label: string
  to: string
}

export interface MassiveCapNavGroup {
  group: CapabilityGroup
  label: string
  leaves: MassiveCapNavLeaf[]
}

export interface MassiveFeedNavBranch {
  id: 'stock' | 'option' | 'comm'
  label: string
  basePath: string
  icon: LucideIcon
  groups: MassiveCapNavGroup[]
}

function mapRows(
  basePath: string,
  anchorFn: (id: string) => string,
  rows: ChecklistRow[],
  shortLabel: (row: ChecklistRow) => string,
): MassiveCapNavLeaf[] {
  return rows.map(row => ({
    id: row.id,
    label: shortLabel(row),
    to: massiveStockCapTo(basePath, anchorFn(row.id)),
  }))
}

function buildGroups(
  basePath: string,
  anchorFn: (id: string) => string,
  grouped: { group: CapabilityGroup; rows: ChecklistRow[] }[],
  shortLabel: (row: ChecklistRow) => string,
): MassiveCapNavGroup[] {
  return grouped.map(({ group, rows }) => ({
    group,
    label: CAPABILITY_GROUP_LABELS[group],
    leaves: mapRows(basePath, anchorFn, rows, shortLabel),
  }))
}

export const MASSIVE_FEED_BRANCHES: MassiveFeedNavBranch[] = [
  {
    id: 'stock',
    label: 'Stock',
    basePath: MASSIVE_STOCK_BASE,
    icon: SlidersHorizontal,
    groups: buildGroups(
      MASSIVE_STOCK_BASE,
      feedMassiveStockSvcAnchorId,
      groupedStockChecklistRows(),
      stockShortLabel,
    ),
  },
  {
    id: 'option',
    label: 'Option',
    basePath: MASSIVE_OPTION_BASE,
    icon: Hash,
    groups: buildGroups(
      MASSIVE_OPTION_BASE,
      feedMassiveOptionSvcAnchorId,
      groupedOptionFeedChecklistRows(),
      optionShortLabel,
    ),
  },
  {
    id: 'comm',
    label: 'Comm',
    basePath: MASSIVE_COMM_BASE,
    icon: Hash,
    groups: buildGroups(
      MASSIVE_COMM_BASE,
      feedMassiveCommonSvcAnchorId,
      groupedCommonFeedChecklistRows(),
      optionShortLabel,
    ),
  },
]
