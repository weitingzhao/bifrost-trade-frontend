import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  BarChart2, ChevronDown, ChevronRight,
  Cpu, Database, HardDrive,
  Layers, Layers2, Palette, Plug, Radio, Wifi,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MassiveSidebarNav } from '@/layout/settings/MassiveSidebarNav'

// ─── Nav tree ────────────────────────────────────────────────────────────────

interface NavLeaf {
  kind: 'leaf'
  label: string
  to: string
  icon: React.ElementType
}

interface NavBranch {
  kind: 'branch'
  label: string
  icon: React.ElementType
  children: NavLeaf[]
}

interface NavSection {
  section: string
  items: (NavLeaf | NavBranch)[]
}

interface NavGroup {
  group: string
  sections: NavSection[]
}

function leaf(label: string, to: string, icon: React.ElementType): NavLeaf {
  return { kind: 'leaf', label, to, icon }
}

function branch(label: string, icon: React.ElementType, children: NavLeaf[]): NavBranch {
  return { kind: 'branch', label, icon, children }
}

const NAV: NavGroup[] = [
  {
    group: 'Data & Feed',
    sections: [
      {
        section: 'Data Coverage',
        items: [
          branch('Overview', BarChart2, [
            leaf('Summary', '/settings/coverage/overview',        BarChart2),
            leaf('Detail',  '/settings/coverage/overview-detail', Layers),
          ]),
          leaf('Option', '/settings/coverage/option', Layers),
          branch('Stock', HardDrive, [
            leaf('IB Live (Redis)',    '/settings/coverage/stock-ib',      Wifi),
            leaf('Massive Delay (DB)', '/settings/coverage/stock-massive', Database),
          ]),
        ],
      },
      {
        section: 'Feed',
        items: [
          leaf('Subscribe',           '/settings/subscribe', Radio),
          leaf('Interactive Brokers', '/settings/feed/ib',   Plug),
        ],
      },
    ],
  },
  {
    group: 'Configuration',
    sections: [
      {
        section: 'Configuration',
        items: [
          leaf('Daemon App', '/settings/daemon-app', Cpu),
          leaf('Tech Stack', '/settings/tech-stack', Layers2),
          leaf('UI Design System', '/settings/ui-design-system', Palette),
          branch('IB Configure', Plug, [
            leaf('User (YAML)',       '/settings/ib#ib-users',       Plug),
            leaf('Client ID (YAML)',  '/settings/ib#ib-client-ids',  Cpu),
            leaf('Account',          '/settings/ib#ib-account',      Layers),
            leaf('Flex Query',       '/settings/ib#ib-flex-query',   Database),
            leaf('Flex Preference',  '/settings/ib#flex-preference', BarChart2),
          ]),
        ],
      },
    ],
  },
]

// ─── Nav components ───────────────────────────────────────────────────────────

function LeafItem({ item, depth = 0 }: { item: NavLeaf; depth?: number }) {
  const location = useLocation()
  const basePath = item.to.split('#')[0]
  const isActive = location.pathname === basePath

  return (
    <NavLink
      to={item.to}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        depth > 0 && 'pl-6',
        isActive
          ? 'bg-background text-foreground font-medium shadow-sm'
          : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
      )}
    >
      <item.icon className="h-3.5 w-3.5 shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  )
}

function BranchItem({ item }: { item: NavBranch }) {
  const location = useLocation()
  const hasActive = item.children.some(
    (c) => location.pathname === c.to.split('#')[0],
  )
  const [open, setOpen] = useState(hasActive)

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          hasActive
            ? 'text-foreground font-medium'
            : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
        )}
      >
        <item.icon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {open
          ? <ChevronDown  className="h-3 w-3 shrink-0 opacity-50" />
          : <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
        }
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {item.children.map((child) => (
            <LeafItem key={child.to} item={child} depth={1} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function SettingsLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  if (location.pathname === '/settings' || location.pathname === '/settings/') {
    navigate('/settings/coverage/overview', { replace: true })
  }

  return (
    <div className="flex h-full">
      <aside className="w-60 shrink-0 border-r border-border bg-muted/20 overflow-y-auto">
        <div className="px-3 py-4 space-y-5">
          {NAV.map((group, gi) => (
            <div key={group.group}>
              {gi > 0 && <div className="border-t border-border/60 mb-5" />}

              <p className="px-2 mb-2 text-dense-caption font-bold uppercase tracking-[0.12em] text-muted-foreground/60 select-none">
                {group.group}
              </p>

              {group.sections.map((section) => (
                <div key={section.section} className="mb-3">
                  <p className="px-2 mb-1 text-dense-meta font-semibold text-muted-foreground/80 select-none">
                    {section.section}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map((item) =>
                      item.kind === 'leaf'
                        ? <LeafItem key={item.to} item={item} />
                        : <BranchItem key={item.label} item={item} />
                    )}
                    {section.section === 'Feed' ? <MassiveSidebarNav /> : null}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-card">
        <Outlet />
      </main>
    </div>
  )
}
