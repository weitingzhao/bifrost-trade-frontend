import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { X } from 'lucide-react'
import { dangerTextBtnClass } from '@/lib/uiClasses'
import type { StrategyTemplateDetail, MetaParamItem, StructureTypeConfigOption } from '@/types/positions'
import { fetchMetaKeyOptions, fetchMetaValueOptions } from '@/api/strategy'

export function TemplateMetaEditor({
  detail,
  setDetail,
  paramKindOpts,
  onSave,
}: {
  detail: StrategyTemplateDetail
  setDetail: (d: StrategyTemplateDetail) => void
  paramKindOpts: StructureTypeConfigOption[]
  onSave: () => void
}) {
  const [metaKeyOpts, setMetaKeyOpts] = useState<StructureTypeConfigOption[]>([])
  const [valueOptsByKey, setValueOptsByKey] = useState<Record<string, StructureTypeConfigOption[]>>({})

  useEffect(() => {
    fetchMetaKeyOptions().then(r => setMetaKeyOpts(r.options)).catch(() => {})
  }, [])

  async function loadValueOpts(metaKey: string, templateCode: string) {
    if (valueOptsByKey[metaKey]) return
    const r = await fetchMetaValueOptions(templateCode, metaKey).catch(() => ({ options: [] }))
    if (r.options.length > 0) {
      setValueOptsByKey(prev => ({ ...prev, [metaKey]: r.options }))
    }
  }

  const params = detail.meta_params ?? []

  return (
    <>
      {params.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No meta parameters defined.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="h-7">Key</TableHead>
              <TableHead className="h-7">Label</TableHead>
              <TableHead className="h-7">Default</TableHead>
              <TableHead className="h-7">Kind</TableHead>
              <TableHead className="h-7 w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {params.map((p: MetaParamItem, i: number) => (
              <TableRow key={i} className="text-xs">
                <TableCell className="py-1">
                  <select
                    className="h-7 text-xs rounded border border-input bg-background px-2 focus:outline-none w-32"
                    value={p.meta_key}
                    onChange={e => {
                      const mp = [...params]
                      mp[i] = { ...mp[i], meta_key: e.target.value }
                      setDetail({ ...detail, meta_params: mp })
                      void loadValueOpts(e.target.value, detail.template_code)
                    }}
                  >
                    {metaKeyOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    {!metaKeyOpts.some(o => o.value === p.meta_key) && (
                      <option value={p.meta_key}>{p.meta_key}</option>
                    )}
                  </select>
                </TableCell>
                <TableCell className="py-1">
                  <Input
                    className="h-7 text-xs w-28"
                    value={p.display_label ?? ''}
                    onChange={e => {
                      const mp = [...params]
                      mp[i] = { ...mp[i], display_label: e.target.value }
                      setDetail({ ...detail, meta_params: mp })
                    }}
                  />
                </TableCell>
                <TableCell className="py-1">
                  {(valueOptsByKey[p.meta_key]?.length ?? 0) > 0 ? (
                    <select
                      className="h-7 text-xs rounded border border-input bg-background px-2 focus:outline-none w-28"
                      value={p.default_value_text ?? ''}
                      onFocus={() => void loadValueOpts(p.meta_key, detail.template_code)}
                      onChange={e => {
                        const mp = [...params]
                        mp[i] = { ...mp[i], default_value_text: e.target.value }
                        setDetail({ ...detail, meta_params: mp })
                      }}
                    >
                      <option value="">—</option>
                      {(valueOptsByKey[p.meta_key] ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <Input
                      className="h-7 text-xs w-28"
                      value={p.default_value_text ?? ''}
                      onFocus={() => void loadValueOpts(p.meta_key, detail.template_code)}
                      onChange={e => {
                        const mp = [...params]
                        mp[i] = { ...mp[i], default_value_text: e.target.value }
                        setDetail({ ...detail, meta_params: mp })
                      }}
                    />
                  )}
                </TableCell>
                <TableCell className="py-1">
                  <select
                    className="h-7 text-xs rounded border border-input bg-background px-2 focus:outline-none w-24"
                    value={p.param_kind ?? 'fixed'}
                    onChange={e => {
                      const mp = [...params]
                      mp[i] = { ...mp[i], param_kind: e.target.value }
                      setDetail({ ...detail, meta_params: mp })
                    }}
                  >
                    {paramKindOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </TableCell>
                <TableCell className="py-1">
                  <button
                    type="button"
                    className={dangerTextBtnClass}
                    onClick={() => {
                      const mp = [...params]
                      mp.splice(i, 1)
                      setDetail({ ...detail, meta_params: mp })
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="flex items-center justify-between mt-3">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setDetail({
            ...detail,
            meta_params: [...params, {
              meta_key: 'otm_pct',
              display_label: 'OTM %',
              param_kind: 'percent',
              default_value_text: null,
              sort_order: params.length,
            }],
          })}
        >
          + Add parameter
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={onSave}>Save</Button>
      </div>
    </>
  )
}
