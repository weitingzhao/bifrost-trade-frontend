import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  optionCategoryInlineInputDefaultClass,
  optionCategoryInlineInputLabelClass,
  optionCategoryInlineSelectDefaultClass,
  optionCategoryInlineSelectKeyClass,
  optionCategoryInlineSelectKindClass,
  optionCategoryMetaFooterClass,
  optionCategoryMetaTableClass,
  optionCategoryTableCellSelectClass,
} from '@/pages/strategy/optionCategory/optionCategoryFormUi'
import { OptionCategoryMetaColgroup } from '@/pages/strategy/optionCategory/optionCategoryTableColgroups'

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
          <NestedDenseTable tableClassName={optionCategoryMetaTableClass}>
            <OptionCategoryMetaColgroup />
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
                  <DenseTableCell className={optionCategoryTableCellSelectClass}>
                    <Select
                      value={p.meta_key}
                      onValueChange={(v) => {
                        const mp = [...params]
                        mp[i] = { ...mp[i], meta_key: v }
                        updateParams(mp)
                        void loadValueOpts(v, detail.template_code)
                      }}
                    >
                      <SelectTrigger className={optionCategoryInlineSelectKeyClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {metaKeyOpts.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                        {!metaKeyOpts.some((o) => o.value === p.meta_key) ? (
                          <SelectItem value={p.meta_key}>{p.meta_key}</SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
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
                  <DenseTableCell className={optionCategoryTableCellSelectClass}>
                    {(valueOptsByKey[p.meta_key]?.length ?? 0) > 0 ? (
                      <Select
                        value={p.default_value_text || '__empty__'}
                        onValueChange={(v) => {
                          const mp = [...params]
                          mp[i] = { ...mp[i], default_value_text: v === '__empty__' ? '' : v }
                          updateParams(mp)
                        }}
                      >
                        <SelectTrigger className={optionCategoryInlineSelectDefaultClass} onFocus={() => void loadValueOpts(p.meta_key, detail.template_code)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__">—</SelectItem>
                          {(valueOptsByKey[p.meta_key] ?? []).map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  <DenseTableCell className={optionCategoryTableCellSelectClass}>
                    <Select
                      value={p.param_kind ?? 'fixed'}
                      onValueChange={(v) => {
                        const mp = [...params]
                        mp[i] = { ...mp[i], param_kind: v }
                        updateParams(mp)
                      }}
                    >
                      <SelectTrigger className={optionCategoryInlineSelectKindClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paramKindOpts.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
