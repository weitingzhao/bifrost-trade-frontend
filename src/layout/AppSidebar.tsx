import { useCallback, useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, PanelLeftClose, PanelLeftOpen, ScrollText } from 'lucide-react'
import { useLogPanel } from '@/hooks/useLogPanel'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
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
import { LiveNavLamp } from '@/components/layout/LiveNavLamp'
import { CeleryNavLamp } from '@/components/layout/CeleryNavLamp'
import { getAllItems, NAV_GROUPS, SETTINGS_ITEM, type NavGroup, type NavItem } from './navConfig'

const LIVE_NAV_PATH = '/market/live'
const CELERY_NAV_PATH = '/operations/celery'

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
  } catch { /* ignore corrupted localStorage value */ }
  return new Set(defaultLabels)
}

function saveOpenGroups(groups: Set<string>) {
  localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify([...groups]))
}

// ─── Sub-item (expanded mode) ───

function SubItem({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const location = useLocation()
  const isActive = location.pathname.startsWith(item.to)
  const hasChildren = item.children && item.children.length > 0
  const childActive = hasChildren
    ? item.children!.some((c) => location.pathname.startsWith(c.to))
    : false
  const [childOpen, setChildOpen] = useState(isActive || childActive)

  const indent = depth > 0 ? 'pl-4' : ''

  if (hasChildren) {
    return (
      <SidebarMenuSubItem>
        {/* Root link + toggle chevron side by side */}
        <div className="flex items-center gap-0.5">
          <SidebarMenuSubButton
            asChild
            isActive={isActive || childActive}
            className={cn(
              'flex-1 text-sidebar-foreground/60 data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden',
              indent,
            )}
          >
            <NavLink to={item.to}>
              <item.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="flex-1">{item.label}</span>
              {item.to === LIVE_NAV_PATH && <LiveNavLamp />}
              {item.to === CELERY_NAV_PATH && <CeleryNavLamp />}
            </NavLink>
          </SidebarMenuSubButton>
          <button
            onClick={() => setChildOpen((o) => !o)}
            className="group-data-[collapsible=icon]:hidden shrink-0 flex h-6 w-5 items-center justify-center rounded text-sidebar-foreground/30 hover:text-sidebar-foreground/70 transition-colors"
            aria-label={childOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
          >
            <ChevronDown className={cn('h-3 w-3 transition-transform', childOpen && 'rotate-180')} />
          </button>
        </div>
        {childOpen && (
          <SidebarMenu className="group-data-[collapsible=icon]:hidden">
            <SidebarMenuSub>
              {item.children!.map((child) => (
                <SubItem key={child.to} item={child} depth={depth + 1} />
              ))}
            </SidebarMenuSub>
          </SidebarMenu>
        )}
      </SidebarMenuSubItem>
    )
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        asChild
        isActive={isActive}
        className={cn(
          'text-sidebar-foreground/60 data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium hover:text-sidebar-foreground',
          indent,
        )}
      >
        <NavLink to={item.to} className="flex items-center gap-2 w-full">
          <item.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span className="flex-1">{item.label}</span>
          {item.to === LIVE_NAV_PATH && <LiveNavLamp />}
          {item.to === CELERY_NAV_PATH && <CeleryNavLamp />}
        </NavLink>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

// ─── Flyout item (collapsed mode popover) ───

function FlyoutItem({ item, onClose, depth = 0 }: { item: NavItem; onClose: () => void; depth?: number }) {
  const location = useLocation()
  const isActive = location.pathname.startsWith(item.to)
  const hasChildren = item.children && item.children.length > 0
  const childActive = hasChildren
    ? item.children!.some((c) => location.pathname.startsWith(c.to))
    : false
  const [open, setOpen] = useState(isActive || childActive)
  const pl = depth > 0 ? 'pl-5 pr-2' : 'px-2.5'

  return (
    <div>
      <div className="flex items-center">
        <NavLink
          to={item.to}
          onClick={onClose}
          className={cn(
            `flex flex-1 items-center gap-2 rounded-md ${pl} py-1.5 text-xs transition-colors`,
            (isActive || childActive)
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground',
          )}
        >
          <item.icon className="h-3.5 w-3.5 shrink-0 opacity-75" />
          <span className="flex-1">{item.label}</span>
          {item.to === LIVE_NAV_PATH && <LiveNavLamp />}
          {item.to === CELERY_NAV_PATH && <CeleryNavLamp />}
        </NavLink>
        {hasChildren && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 flex h-6 w-5 items-center justify-center text-sidebar-foreground/30 hover:text-sidebar-foreground/70 transition-colors"
            aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
          >
            <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>
      {hasChildren && open && (
        <div className="mt-0.5 space-y-0.5">
          {item.children!.map((child) => (
            <FlyoutItem key={child.to} item={child} onClose={onClose} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
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

// ─── Expanded footer: Logs + Settings on one row ───

function LogAndSettingsFooter() {
  const location = useLocation()
  const { open, toggle, errorCount } = useLogPanel()
  const settingsActive = location.pathname.startsWith('/settings')

  const iconBtn = 'flex h-7 w-7 items-center justify-center rounded-md transition-colors'
  const btnActive = 'bg-sidebar-accent text-sidebar-accent-foreground'
  const btnIdle = 'text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground'

  return (
    <div className="flex items-center px-2 py-1.5">
      {/* Settings — icon + text, left */}
      <NavLink
        to={SETTINGS_ITEM.to}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium transition-colors',
          settingsActive ? btnActive : btnIdle,
        )}
      >
        <SETTINGS_ITEM.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span>{SETTINGS_ITEM.label}</span>
      </NavLink>

      <div className="flex-1" />

      {/* Logs — icon only, right */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={toggle} className={cn(iconBtn, open ? btnActive : btnIdle)}>
            <div className="relative">
              <ScrollText className="h-3.5 w-3.5 opacity-70" />
              {errorCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white leading-none">
                  {errorCount > 9 ? '9+' : errorCount}
                </span>
              )}
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs font-medium">
          {open ? 'Close logs' : 'Logs'}{errorCount > 0 ? ` · ${errorCount} error${errorCount > 1 ? 's' : ''}` : ''}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

// ─── Log toggle button (collapsed) ───

function CollapsedLogButton() {
  const { open, toggle, errorCount } = useLogPanel()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggle}
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-md transition-colors mx-auto',
            open
              ? 'bg-sidebar-accent text-sidebar-primary'
              : 'text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground',
          )}
        >
          <ScrollText className="h-4 w-4 shrink-0" />
          {errorCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
              {errorCount > 9 ? '9+' : errorCount}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs font-medium">
        Logs {errorCount > 0 ? `· ${errorCount} error${errorCount > 1 ? 's' : ''}` : ''}
      </TooltipContent>
    </Tooltip>
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
                  onClick={() => {
                    const next = !accordion
                    setAccordion(next)
                    if (next) {
                      // Switching to single-expand: immediately collapse all except the active group
                      const active = NAV_GROUPS.find((g) =>
                        getAllItems(g).some((item) => location.pathname.startsWith(item.to)),
                      )
                      setOpenGroups(active ? new Set([active.label]) : new Set())
                    }
                  }}
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
                  ? 'Single expand — click to allow multiple open'
                  : 'Multi expand — click to allow only one open'}
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

      {/* ── Footer: Logs + Settings ── */}
      <SidebarFooter className="border-t border-sidebar-border">
        {isCollapsed ? (
          <div className="flex items-center justify-center gap-1 py-1">
            <CollapsedLogButton />
            <CollapsedSettingsButton />
          </div>
        ) : (
          <LogAndSettingsFooter />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
