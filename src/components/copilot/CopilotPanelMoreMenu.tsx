import { Link } from 'react-router-dom'
import { BookOpen, MoreHorizontal, Settings, Sparkles, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useResearchAuth } from '@/lib/auth/researchUser'
import { cockpitDrawerStore } from '@/hooks/useCockpitDrawer'

/** Secondary Copilot actions — panel layout controls stay on the header toolbar. */
export function CopilotPanelMoreMenu({
  onExportMemory,
  onOpenUserIdentity,
  onClosePanel,
  disabledExport,
}: {
  onExportMemory: () => void
  onOpenUserIdentity: () => void
  onClosePanel: () => void
  disabledExport?: boolean
}) {
  const { userLabel } = useResearchAuth()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="More actions"
          title="More actions"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem] z-[220]">
        <DropdownMenuLabel className="text-dense-caption font-normal text-muted-foreground">
          More
        </DropdownMenuLabel>
        <DropdownMenuItem disabled={disabledExport} onSelect={onExportMemory}>
          <Sparkles className="mr-2 h-3.5 w-3.5" />
          Export memory (AI brief)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onOpenUserIdentity}>
          <User className="mr-2 h-3.5 w-3.5" />
          Research identity
          {userLabel ? (
            <span className="ml-1 text-dense-micro text-muted-foreground">({userLabel})</span>
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/research/playbook" onClick={onClosePanel}>
            <BookOpen className="mr-2 h-3.5 w-3.5" />
            My Trading System
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/research/agent-personas" onClick={onClosePanel}>
            <User className="mr-2 h-3.5 w-3.5" />
            Agent Personas
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* Settings lost its tab when the tab bar was retired (RS-UX6). */}
        <DropdownMenuItem onSelect={() => cockpitDrawerStore.getState().setTab('settings')}>
          <Settings className="mr-2 h-3.5 w-3.5" />
          Copilot settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
