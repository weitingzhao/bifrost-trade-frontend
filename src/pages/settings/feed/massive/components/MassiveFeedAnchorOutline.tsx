import type { MassiveCapNavGroup } from '../nav/massiveSidebarConfig'
import { parseHashAnchor } from '../nav/anchors'

export function MassiveFeedAnchorOutline({ groups }: { groups: MassiveCapNavGroup[] }) {
  return (
    <div className="space-y-10">
      {groups.map(g => (
        <div key={g.group} className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {g.label}
          </h2>
          {g.leaves.map(leaf => {
            const anchor = parseHashAnchor(leaf.to.includes('#') ? `#${leaf.to.split('#')[1]}` : '')
            return (
              <section
                key={leaf.id}
                id={anchor}
                className="scroll-mt-24 rounded-lg border border-border/60 bg-background/50 px-4 py-3"
              >
                <h3 className="text-sm font-medium text-foreground">{leaf.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Capability panel migration in progress. Use Operations → Celery and Settings → API
                  for Massive jobs and service health.
                </p>
              </section>
            )
          })}
        </div>
      ))}
    </div>
  )
}
