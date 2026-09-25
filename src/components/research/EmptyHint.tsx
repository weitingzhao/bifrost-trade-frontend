import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { opsConsoleHref } from '@/lib/opsConsole'

export interface EmptyHintProps {
  title: string
  hint: string
  to: string
  linkLabel?: string
  icon?: ReactNode
  /**
   * Where the job that fills this lives, when the answer to "why is it empty"
   * is a run. Running jobs is the Ops Console's (Owner 2026-09-25): this side
   * used to carry a trigger behind an Ops token, and the token's only entry
   * point retired with System › Runtime.
   */
  ops?: { view: string; label: string }
}

export function EmptyHint({ title, hint, to, linkLabel = 'Open page', icon, ops }: EmptyHintProps) {
  return (
    <div className="space-y-1.5">
      {icon ? <div className="text-muted-foreground opacity-60">{icon}</div> : null}
      <p className="text-dense-meta font-medium text-muted-foreground">{title}</p>
      <p className="text-dense-caption text-muted-foreground leading-snug">{hint}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="link" size="sm" className="h-auto p-0 text-dense-meta">
          <Link to={to}>{linkLabel}</Link>
        </Button>
        {ops ? (
          <a
            href={opsConsoleHref(ops.view)}
            target="_blank"
            rel="noreferrer"
            className="text-dense-meta text-muted-foreground hover:underline"
            title={`Opens ${ops.label} in the Ops Console`}
          >
            {ops.label} in Ops ↗
          </a>
        ) : null}
      </div>
    </div>
  )
}
