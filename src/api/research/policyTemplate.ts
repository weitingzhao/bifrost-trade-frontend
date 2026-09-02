/**
 * Loop policy templates (P0-2).
 *
 * The Console used to print two hardcoded constants as read-only JSON, so the
 * Loop's strategy could not be tuned without a frontend release — and the
 * backend held its own copy that was free to drift from them. These read the
 * templates the runtime actually uses.
 */
import { withValidation } from '@/lib/apiValidation'
import { researchEngineUrl } from '@/lib/devApiUrl'
import { unwrapResearchEnvelope } from '@/lib/researchEnvelope'
import {
  PolicyTemplateListSchema,
  PolicyTemplateSchema,
  PolicyValidationSchema,
} from '@/lib/schemas/research'

export interface PolicyTemplate {
  id: string
  name: string
  description: string
  universe_mode: string
  policy_json: Record<string, unknown>
  is_default: boolean
  owner_id: string
  created_at: string
  updated_at: string
  /** Non-fatal notes from validate_policy_for_mode — shown, never swallowed. */
  warnings?: string[]
}

export interface PolicyValidation {
  policy_json: Record<string, unknown>
  warnings: string[]
}

const BASE = '/research/policy-templates'
const LABEL = { apiLabel: 'Policy templates' }

// Research and the frontend ship on separate chains, so the console may be newer
// or older than the API it talks to. These warn on drift in dev and pass the
// payload through in production rather than blanking the panel.
const validateList = withValidation<{ items: PolicyTemplate[] }>(
  PolicyTemplateListSchema,
  'Policy templates list',
)
const validateOne = withValidation<PolicyTemplate>(PolicyTemplateSchema, 'Policy template')
const validateCheck = withValidation<PolicyValidation>(
  PolicyValidationSchema,
  'Policy validation',
)

export async function fetchPolicyTemplates(params?: {
  universeMode?: string
}): Promise<{ items: PolicyTemplate[] }> {
  const qs = params?.universeMode
    ? `?universe_mode=${encodeURIComponent(params.universeMode)}`
    : ''
  const res = await fetch(`${researchEngineUrl(BASE)}${qs}`)
  return validateList(await unwrapResearchEnvelope(res, LABEL))
}

/**
 * Dry-run a policy without saving.
 *
 * Called before save so an invalid shape is refused with the parser's own
 * message, and so "min_hit_rate is ignored without flag_filter" is visible while
 * editing rather than discovered from a run that quietly filtered nothing.
 */
export async function validatePolicy(
  policyJson: Record<string, unknown>,
): Promise<PolicyValidation> {
  const res = await fetch(researchEngineUrl(`${BASE}/validate`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ policy_json: policyJson }),
  })
  return validateCheck(await unwrapResearchEnvelope(res, LABEL))
}

export async function createPolicyTemplate(body: {
  name: string
  policy_json: Record<string, unknown>
  description?: string
  is_default?: boolean
}): Promise<PolicyTemplate> {
  const res = await fetch(researchEngineUrl(BASE), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return validateOne(await unwrapResearchEnvelope(res, LABEL))
}

export async function patchPolicyTemplate(
  id: string,
  body: {
    name?: string
    description?: string
    policy_json?: Record<string, unknown>
    is_default?: boolean
  },
): Promise<PolicyTemplate> {
  const res = await fetch(researchEngineUrl(`${BASE}/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return validateOne(await unwrapResearchEnvelope(res, LABEL))
}

export async function deletePolicyTemplate(id: string): Promise<{ deleted: boolean }> {
  const res = await fetch(researchEngineUrl(`${BASE}/${encodeURIComponent(id)}`), {
    method: 'DELETE',
  })
  return unwrapResearchEnvelope(res, LABEL)
}
