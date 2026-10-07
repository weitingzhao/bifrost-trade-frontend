/**
 * TD-199: a module nothing reaches is a dead page that still attracts fixes —
 * EventsBoard / EventRadarDashboard had no importer for two weeks and a debt
 * item was filed (and fixed) against them anyway. This walks the import graph
 * from `main.tsx` (static imports, re-exports, side-effect imports and
 * `import()`; `@/` and relative specifiers) and lists every non-test module
 * under src/ it never reaches.
 *
 * KNOWN_ORPHANS is the 2026-10-07 baseline (42). It may only shrink:
 * - a new orphan fails — import it from the app, or delete it;
 * - a listed module that is gone or reachable again fails until it is taken
 *   off the list, so the room it frees cannot be quietly re-used.
 * Test support (`*.test.*`, `*.spec.*`, `*.fixture.ts`, src/test/) is not counted.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { expect, it } from 'vitest'

const KNOWN_ORPHANS: readonly string[] = [
  'components/BifrostLogo.tsx',
  'components/DraggableExplainPanel.tsx',
  'components/accounts/HoldingsBySymbolCard.tsx',
  'components/cockpit/CockpitSaveHypothesisHost.tsx',
  'components/cockpit/InboxBanner.tsx',
  'components/cockpit/LoopBanner.tsx',
  'components/cockpit/PinChip.tsx',
  'components/cockpit/PinsSection.tsx',
  'components/cockpit/QuickActionButton.tsx',
  'components/cockpit/SessionListSidebar.tsx',
  'components/cockpit/index.ts',
  'components/positions/LinkOptionStockModal.tsx',
  'components/positions/ui.tsx',
  'components/positions/ui/PosStatusBadge.tsx',
  'components/research/DiscoveryHitList.tsx',
  'components/research/HypothesisCard.tsx',
  'components/ui/sheet.tsx',
  'components/ui/toggle-group.tsx',
  'hooks/use-mobile.ts',
  'lib/design/designInks.generated.ts',
  'lib/researchEnvelope.ts',
  'lib/uiClasses.ts',
  'pages/portfolio/ledger/OptGroupRow.tsx',
  'pages/portfolio/ledger/OptGroupsTable.tsx',
  'pages/portfolio/ledger/ViewOptionStockLinksModal.tsx',
  'pages/portfolio/ledger/types.tsx',
  'pages/research/home/BenchDirectory.tsx',
  'pages/research/loop/harnessConsoleColgroups.tsx',
  'store/saveHypothesisIntentStore.ts',
  'types/watchlistDbCoverage.ts',
  'utils/dataOverview/buildWatchlistSummaryRows.ts',
  'utils/dataOverview/coverageSummaryFormat.ts',
  'utils/dataOverview/optionFocusDataset.ts',
  'utils/dataOverview/stockFocusDataset.ts',
  'utils/dataOverview/watchlistMatrixFormat.ts',
  'utils/dataOverview/watchlistUnifiedFocus.ts',
  'utils/ledger/index.ts',
  'utils/navLampIcon.ts',
  'utils/openStockPositions.ts',
  'utils/tradeCalc.ts',
  'utils/tradesUrlSync.ts',
  'utils/winRate.ts',
]

const SRC = resolve(__dirname, '..')
const ENTRY = join(SRC, 'main.tsx')
const SPEC =
  /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return sources(p)
    return /\.tsx?$/.test(name) && !name.endsWith('.d.ts') ? [p] : []
  })
}

function isTestSupport(p: string): boolean {
  const rel = relative(SRC, p)
  return /\.(test|spec)\.tsx?$/.test(rel) || /\.fixture\.ts$/.test(rel) || rel.startsWith(`test${sep}`)
}

function resolveSpec(from: string, spec: string): string | null {
  let base: string
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2))
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec)
  else return null
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(c) && statSync(c).isFile()) return c
  }
  return null
}

function orphans(): string[] {
  const files = sources(SRC)
  const edges = new Map<string, string[]>()
  for (const f of files) {
    const out: string[] = []
    for (const m of readFileSync(f, 'utf8').matchAll(SPEC)) {
      const r = resolveSpec(f, m[1] ?? m[2] ?? m[3])
      if (r) out.push(r)
    }
    edges.set(f, out)
  }
  const seen = new Set<string>()
  const stack = [ENTRY]
  while (stack.length) {
    const f = stack.pop() as string
    if (seen.has(f)) continue
    seen.add(f)
    stack.push(...(edges.get(f) ?? []))
  }
  return files
    .filter((f) => !isTestSupport(f) && !seen.has(f))
    .map((f) => relative(SRC, f).split(sep).join('/'))
    .sort()
}

it('walks the graph (pages behind lazy routes are reached)', () => {
  const now = orphans()
  expect(now).not.toContain('App.tsx')
  expect(now).not.toContain('pages/research/events/EventsPage.tsx')
})

it('orphan modules only go down', () => {
  const now = orphans()
  const added = now.filter((p) => !KNOWN_ORPHANS.includes(p))
  const gone = KNOWN_ORPHANS.filter((p) => !now.includes(p))
  expect({ added, gone }).toEqual({ added: [], gone: [] })
})
