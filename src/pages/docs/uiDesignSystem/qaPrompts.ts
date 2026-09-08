/**
 * Backward-compatible exports — prefer buildPrompt(specId, scope) from ./buildPrompt.
 * @deprecated Use PromptCopyDialog + buildPrompt with scope instead of static QA strings.
 */
import { buildSitePrompt } from './buildPrompt'
import type { PromptSpecId } from './promptSpecs'

export { buildPrompt, buildSitePrompt } from './buildPrompt'
export { PROMPT_SPECS, getPromptSpec, type PromptSpecId } from './promptSpecs'
export {
  PROMPT_DOMAINS,
  PROMPT_PAGES,
  type PromptScope,
  type PromptDomainId,
} from './scopeRegistry'
export { PromptCopyDialog } from './PromptCopyDialog'

export const QA_PROMPT_PNL = buildSitePrompt('pnl')
export const QA_PROMPT_ENTITY = buildSitePrompt('entity')
export const QA_PROMPT_OPTION_CATEGORY = buildSitePrompt('option-category')
export const QA_PROMPT_CATEGORY = buildSitePrompt('position-category')
export const QA_PROMPT_STATUS = buildSitePrompt('status')
export const QA_PROMPT_DENSITY = buildSitePrompt('density')
export const QA_PROMPT_SURFACE = buildSitePrompt('surface')
export const QA_PROMPT_FULL = buildSitePrompt('full')

/** @deprecated Renamed to QA_PROMPT_OPTION_CATEGORY */
export const QA_PROMPT_ENTITY_LEGACY = QA_PROMPT_ENTITY

export function qaPromptForSpec(id: PromptSpecId): string {
  return buildSitePrompt(id)
}
