/**
 * The Option Category catalog, inside the sheet that uses it.
 *
 * Design DECISIONS 2026-09-12 and 2026-09-18: the catalog has no route of its
 * own — `option-category → Structure 编辑表目录段（模板搜索 + ＋New template +
 * Dimensions 字典，dims-follow-template 规则保留）`. The reason is in the rule
 * itself: a structure's six dimensions come from its template, so choosing a
 * template *is* the categorising act, and a separate page to browse templates
 * asked the reader to hold two screens in their head to do one thing.
 *
 * Search already lived here. This adds the other two:
 *
 * - **＋ New template** — a code and a display name. Legs, params and
 *   characteristics are not asked for here on purpose: a template with none of
 *   them is a valid, empty shape, and the structure being edited supplies its
 *   own legs. Filling them in is still the Option Category page's job until it
 *   retires.
 * - **Dimensions** — the six `dim_type` dictionaries every template picks from,
 *   **add-only**. A code is referenced by templates, so renaming one is a data
 *   migration and deleting one can orphan a template; the design's own note
 *   says so, and neither belongs behind a button in an edit sheet.
 */
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createDim, createTemplate } from '@/api/strategy'
import { useOptionCategoryDims, DIMS_KEY } from '@/hooks/useOptionCategory'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { TemplateEditor } from '@/components/strategy/templates/TemplateEditor'
import { positionsUi } from '@/components/positions/positionsUi'
import { cn } from '@/lib/utils'

/** The six `dim_type` dictionaries, in the order every surface lists them. */
export const CATALOG_DIM_TYPES = ['direction', 'structure', 'coverage', 'risk', 'volatility', 'time'] as const
export type CatalogDimType = (typeof CATALOG_DIM_TYPES)[number]

/** `Bull Put Spread` → `bull_put_spread`. The server keys templates by code. */
export function toTemplateCode(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

export function TemplateCatalogControls({
  onCreated,
  editableTemplateId = null,
}: {
  onCreated: (templateId: number) => void
  /**
   * The template this structure is on. Given, the catalog can edit it in
   * place — its legs, its parameters, its characteristics and the six
   * dimensions this structure inherits — which is what being told to go to
   * another page to fix the template you just picked used to cost.
   */
  editableTemplateId?: number | null
}) {
  const qc = useQueryClient()
  const [newOpen, setNewOpen] = useState(false)
  const [dimsOpen, setDimsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dims = useOptionCategoryDims()

  async function create() {
    const c = toTemplateCode(code)
    if (!c || busy) return
    setBusy(true)
    setError(null)
    try {
      // No dimensions at all, not a placeholder one. Measured on DEV
      // 2026-09-18: the server validates every dim against its dictionary and
      // answers `400 Invalid structure code: custom` — the literal the Option
      // Category page has always sent, which means creating a template has
      // been broken there too. Omitting the field is accepted, and it is the
      // honest value: a shape nobody has classified yet has no class.
      const { strategy_template_id } = await createTemplate({
        template_code: c,
        display_name: name.trim() || c,
        sort_order: 100,
      })
      // The prefix, not one of the two keys: this sheet reads the active-only
      // list and the Option Category page reads the whole catalogue, and a new
      // template that showed up in one but not the other is worse than a
      // refetch nobody needed.
      await qc.invalidateQueries({ queryKey: [...QUERY_KEYS.strategy.structures, 'templates'] })
      setNewOpen(false)
      setCode('')
      setName('')
      onCreated(strategy_template_id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="button" variant="outline" size="sm" className="h-6.5 text-dense-meta" onClick={() => setNewOpen(true)}>
          ＋ New template
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6.5 text-dense-meta"
          aria-expanded={dimsOpen}
          onClick={() => setDimsOpen((v) => !v)}
        >
          {dimsOpen ? 'Hide dimensions' : 'Dimensions…'}
        </Button>
        {editableTemplateId != null ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6.5 text-dense-meta"
            aria-expanded={editOpen}
            onClick={() => setEditOpen((v) => !v)}
          >
            {editOpen ? 'Hide template' : 'Edit this template…'}
          </Button>
        ) : null}
      </div>

      {editOpen && editableTemplateId != null ? (
        <div className="border p-2.5 mat-card">
          <TemplateEditor templateId={editableTemplateId} onDeleted={() => setEditOpen(false)} />
        </div>
      ) : null}

      {dimsOpen ? (
        <div className="flex flex-col gap-2 border px-3 py-2 mat-card">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className={positionsUi.cap}>Dimensions dictionary</span>
            <span className="text-dense-meta text-muted-foreground text-pretty">
              the six dim_type enums every template picks from
            </span>
          </div>
          {CATALOG_DIM_TYPES.map((dt) => (
            <DimRow key={dt} dimType={dt} rows={dims.data?.by_type[dt] ?? []} />
          ))}
          <p className="m-0 text-dense-caption leading-normal text-muted-foreground text-pretty">
            Add-only here. A code is referenced by templates, so renaming one is a data migration and deleting one can
            orphan a template — both stay on the Option Category page.
          </p>
        </div>
      ) : null}

      <Dialog open={newOpen} onOpenChange={(o) => (o ? undefined : setNewOpen(false))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New template</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-dense-meta">
              <span className="text-muted-foreground">Template code</span>
              <Input
                className="h-8 font-mono text-sm"
                value={code}
                autoFocus
                placeholder="bull_put_spread"
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void create()
                }}
                aria-label="Template code"
              />
              {code.trim() && toTemplateCode(code) !== code.trim() ? (
                <span className={cn(positionsUi.mono, 'text-dense-caption text-muted-foreground')}>
                  saved as {toTemplateCode(code) || '—'}
                </span>
              ) : null}
            </label>
            <label className="flex flex-col gap-1 text-dense-meta">
              <span className="text-muted-foreground">Display name</span>
              <Input
                className="h-8 text-sm"
                value={name}
                placeholder="Bull Put Spread"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void create()
                }}
                aria-label="Display name"
              />
            </label>
            <p className="m-0 text-dense-caption leading-normal text-muted-foreground text-pretty">
              It starts with no legs and no dimensions — set them in the dictionary above and on the Option Category
              page. Pick it below and this structure’s dimensions follow it.
            </p>
            {error ? <p className="m-0 text-dense-meta text-danger text-pretty">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={!toTemplateCode(code) || busy} onClick={() => void create()}>
              {busy ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DimRow({ dimType, rows }: { dimType: CatalogDimType; rows: { strategy_dim_id: number; code: string }[] }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    const c = code.trim().toLowerCase()
    if (!c || busy) return
    setBusy(true)
    try {
      await createDim(dimType, { code: c, display_label: c, sort_order: 0 })
      await qc.invalidateQueries({ queryKey: DIMS_KEY })
      setCode('')
      setAdding(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-[5.75rem_minmax(0,1fr)_auto] items-center gap-2.5">
      <span className={positionsUi.cap}>dim_{dimType}</span>
      <span className="flex flex-wrap items-center gap-1">
        {rows.length === 0 ? (
          <span className="text-dense-meta text-muted-foreground">no codes</span>
        ) : (
          rows.map((r) => (
            <span
              key={r.strategy_dim_id}
              className={cn(positionsUi.mono, 'border px-1.25 text-dense-caption text-secondary-foreground mat-tag')}
            >
              {r.code}
            </span>
          ))
        )}
        {adding ? (
          <Input
            className="h-5.5 w-28 font-mono text-xs"
            value={code}
            autoFocus
            placeholder="code"
            aria-label={`New dim_${dimType} code`}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add()
              if (e.key === 'Escape') setAdding(false)
            }}
            onBlur={() => void add()}
          />
        ) : null}
      </span>
      <button type="button" className={positionsUi.link} onClick={() => setAdding(true)} disabled={busy}>
        ＋ code
      </button>
    </div>
  )
}
