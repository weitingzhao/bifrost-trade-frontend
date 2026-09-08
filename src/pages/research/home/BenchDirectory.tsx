/**
 * The four benches and their pages, as a directory — the workbench seat's
 * own map. Reads the same catalog the sidebar lays out, so the two never
 * name a page differently.
 */
import { Link } from 'react-router-dom'
import { BENCHES } from '@/layout/researchNavCatalog'

export function BenchDirectory() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {BENCHES.map((bench) => {
        const Icon = bench.icon
        return (
          <section key={bench.id} className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <h2 className="flex items-center gap-2 text-dense-body font-semibold">
              <Icon className="size-4 text-muted-foreground" />
              {bench.label}
              <span className="text-dense-meta font-normal text-muted-foreground">{bench.items.length} pages</span>
            </h2>
            <ul className="mt-2 space-y-1">
              {bench.items.map((it) => {
                const ItemIcon = it.icon
                return (
                  <li key={it.id}>
                    <Link to={it.to ?? it.id} className="flex items-center gap-2 text-dense-label hover:underline">
                      {ItemIcon ? <ItemIcon className="size-3 text-muted-foreground" /> : null}
                      {it.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
