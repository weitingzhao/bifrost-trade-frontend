import { Bell, Moon, PanelTop, Sun, SunMoon } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { SEAT_META, useResearchSeat } from '@/lib/research/seat'
import { AlertBell } from '@/components/research/AlertBell'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useThemeMode, THEME_LABELS } from '@/hooks/useThemeMode'
import { cn } from '@/lib/utils'
import { SHELL_TOP_BAR_HEIGHT_CLASS } from './shellChrome'

const PAGE_TITLES: Record<string, string> = {
  '/research': 'Research',
  '/research/overview': 'Research',
  '/research/copilot': 'Copilot',
  '/research/copilot/trading': 'Trading Copilot',
  '/research/workbench': 'Workbench',
  '/market/live': 'Live',
  '/market/watchlist': 'Stock Watchlist',
  '/research/watchlist': 'Stock Watchlist',
  '/portfolio/accounts': 'Accounts',
  '/portfolio/positions': 'Positions',
  '/portfolio/backing': 'Backing & Model',
  '/portfolio/performance': 'Performance',
  '/portfolio/ledger': 'Trade Ledger',
  '/portfolio/transfer': 'Transfer & Pay',
  '/research/daily-brief': 'Daily Brief',
  '/research/stock-screener': 'Stock Screener',
  '/research/screener': 'Option Screener',
  '/research/stock-data': 'Settings · Data Readiness',
  '/research/discovery': 'Option Discovery',
  '/research/dossier': 'Dossier',
  '/research/lens-coverage': 'Lens Coverage',
  '/research/vol-regime': 'Vol Regime',
  '/research/dealer-levels': 'Dealer Levels',
  '/research/scenario': 'Scenario Model',
  '/research/flow': 'Flow',
  '/research/scan': 'Scan',
  '/research/signal-decay': 'Signal Decay',
  '/research/greeks': 'Contract Greeks',
  '/research/backtest': 'Backtest',
  '/research/momentum-radar': 'Momentum Radar',
  '/research/sepa-daily-core': 'SEPA Daily Core',
  '/research/event-radar': 'Event Radar',
  '/research/loop/candidates': 'Candidate Pool',
  '/research/loop/hypotheses': 'Hypothesis Board',
  '/research/loop/decisions': 'Decision Inbox',
  '/research/loop/harness': 'Autopilot',
  '/strategy/instances': 'Instances',
  '/strategy/structures': 'Structure',
  '/strategy/opportunities': 'Opportunity',
  '/strategy/gates': 'Gates',
  '/strategy/win-rate': 'Win Rate',
  '/strategy/allocations': 'Allocations',
  '/strategy/option-category': 'Option Category',
  '/operations/daemon': 'System · Daemon',
  '/operations/platform': 'Platform Plugins',
  '/settings/daemon':                'System · Daemon Status',
  '/settings/api':                   'Settings · API Health',
  '/settings/api/architecture':      'Settings · API — Architecture',
  '/settings/api/account':           'Settings · API — Account',
  '/settings/api/research':          'Settings · API — Research',
  '/settings/feed':                  'Settings · Feed',
  '/settings/socket':                'Settings · Socket',
  '/settings/coverage':              'Settings · Data Coverage',
  '/docs/research-blueprint':        'Research Blueprint',
  '/docs/research-calibration':      'Research Calibration',
  '/docs/tech-stack':                'Tech Stack',
  '/docs/ui-design-system':          'UI Design System',
  '/settings/data-readiness':        'Settings · Data Readiness',
  '/settings/ib':                    'Settings · IB Configure',
}

interface AppHeaderProps {
  activeMsgCount?: number
  onOpenMessages?: () => void
  onToggleNavMode?: () => void
}

function ResearchSeatChip() {
  const seat = useResearchSeat()
  const m = SEAT_META[seat]
  return (
    <DenseTag variant="neutral" size="cell" title={`${m.level} — ${m.claim}`} className="hidden md:inline-flex">
      {m.label} seat
    </DenseTag>
  )
}

export function AppHeader({ activeMsgCount = 0, onOpenMessages, onToggleNavMode }: AppHeaderProps) {
  const location = useLocation()
  const { mode, cycleMode } = useThemeMode()
  const title =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith('/research/loop/objectives/') ? 'Objective' : 'Bifrost Trade')

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
      {location.pathname.startsWith('/research') ? <ResearchSeatChip /> : null}

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

        <AlertBell />

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
