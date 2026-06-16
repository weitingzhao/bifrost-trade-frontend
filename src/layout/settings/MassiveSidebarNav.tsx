import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMassiveStatus } from '@/pages/settings/feed/massive/hooks/useMassiveStatus'
import {
  tierOkForRow as optionTierOk,
  tradesOkForRow as optionTradesOk,
  effectiveChecklistProjectStatus as optionEffective,
} from '@/pages/settings/feed/massive/checklist/optionStatus'
import {
  tierOkForRow as stockTierOk,
  tradesOkForRow as stockTradesOk,
  effectiveChecklistProjectStatus as stockEffective,
} from '@/pages/settings/feed/massive/checklist/stockStatus'
import { OPTION_CHECKLIST_ROWS } from '@/pages/settings/feed/massive/checklist/optionChecklistRows'
import { STOCK_CHECKLIST_ROWS } from '@/pages/settings/feed/massive/checklist/stockChecklistRows'
import type { ChecklistRow } from '@/pages/settings/feed/massive/checklist/types'
import { CapabilityStatusDot } from '@/pages/settings/feed/massive/components/CapabilityStatusDot'
import {
  MASSIVE_OVERVIEW_BASE,
  parseHashAnchor,
  isMassiveFeedPath,
} from '@/pages/settings/feed/massive/nav/anchors'
import { MASSIVE_FEED_BRANCHES, type MassiveFeedNavBranch } from '@/pages/settings/feed/massive/nav/massiveSidebarConfig'

const ROW_LOOKUP: Record<MassiveFeedNavBranch['id'], ChecklistRow[]> = {
  stock: STOCK_CHECKLIST_ROWS,
  option: OPTION_CHECKLIST_ROWS.filter(r => !['technical-indicators', 'market-ops'].includes(r.id)),
  comm: OPTION_CHECKLIST_ROWS.filter(r => ['technical-indicators', 'market-ops'].includes(r.id)),
}

function rowStatus(
  branchId: MassiveFeedNavBranch['id'],
  rowId: string,
  configured: boolean,
  massiveStatus: ReturnType<typeof useMassiveStatus>['data'],
) {
  const row = ROW_LOOKUP[branchId].find(r => r.id === rowId)
  if (!row) return 'not-implemented' as const
  if (branchId === 'stock') {
    const tierOk = stockTierOk(row, massiveStatus ?? null, configured)
    const tradesOk = stockTradesOk(row, massiveStatus ?? null)
    return stockEffective(row, configured, tierOk, tradesOk)
  }
  const tierOk = optionTierOk(row, massiveStatus ?? null, configured)
  const tradesOk = optionTradesOk(row, massiveStatus ?? null)
  return optionEffective(row, configured, tierOk, tradesOk)
}

function capLinkActive(pathname: string, hash: string, to: string): boolean {
  const [path, frag] = to.split('#')
  if (pathname !== path) return false
  if (!frag) return hash === '' || hash === frag
  return hash === frag
}

export function MassiveSidebarNav() {
  const location = useLocation()
  const { data: massiveStatus } = useMassiveStatus()
  const configured = Boolean(massiveStatus?.configured)
  const hash = parseHashAnchor(location.hash)
  const onMassive = isMassiveFeedPath(location.pathname)
  const onOverview = location.pathname === MASSIVE_OVERVIEW_BASE

  const [massiveManual, setMassiveManual] = useState<boolean | undefined>(undefined)
  const [branchManual, setBranchManual] = useState<Record<string, boolean | undefined>>({})
  const [groupManual, setGroupManual] = useState<Record<string, boolean | undefined>>({})

  const massiveExpanded = massiveManual ?? onMassive

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1">
        <NavLink
          to={MASSIVE_OVERVIEW_BASE}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            onOverview
              ? 'bg-background font-medium text-foreground shadow-sm'
              : onMassive
                ? 'font-medium text-foreground'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
          )}
        >
          <Globe className="h-3.5 w-3.5 shrink-0 text-sidebar-primary" />
          <span className="truncate">Massive</span>
        </NavLink>
        <button
          type="button"
          className="shrink-0 rounded p-0.5 hover:bg-background/60"
          onClick={() => setMassiveManual(o => !(o ?? onMassive))}
          aria-expanded={massiveExpanded}
          aria-label={massiveExpanded ? 'Collapse Massive feeds' : 'Expand Massive feeds'}
        >
          {massiveExpanded ? (
            <ChevronDown className="h-3 w-3 opacity-50" />
          ) : (
            <ChevronRight className="h-3 w-3 opacity-50" />
          )}
        </button>
      </div>

      {massiveExpanded && (
        <div className="ml-2 space-y-1 border-l border-border/60 pl-2">
          {MASSIVE_FEED_BRANCHES.map(branch => {
            const branchActive = location.pathname === branch.basePath
            const isBranchExpanded = branchManual[branch.id] ?? branchActive
            const BranchIcon = branch.icon

            return (
              <div key={branch.id}>
                <div className="flex items-center gap-1">
                  <NavLink
                    to={branch.basePath}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                      branchActive
                        ? 'bg-background text-foreground font-medium shadow-sm'
                        : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                    )}
                  >
                    <BranchIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{branch.label}</span>
                  </NavLink>
                  <button
                    type="button"
                    className="shrink-0 rounded p-0.5 hover:bg-background/60"
                    onClick={() =>
                      setBranchManual(prev => ({
                        ...prev,
                        [branch.id]: !(prev[branch.id] ?? branchActive),
                      }))
                    }
                    aria-expanded={isBranchExpanded}
                    aria-label={
                      isBranchExpanded
                        ? `Collapse Massive ${branch.label}`
                        : `Expand Massive ${branch.label}`
                    }
                  >
                    {isBranchExpanded ? (
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    ) : (
                      <ChevronRight className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                </div>

                {isBranchExpanded && (
                  <div className="ml-2 mt-0.5 space-y-1 border-l border-border/60 pl-2">
                    {branch.groups.map(g => {
                      const gKey = `${branch.id}:${g.group}`
                      const groupActive = g.leaves.some(l =>
                        capLinkActive(location.pathname, hash, l.to),
                      )
                      const gOpen = groupManual[gKey] ?? groupActive

                      return (
                        <div key={gKey}>
                          <button
                            type="button"
                            className={cn(
                              'flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-dense-meta font-semibold uppercase tracking-wide transition-colors',
                              groupActive
                                ? 'text-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                            onClick={() =>
                              setGroupManual(prev => ({
                                ...prev,
                                [gKey]: !(prev[gKey] ?? groupActive),
                              }))
                            }
                            aria-expanded={gOpen}
                          >
                            {gOpen ? (
                              <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                            ) : (
                              <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
                            )}
                            <span className="truncate">{g.label}</span>
                          </button>

                          {gOpen && (
                            <ul className="mt-0.5 space-y-0.5 pb-1">
                              {g.leaves.map(leaf => {
                                const active = capLinkActive(location.pathname, hash, leaf.to)
                                const eff = rowStatus(branch.id, leaf.id, configured, massiveStatus)
                                return (
                                  <li key={leaf.id}>
                                    <NavLink
                                      to={leaf.to}
                                      className={cn(
                                        'flex items-center gap-1.5 rounded-md py-1 pl-5 pr-2 text-xs transition-colors',
                                        active
                                          ? 'bg-background font-medium text-foreground shadow-sm'
                                          : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                                      )}
                                      title={leaf.label}
                                    >
                                      <CapabilityStatusDot status={eff} />
                                      <span className="min-w-0 truncate">{leaf.label}</span>
                                    </NavLink>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
