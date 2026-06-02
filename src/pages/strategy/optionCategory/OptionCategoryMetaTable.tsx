import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  IconActionButton,
  NestedDenseTable,
} from '@/components/data-display'
import { X } from 'lucide-react'
import type {
  StrategyTemplateDetail,
  MetaParamItem,
  StructureTypeConfigOption,
} from '@/types/positions'
import { fetchMetaKeyOptions, fetchMetaValueOptions } from '@/api/strategy'
import { SaveFeedback } from '@/pages/strategy/optionCategory/SaveFeedback'
import {
  optionCategoryEmptyHintClass,
  optionCategorySectionBodyCompactClass,
  optionCategorySectionHeaderClass,
  optionCategorySectionTitleClass,
} from '@/pages/strategy/optionCategory/optionCategoryUi'
import {
  optionCategoryCompactSelectClass,
  optionCategoryInlineInputDefaultClass,
  optionCategoryInlineInputLabelClass,
  optionCategoryInlineSelectKeyClass,
  optionCategoryInlineSelectKindClass,
  optionCategoryMetaFooterClass,
} from '@/pages/strategy/optionCategory/optionCategoryFormUi'

export interface OptionCategoryMetaTableProps {
  detail: StrategyTemplateDetail
  paramKindOpts: StructureTypeConfigOption[]
  feedback: { section: string; ok: boolean } | null
  onDetailChange: (d: StrategyTemplateDetail) => void
  onSave: () => void
}

export function OptionCategoryMetaTable({
  detail,
  paramKindOpts,
  feedback,
  onDetailChange,
  onSave,
}: OptionCategoryMetaTableProps) {
  const [metaKeyOpts, setMetaKeyOpts] = useState<StructureTypeConfigOption[]>([])
  const [valueOptsByKey, setValueOptsByKey] = useState<Record<string, StructureTypeConfigOption[]>>({})

  useEffect(() => {
    fetchMetaKeyOptions()
      .then((r) => setMetaKeyOpts(r.options))
      .catch(() => {})
  }, [])

  async function loadValueOpts(metaKey: string, templateCode: string) {
    if (valueOptsByKey[metaKey]) return
    const r = await fetchMetaValueOptions(templateCode, metaKey).catch(() => ({ options: [] }))
    if (r.options.length > 0) {
      setValueOptsByKey((prev) => ({ ...prev, [metaKey]: r.options }))
    }
  }

  const params = detail.meta_params ?? []

  function updateParams(mp: MetaParamItem[]) {
    onDetailChange({ ...detail, meta_params: mp })
  }

  return (
    <Card variant="elevated">
      <div className={optionCategorySectionHeaderClass}>
        <h3 className={optionCategorySectionTitleClass}>Meta Parameters</h3>
        <SaveFeedback section="params" feedback={feedback} />
      </div>
      <div className={optionCategorySectionBodyCompactClass}>
        {params.length === 0 ? (
          <p className={cn(optionCategoryEmptyHintClass, 'py-4 text-center')}>
            No meta parameters defined.
          </p>
        ) : (
          <NestedDenseTable>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Key</DenseTableHead>
                <DenseTableHead>Label</DenseTableHead>
                <DenseTableHead>Default</DenseTableHead>
                <DenseTableHead>Kind</DenseTableHead>
                <DenseTableHead className="w-8" />
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {params.map((p: MetaParamItem, i: number) => (
                <DenseTableRow key={i}>
                  <DenseTableCell>
                    <select
                      className={optionCategoryInlineSelectKeyClass}
                      value={p.meta_key}
                      onChange={(e) => {
                        const mp = [...params]
                        mp[i] = { ...mp[i], meta_key: e.target.value }
                        updateParams(mp)
                        void loadValueOpts(e.target.value, detail.template_code)
                      }}
                    >
                      {metaKeyOpts.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      {!metaKeyOpts.some((o) => o.value === p.meta_key) ? (
                        <option value={p.meta_key}>{p.meta_key}</option>
                      ) : null}
                    </select>
                  </DenseTableCell>
                  <DenseTableCell>
                    <Input
                      className={optionCategoryInlineInputLabelClass}
                      value={p.display_label ?? ''}
                      onChange={(e) => {
                        const mp = [...params]
                        mp[i] = { ...mp[i], display_label: e.target.value }
                        updateParams(mp)
                      }}
                    />
                  </DenseTableCell>
                  <DenseTableCell>
                    {(valueOptsByKey[p.meta_key]?.length ?? 0) > 0 ? (
                      <select
                        className={optionCategoryCompactSelectClass + ' w-28'}
                        value={p.default_value_text ?? ''}
                        onFocus={() => void loadValueOpts(p.meta_key, detail.template_code)}
                        onChange={(e) => {
                          const mp = [...params]
                          mp[i] = { ...mp[i], default_value_text: e.target.value }
                          updateParams(mp)
                        }}
                      >
                        <option value="">—</option>
                        {(valueOptsByKey[p.meta_key] ?? []).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        className={optionCategoryInlineInputDefaultClass}
                        value={p.default_value_text ?? ''}
                        onFocus={() => void loadValueOpts(p.meta_key, detail.template_code)}
                        onChange={(e) => {
                          const mp = [...params]
                          mp[i] = { ...mp[i], default_value_text: e.target.value }
                          updateParams(mp)
                        }}
                      />
                    )}
                  </DenseTableCell>
                  <DenseTableCell>
                    <select
                      className={optionCategoryInlineSelectKindClass}
                      value={p.param_kind ?? 'fixed'}
                      onChange={(e) => {
                        const mp = [...params]
                        mp[i] = { ...mp[i], param_kind: e.target.value }
                        updateParams(mp)
                      }}
                    >
                      {paramKindOpts.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </DenseTableCell>
                  <DenseTableCell>
                    <IconActionButton
                      tone="danger"
                      title="Remove parameter"
                      ariaLabel="Remove parameter"
                      onClick={() => {
                        const mp = [...params]
                        mp.splice(i, 1)
                        updateParams(mp)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </IconActionButton>
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </NestedDenseTable>
        )}
        <div className={optionCategoryMetaFooterClass}>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              updateParams([
                ...params,
                {
                  meta_key: 'otm_pct',
                  display_label: 'OTM %',
                  param_kind: 'percent',
                  default_value_text: null,
                  sort_order: params.length,
                },
              ])
            }
          >
            + Add parameter
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={onSave}>
            Save
          </Button>
        </div>
      </div>
    </Card>
  )
}
