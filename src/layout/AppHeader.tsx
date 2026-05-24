import { Bell, Moon, Sun, SunMoon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const PAGE_TITLES: Record<string, string> = {
  '/market/live': 'Live',
  '/market/watchlist': 'Watchlist',
  '/portfolio/accounts': 'Accounts',
  '/portfolio/positions': 'Positions',
  '/portfolio/performance': 'Performance',
  '/portfolio/model-analysis': 'Model Analysis',
  '/portfolio/ledger': 'Trade Ledger',
  '/research/screener': 'Screener',
  '/research/discovery': 'Discovery',
  '/research/greeks': 'Greeks',
  '/research/sepa': 'SEPA',
  '/research/stock-data': 'Stock Data',
  '/research/risk': 'Risk Model',
  '/research/backtest': 'Backtest',
  '/strategy/instances': 'Instances',
  '/strategy/structures': 'Structures',
  '/strategy/opportunities': 'Opportunities',
  '/strategy/gates': 'Gates',
  '/strategy/win-rate': 'Win Rate',
  '/strategy/allocations': 'Allocations',
  '/strategy/option-category': 'Option Category',
  '/operations/daemon': 'System · Daemon',
  '/operations/celery': 'System · Celery',
  '/operations/logs': 'System · Logs',
  '/settings/daemon': 'Settings · Daemon',
  '/settings/daemon-app': 'Settings · Daemon App',
  '/settings/ib': 'Settings · IB Configure',
}

type ThemeMode = 'auto' | 'light' | 'dark'
const THEME_KEY = 'bifrost-theme'
const THEME_CYCLE: Record<ThemeMode, ThemeMode> = { auto: 'light', light: 'dark', dark: 'auto' }
const THEME_LABEL: Record<ThemeMode, string> = {
  auto: 'Auto (System)',
  light: 'Light',
  dark: 'Dark',
}

function applyTheme(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

interface AppHeaderProps {
  activeMsgCount?: number
  onOpenMessages?: () => void
}

export function AppHeader({ activeMsgCount = 0, onOpenMessages }: AppHeaderProps) {
  const location = useLocation()

  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_KEY)
    return saved === 'light' || saved === 'dark' || saved === 'auto' ? saved : 'auto'
  })

  useEffect(() => {
    applyTheme(mode)
    localStorage.setItem(THEME_KEY, mode)
    if (mode !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('auto')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const title = PAGE_TITLES[location.pathname] ?? 'Bifrost Trade'

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <span className="font-medium text-sm">{title}</span>

      <div className="ml-auto flex items-center gap-1">
        {/* Message Center bell */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8"
              onClick={onOpenMessages}
              aria-label="Messages"
            >
              <Bell className="h-4 w-4" />
              {activeMsgCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none">
                  {activeMsgCount > 9 ? '9+' : activeMsgCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {activeMsgCount > 0 ? `${activeMsgCount} unread message${activeMsgCount > 1 ? 's' : ''}` : 'Messages'}
          </TooltipContent>
        </Tooltip>

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMode(m => THEME_CYCLE[m])}
              aria-label="Toggle theme"
            >
              {mode === 'auto' && <SunMoon className="h-4 w-4" />}
              {mode === 'light' && <Sun className="h-4 w-4" />}
              {mode === 'dark' && <Moon className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {THEME_LABEL[mode]}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
