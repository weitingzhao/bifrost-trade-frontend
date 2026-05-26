import { useCallback, useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { BifrostLogoFull, BifrostLogoMark } from '@/components/BifrostLogo'
import { getAllItems, NAV_GROUPS, SETTINGS_ITEM, type NavGroup, type NavItem } from './navConfig'

// ─── Persistence ───

import { STORAGE_KEYS } from '@/constants/storage'

const ACCORDION_KEY = STORAGE_KEYS.sidebarAccordion
const OPEN_GROUPS_KEY = STORAGE_KEYS.sidebarOpenGroups

function readAccordion(): boolean {
  return localStorage.getItem(ACCORDION_KEY) === 'true'
}

function readOpenGroups(defaultLabels: string[]): Set<string> {
  try {
    const raw = localStorage.getItem(OPEN_GROUPS_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch {}
  return new Set(defaultLabels)
}

function saveOpenGroups(groups: Set<string>) {
  localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify([...groups]))
}

// ─── Sub-item (expanded mode) ───

function SubItem({ item }: { item: NavItem }) {
  const location = useLocation()
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        asChild
        isActive={location.pathname.startsWith(item.to)}
        className="text-sidebar-foreground/60 data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium hover:text-sidebar-foreground"
      >
        <NavLink to={item.to}>
          <item.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span>{item.label}</span>
        </NavLink>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

// ─── Flyout item (collapsed mode popover) ───

function FlyoutItem({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const location = useLocation()
  const isActive = location.pathname.startsWith(item.to)
  return (
    <NavLink
      to={item.to}
      onClick={onClose}
      className={cn(
        'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground',
      )}
    >
      <item.icon className="h-3.5 w-3.5 shrink-0 opacity-75" />
      {item.label}
    </NavLink>
  )
}

// ─── Collapsed icon button + flyout popover ───

function CollapsedGroupButton({ group }: { group: NavGroup }) {
  const location = useLocation()
  const allItems = getAllItems(group)
  const isActive = allItems.some((i) => location.pathname.startsWith(i.to))
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md transition-colors mx-auto',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )}
            >
              <group.icon className="h-4 w-4 shrink-0" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">
          {group.label}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-48 p-2 bg-sidebar border-sidebar-border shadow-xl"
      >
        {/* Group title in flyout */}
        <p className={cn(
          'px-1 pb-1.5 text-[11px] font-bold tracking-wide',
          isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/70',
        )}>
          {group.label}
        </p>

        {/* Flat items */}
        {group.items?.map((item) => (
          <FlyoutItem key={item.to} item={item} onClose={() => setOpen(false)} />
        ))}

        {/* Sub-grouped items */}
        {group.subGroups?.map((sg, idx) => (
          <div key={sg.label}>
            {/* Divider between sub-groups */}
            {idx > 0 && <div className="my-1.5 border-t border-sidebar-border/50" />}
            <p className="px-1 pt-1 pb-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/35 select-none">
              {sg.label}
            </p>
            {sg.items.map((item) => (
              <FlyoutItem key={item.to} item={item} onClose={() => setOpen(false)} />
            ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}

// ─── Settings flyout (collapsed) ───

function CollapsedSettingsButton() {
  const location = useLocation()
  const navigate = useNavigate()
  const isActive = location.pathname.startsWith('/settings')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => navigate(SETTINGS_ITEM.to)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md transition-colors mx-auto',
            isActive
              ? 'bg-sidebar-accent text-sidebar-primary'
              : 'text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground',
          )}
        >
          <SETTINGS_ITEM.icon className="h-4 w-4 shrink-0" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs font-medium">
        {SETTINGS_ITEM.label}
      </TooltipContent>
    </Tooltip>
  )
}

// ─── Main Sidebar ───

export function AppSidebar() {
  const location = useLocation()
  const { state: sidebarState } = useSidebar()
  const isCollapsed = sidebarState === 'collapsed'

  const [accordion, setAccordion] = useState<boolean>(readAccordion)

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const activeGroup = NAV_GROUPS.find((g) =>
      getAllItems(g).some((item) => location.pathname.startsWith(item.to)),
    )
    const defaultOpen = NAV_GROUPS.filter(
      (g) => g.defaultOpen || g.label === activeGroup?.label,
    ).map((g) => g.label)
    return readOpenGroups(defaultOpen)
  })

  useEffect(() => {
    localStorage.setItem(ACCORDION_KEY, String(accordion))
  }, [accordion])

  useEffect(() => {
    saveOpenGroups(openGroups)
  }, [openGroups])

  const toggleGroup = useCallback(
    (label: string) => {
      setOpenGroups((prev) => {
        const next = new Set(prev)
        if (next.has(label)) {
          next.delete(label)
        } else {
          if (accordion) next.clear()
          next.add(label)
        }
        return next
      })
    },
    [accordion],
  )

  return (
    <Sidebar collapsible="icon">
      {/* ── Header ── */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-2.5">
        {isCollapsed ? (
          /* Collapsed: mark only, centered */
          <div className="flex justify-center">
            <BifrostLogoMark size={28} />
          </div>
        ) : (
          /* Expanded: full lockup + accordion toggle */
          <div className="flex items-center justify-between">
            <BifrostLogoFull />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setAccordion((p) => !p)}
                  className="flex h-6 w-6 items-center justify-center rounded text-sidebar-foreground/35 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  aria-label={accordion ? 'Switch to multi-expand' : 'Switch to single-expand'}
                >
                  {accordion
                    ? <PanelLeftClose className="h-3.5 w-3.5" />
                    : <PanelLeftOpen className="h-3.5 w-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {accordion
                  ? 'Single-expand — click to allow multiple'
                  : 'Multi-expand — click to allow only one'}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {isCollapsed ? (
          /* ════════════════════════════════════════
             COLLAPSED MODE — icon column + flyouts
             ════════════════════════════════════════ */
          <div className="flex flex-col gap-1 py-2 px-1">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                {group.dividerBefore && (
                  <div className="my-1.5 border-t border-sidebar-border/60" />
                )}
                <CollapsedGroupButton group={group} />
              </div>
            ))}
          </div>
        ) : (
          /* ════════════════════════════════════════
             EXPANDED MODE — collapsible sections
             ════════════════════════════════════════ */
          NAV_GROUPS.map((group) => {
            const allItems = getAllItems(group)
            const isGroupActive = allItems.some((item) =>
              location.pathname.startsWith(item.to),
            )
            const isOpen = openGroups.has(group.label)

            return (
              <div key={group.label}>
                {group.dividerBefore && <SidebarSeparator />}
                <SidebarGroup>
                  <Collapsible
                    open={isOpen}
                    onOpenChange={() => toggleGroup(group.label)}
                    className="group/collapsible"
                  >
                    <SidebarGroupLabel
                      asChild
                      className={cn(
                        'h-9 text-[13px] font-semibold tracking-tight',
                        isGroupActive
                          ? 'text-sidebar-foreground'
                          : 'text-sidebar-foreground/80',
                      )}
                    >
                      <CollapsibleTrigger className="flex w-full items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                          <group.icon
                            className={cn(
                              'h-4 w-4 shrink-0',
                              isGroupActive
                                ? 'text-sidebar-primary'
                                : 'text-sidebar-foreground/50',
                            )}
                          />
                          <span>{group.label}</span>
                        </div>
                        <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>

                    <CollapsibleContent>
                      {group.items && (
                        <SidebarMenu>
                          <SidebarMenuSub>
                            {group.items.map((item) => (
                              <SubItem key={item.to} item={item} />
                            ))}
                          </SidebarMenuSub>
                        </SidebarMenu>
                      )}

                      {group.subGroups?.map((sg) => (
                        <div key={sg.label}>
                          <div className="mx-3 mt-3 mb-0.5 flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/35 select-none">
                              {sg.label}
                            </span>
                            <div className="flex-1 border-t border-sidebar-border/50" />
                          </div>
                          <SidebarMenu>
                            <SidebarMenuSub>
                              {sg.items.map((item) => (
                                <SubItem key={item.to} item={item} />
                              ))}
                            </SidebarMenuSub>
                          </SidebarMenu>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarGroup>
              </div>
            )
          })
        )}
      </SidebarContent>

      {/* ── Footer: Settings ── */}
      <SidebarFooter className="border-t border-sidebar-border">
        {isCollapsed ? (
          <div className="flex justify-center py-1">
            <CollapsedSettingsButton />
          </div>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname.startsWith('/settings')}
                className="text-sidebar-foreground/60 data-[active=true]:text-sidebar-accent-foreground hover:text-sidebar-foreground"
              >
                <NavLink to={SETTINGS_ITEM.to}>
                  <SETTINGS_ITEM.icon className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="text-xs font-medium">{SETTINGS_ITEM.label}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
