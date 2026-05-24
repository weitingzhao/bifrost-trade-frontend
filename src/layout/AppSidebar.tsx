import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
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
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { NAV_GROUPS, SETTINGS_ITEM } from './navConfig'

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <span className="font-semibold text-sidebar-foreground tracking-tight group-data-[collapsible=icon]:hidden">
          Bifrost Trade
        </span>
        <span className="font-semibold text-sidebar-foreground hidden group-data-[collapsible=icon]:block">
          B
        </span>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => {
          const isGroupActive = group.items.some((item) =>
            location.pathname.startsWith(item.to)
          )
          return (
            <SidebarGroup key={group.label}>
              <Collapsible defaultOpen={group.defaultOpen ?? isGroupActive} className="group/collapsible">
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <group.icon className="h-4 w-4" />
                      <span>{group.label}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarMenu>
                    <SidebarMenuSub>
                      {group.items.map((item) => (
                        <SidebarMenuSubItem key={item.to}>
                          <SidebarMenuSubButton asChild isActive={location.pathname.startsWith(item.to)}>
                            <NavLink to={item.to}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenu>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location.pathname.startsWith('/settings')}>
              <NavLink to={SETTINGS_ITEM.to}>
                <SETTINGS_ITEM.icon className="h-4 w-4" />
                <span>{SETTINGS_ITEM.label}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
