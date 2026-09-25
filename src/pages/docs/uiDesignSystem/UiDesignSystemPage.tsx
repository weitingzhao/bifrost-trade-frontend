/**
 * UI Design System — the site's business semantics on one page (design
 * `System Reference UI Design System.dc.html`, Rev .53): direction, entity,
 * category, state, accent, density, surfaces, filters, the states of not
 * knowing, and the checklist a page is walked against.
 *
 * Redrawn on the §14.8 tokens. The entity section is the three identity inks
 * — `--sk-ticker`, `--sk-contract`, `--sk-instance` — where the app's page
 * had four asset classes, two of them only ever planned. Every Use / Never
 * line the previous page carried is kept under the section it belongs to, so
 * the redraw is no weaker than the page it replaced (§15).
 */
import { PageHead, PageShell } from '@/components/layout'
import { useScrollSpy } from '@/hooks/useScrollSpy'
import { UI_VERSION_NOW } from '@/lib/design/uiVersion'
import { AccentSection, CategorySection, DirectionSection, EntitySection, StateSection } from './uiDsMeaning'
import { ChecklistSection, DensitySection, FiltersSection, NotKnowingSection, SurfacesSection } from './uiDsForm'
import { DsNav } from './uiDsParts'

const NAV = ['Direction', 'Entity', 'Category', 'State', 'Accent', 'Density', 'Surfaces', 'Filters', 'Not knowing', 'Checklist'] as const
const ANCHORS = NAV.map((_, i) => `ds-${i + 1}`)

export default function UiDesignSystemPage() {
  const { rootRef, active, jump } = useScrollSpy(ANCHORS, { offset: 120, gap: 56 })
  return (
    <PageShell padding="compact">
      <PageHead
        title="UI Design System"
        info="Site-wide business semantics — direction, entity, category, state, density. Same token everywhere; the primitive varies by placement. Walk any page against the checklist at the bottom."
        meta={`visual contract · @bifrost/ui ${UI_VERSION_NOW}`}
      />
      <div ref={rootRef}>
        <DsNav labels={NAV} active={active} onJump={jump} />
        <div className="mt-3.5 flex flex-col gap-3.5">
          <DirectionSection />
          <EntitySection />
          <CategorySection />
          <StateSection />
          <AccentSection />
          <DensitySection />
          <SurfacesSection />
          <FiltersSection />
          <NotKnowingSection />
          <ChecklistSection />
        </div>
      </div>
    </PageShell>
  )
}
