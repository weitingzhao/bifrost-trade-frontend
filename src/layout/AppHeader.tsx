import { Bell, Moon, PanelTop, Pin, Sun, SunMoon } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useThemeMode, THEME_LABELS } from '@/hooks/useThemeMode'
import { cockpitDrawerStore } from '@/hooks/useCockpitDrawer'
import { cn } from '@/lib/utils'
import { SHELL_TOP_BAR_HEIGHT_CLASS } from './shellChrome'

const PAGE_TITLES: Record<string, string> = {
  '/market/live': 'Live',
  '/market/watchlist': 'Stock Watchlist',
  '/research/watchlist': 'Stock Watchlist',
  '/portfolio/accounts': 'Accounts',
  '/portfolio/positions': 'Positions',
  '/portfolio/performance': 'Performance',
  '/portfolio/model-analysis': 'Model Analysis',
  '/portfolio/ledger': 'Trade Ledger',
  '/portfolio/transfer': 'Transfer & Pay',
  '/research/daily-brief': 'Daily Brief',
  '/research/sepa': 'Stock Screener',
  '/research/screener': 'Option Screener',
  '/research/stock-data': 'Settings · Data Readiness',
  '/research/discovery': 'Option Discovery',
  '/research/iv-radar': 'IV Radar',
  '/research/greeks': 'Contract Greeks',
  '/research/risk': 'Risk Model',
  '/research/backtest': 'Backtest',
  '/research/analysis-model': 'Analysis Model',
  '/research/intraday-playbook': 'Intraday Playbook',
  '/research/momentum-radar': 'Momentum Radar',
  '/research/sepa-daily-core': 'SEPA Daily Core',
  '/research/gex-intraday': 'GEX Intraday',
  '/research/forecast-sessions': 'Forecast',
  '/research/order-sentiment': 'Order Sentiment',
  '/research/event-radar': 'Event Radar',
  '/strategy/instances': 'Instances',
  '/strategy/structures': 'Structure',
  '/strategy/opportunities': 'Opportunity',
  '/strategy/gates': 'Gates',
  '/strategy/win-rate': 'Win Rate',
  '/strategy/allocations': 'Allocations',
  '/strategy/option-category': 'Option Category',
  '/operations/daemon': 'System · Daemon',
  '/operations/logs': 'System · Logs',
  '/settings/daemon':                'System · Daemon Status',
  '/settings/api':                   'Settings · API Health',
  '/settings/api/architecture':      'Settings · API — Architecture',
  '/settings/api/account':           'Settings · API — Account',
  '/settings/api/research':          'Settings · API — Research',
  '/settings/subscribe':             'Settings · Subscribe',
  '/settings/socket':                'Settings · Socket',
  '/settings/coverage/overview':     'Settings · Coverage Overview',
  '/settings/coverage/overview-detail': 'Settings · Coverage Detail',
  '/settings/coverage/option':       'Settings · Coverage — Option',
  '/settings/coverage/stock-ib':     'Settings · Coverage — Stock (IB)',
  '/settings/data-readiness':        'Settings · Data Readiness',
  '/settings/feed/ib':               'Settings · Feed — IB',
  '/settings/daemon-app':            'Settings · Daemon App',
  '/settings/tech-stack':            'Settings · Tech Stack',
  '/settings/ui-design-system':      'Settings · UI Design System',
  '/settings/ib':                    'Settings · IB Configure',
}

interface AppHeaderProps {
  activeMsgCount?: number
  onOpenMessages?: () => void
  onToggleNavMode?: () => void
}

export function AppHeader({ activeMsgCount = 0, onOpenMessages, onToggleNavMode }: AppHeaderProps) {
  const location = useLocation()
  const { mode, cycleMode } = useThemeMode()
  const title = PAGE_TITLES[location.pathname] ?? 'Bifrost Trade'

  return (
    <header
      className={cn(
        SHELL_TOP_BAR_HEIGHT_CLASS,
        'flex items-center gap-2 border-b border-border bg-card px-4',
      )}
    >
      <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="h-4" />
      <span className="min-w-0 flex-1 truncate font-medium text-sm md:flex-none md:max-w-none">
        {title}
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {onToggleNavMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleNavMode} aria-label="Switch to top navigation">
                <PanelTop className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Switch to top navigation</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => cockpitDrawerStore.getState().toggle()}
              aria-label="Open Research Cockpit"
            >
              <Pin className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Research Cockpit (⌘K)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8" onClick={onOpenMessages} aria-label="Open messages">
              <Bell className="h-4 w-4" />
              {activeMsgCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-dense-micro font-bold text-white leading-none">
                  {activeMsgCount > 9 ? '9+' : activeMsgCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {activeMsgCount > 0 ? `${activeMsgCount} unread message${activeMsgCount > 1 ? 's' : ''}` : 'Messages'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cycleMode} aria-label="Toggle theme">
              {mode === 'auto'  && <SunMoon className="h-4 w-4" />}
              {mode === 'light' && <Sun    className="h-4 w-4" />}
              {mode === 'dark'  && <Moon   className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{THEME_LABELS[mode]}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
