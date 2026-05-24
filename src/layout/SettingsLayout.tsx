import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Activity, Cpu, Plug } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const settingsNav = [
  {
    group: 'Status',
    items: [
      { label: 'Daemon', to: '/settings/daemon', icon: Activity, description: 'Process heartbeat & FSM state' },
    ],
  },
  {
    group: 'Configuration',
    items: [
      { label: 'Daemon App', to: '/settings/daemon-app', icon: Cpu, description: 'Runtime config (heartbeat interval, etc.)' },
      { label: 'IB Configure', to: '/settings/ib', icon: Plug, description: 'IB account, port & Client ID' },
    ],
  },
]

export function SettingsLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect /settings to the first child page
  useEffect(() => {
    if (location.pathname === '/settings' || location.pathname === '/settings/') {
      navigate('/settings/daemon', { replace: true })
    }
  }, [location.pathname, navigate])

  return (
    <div className="flex h-full">
      {/* Secondary nav panel */}
      <aside className="w-52 shrink-0 border-r border-border bg-muted/30 overflow-y-auto">
        <div className="px-3 py-4 space-y-4">
          {settingsNav.map((group, i) => (
            <div key={group.group}>
              {i > 0 && <Separator className="mb-4" />}
              <p className="px-2 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.group}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                          isActive
                            ? 'bg-background text-foreground font-medium shadow-sm'
                            : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* Content area */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
