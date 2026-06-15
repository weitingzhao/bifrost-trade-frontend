import type { LucideIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSystemNavLamp } from '@/components/layout/useSystemNavLamp'
import { isSystemNavPath } from '@/hooks/useSystemNavLamps'
import { navLampIconClass } from '@/utils/navLampIcon'
import type { ShellNavItem } from '@bifrost/ui'

type SystemNavIconProps = {
  path: string
  icon: LucideIcon
}

/** Leading nav icon with service health tint (System submenu). */
export function SystemNavIcon({ path, icon: Icon }: SystemNavIconProps) {
  const lampState = useSystemNavLamp(path)

  if (!isSystemNavPath(path) || !lampState) {
    return <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0" tabIndex={0}>
          <Icon className={navLampIconClass(lampState.lamp)} aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs text-xs">
        {lampState.title}
      </TooltipContent>
    </Tooltip>
  )
}

export function NavSubItemIcon({ item }: { item: ShellNavItem }) {
  const path = item.to ?? item.id
  const Icon = item.icon as LucideIcon | undefined
  if (Icon == null) return null
  return <SystemNavIcon path={path} icon={Icon} />
}
