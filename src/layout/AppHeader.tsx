import { Bell, Moon, PanelTop, Sun, SunMoon, Terminal } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { StatusLamp } from '@/components/StatusLamp'
import { useThemeMode, THEME_LABELS } from '@/hooks/useThemeMode'
import { useCeleryHeaderMetrics } from '@/hooks/useCeleryHeaderMetrics'
import { cn } from '@/lib/utils'

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
  '/research/sepa': 'Stock Screener',
  '/research/screener': 'Option Screener',
  '/research/stock-data': 'Stock Data Readiness',
  '/research/discovery': 'Option Discovery',
  '/research/greeks': 'IV & Greeks',
  '/research/risk': 'Risk Model',
  '/research/backtest': 'Backtest',
  '/strategy/instances': 'Instances',
  '/strategy/structures': 'Structure',
  '/strategy/opportunities': 'Opportunity',
  '/strategy/gates': 'Gates',
  '/strategy/win-rate': 'Win Rate',
  '/strategy/allocations': 'Allocations',
  '/strategy/option-category': 'Option Category',
  '/operations/daemon': 'System · Daemon',
  '/operations/celery': 'System · Celery',
  '/operations/logs': 'System · Logs',
  '/settings/daemon':                'System · Daemon Status',
  '/settings/api':                   'Settings · API Health',
  '/settings/api/architecture':      'Settings · API — Architecture',
  '/settings/api/account':           'Settings · API — Account',
  '/settings/api/research':          'Settings · API — Research',
  '/settings/api/massive':           'Settings · API — Massive',
  '/settings/subscribe':             'Settings · Subscribe',
  '/settings/socket':                'Settings · Socket',
  '/settings/coverage/overview':     'Settings · Coverage Overview',
  '/settings/coverage/overview-detail': 'Settings · Coverage Detail',
  '/settings/coverage/option':       'Settings · Coverage — Option',
  '/settings/coverage/stock-ib':     'Settings · Coverage — Stock (IB)',
  '/settings/coverage/stock-massive':'Settings · Coverage — Stock (Massive)',
  '/settings/feed/ib':               'Settings · Feed — IB',
  '/settings/feed/massive':          'Settings · Feed — Massive',
  '/settings/feed/massive-stock':    'Settings · Massive — Stock',
  '/settings/feed/massive-option':   'Settings · Massive — Option',
  '/settings/feed/massive-comm':     'Settings · Massive — Common',
  '/settings/daemon-app':            'Settings · Daemon App',
  '/settings/ib':                    'Settings · IB Configure',
}

interface AppHeaderProps {
  activeMsgCount?: number
  onOpenMessages?: () => void
  onToggleNavMode?: () => void
}

export function AppHeader({ activeMsgCount = 0, onOpenMessages, onToggleNavMode }: AppHeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { mode, cycleMode } = useThemeMode()
  const celeryMetrics = useCeleryHeaderMetrics(true)
  const title = PAGE_TITLES[location.pathname] ?? 'Bifrost Trade'
  const onCeleryPage = location.pathname === '/operations/celery'
  const pendingLabel =
    celeryMetrics.pendingTotal != null
      ? celeryMetrics.pendingTotal > 99
        ? '99+'
        : String(celeryMetrics.pendingTotal)
      : '—'

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
      <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="h-4" />
      <span className="font-medium text-sm">{title}</span>

      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 gap-1.5 px-2 font-mono text-xs tabular-nums',
                onCeleryPage && 'bg-muted',
              )}
              onClick={() => navigate('/operations/celery')}
              aria-label="Operations Celery"
              title="Celery workers and queue pending — Operations → Celery"
            >
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              <StatusLamp lamp={celeryMetrics.lamp} className="h-2 w-2" />
              <span className="text-muted-foreground">{pendingLabel}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{celeryMetrics.title}</TooltipContent>
        </Tooltip>

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
            <Button variant="ghost" size="icon" className="relative h-8 w-8" onClick={onOpenMessages} aria-label="Open messages">
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
