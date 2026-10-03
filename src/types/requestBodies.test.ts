/**
 * The FE's write payloads against the api 0.3.1 request models — checked by
 * `tsc -b`, which compiles this file. From 0.3.2 an undeclared field is a 422,
 * so a payload type may only name fields its model declares, each of a type
 * the model accepts. A `false` below is a compile error naming the payload.
 */
import { describe, expect, it } from 'vitest'
import type {
  ExecutionCreateBody,
  ExecutionUpdateBody,
  FillSplitItem,
  GateSetBody,
  InstrumentClassBody,
  OptionStockLinkBatchItem,
  OptionStockLinkBody,
  PositionCategoryBody,
  PositionTagBody,
  SavedSearchBody,
  StructureBody,
  StructureLegItem,
  StructureMetaItem,
  SymbolOrderBody,
  TemplateBody,
  TemplateLegItem,
  TemplateParamItem,
  WatchlistBody,
} from './requestBodies'
import type {
  CreateTemplateBody,
  GateSetPayload,
  MetaParamPayload,
  StructureLeg,
  StructureMetaEntry,
  StructurePayload,
  TemplateLegPayload,
} from './strategy'
import type { CreateExecutionBody, UpdateExecutionBody } from './positions'
import type { TagPositionRequest } from './portfolio'
import type { OptionStockLinkBatch } from './trading'
import type { SavedSearchCreate } from '@/api/savedSearches'
import type { OptionStockLinkCreate } from '@/api/trading'
import type { postWatchlistItem } from '@/api/market'

/** True when `Fe` names only fields of `Model`, each assignable to the model's type. */
type Conforms<Fe, Model> = [Exclude<keyof Fe, keyof Model>] extends [never]
  ? Fe extends Model
    ? true
    : false
  : false

type Item<A> = A extends readonly (infer T)[] ? T : never
type FillSplitRow = Item<NonNullable<CreateExecutionBody['fill_splits']>>

const CHECKS = {
  // strategy
  CreateTemplateBody: true satisfies Conforms<CreateTemplateBody, TemplateBody>,
  TemplateLegPayload: true satisfies Conforms<TemplateLegPayload, TemplateLegItem>,
  MetaParamPayload: true satisfies Conforms<MetaParamPayload, TemplateParamItem>,
  StructurePayload: true satisfies Conforms<StructurePayload, StructureBody>,
  StructureLeg: true satisfies Conforms<StructureLeg, StructureLegItem>,
  StructureMetaEntry: true satisfies Conforms<StructureMetaEntry, StructureMetaItem>,
  GateSetPayload: true satisfies Conforms<GateSetPayload, GateSetBody>,
  SavedSearchCreate: true satisfies Conforms<SavedSearchCreate, SavedSearchBody>,
  // portfolio
  TagPositionRequest: true satisfies Conforms<TagPositionRequest, PositionTagBody>,
  // trading
  CreateExecutionBody: true satisfies Conforms<CreateExecutionBody, ExecutionCreateBody>,
  UpdateExecutionBody: true satisfies Conforms<UpdateExecutionBody, ExecutionUpdateBody>,
  FillSplitRow: true satisfies Conforms<FillSplitRow, FillSplitItem>,
  OptionStockLinkCreate: true satisfies Conforms<OptionStockLinkCreate, OptionStockLinkBody>,
  OptionStockLinkBatch: true satisfies Conforms<OptionStockLinkBatch, OptionStockLinkBatchItem>,
  // market
  WatchlistItem: true satisfies Conforms<Parameters<typeof postWatchlistItem>[0], WatchlistBody>,
} as const

// Bodies built inline in the API modules are annotated with the model itself
// (`const body: SymbolOrderBody = …`), so the object literal's excess-property
// check covers them; these keep the models referenced from one place.
type InlineBodies = [PositionCategoryBody, SymbolOrderBody, InstrumentClassBody]

describe('request payloads conform to the api 0.3.1 request models', () => {
  it('declares every payload it checks', () => {
    const inline: InlineBodies = [{ name: 'Fixture' }, { symbols: [] }, { instrument_class: 'stock' }]
    expect(inline).toHaveLength(3)
    expect(Object.values(CHECKS).every(Boolean)).toBe(true)
    expect(Object.keys(CHECKS)).toHaveLength(15)
  })
})
