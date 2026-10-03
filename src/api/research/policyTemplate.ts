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
import { requestJson } from '@/lib/http'
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
const LABEL = 'Policy templates'

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
  return validateList(
    await requestJson<unknown>(`${researchEngineUrl(BASE)}${qs}`, { envelope: 'research', label: LABEL }),
  )
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
  return validateCheck(
    await requestJson<unknown>(researchEngineUrl(`${BASE}/validate`), {
      method: 'POST',
      body: { policy_json: policyJson },
      envelope: 'research',
      label: LABEL,
    }),
  )
}

export async function createPolicyTemplate(body: {
  name: string
  policy_json: Record<string, unknown>
  description?: string
  is_default?: boolean
}): Promise<PolicyTemplate> {
  return validateOne(
    await requestJson<unknown>(researchEngineUrl(BASE), {
      method: 'POST',
      body,
      envelope: 'research',
      label: LABEL,
    }),
  )
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
  return validateOne(
    await requestJson<unknown>(researchEngineUrl(`${BASE}/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      body,
      envelope: 'research',
      label: LABEL,
    }),
  )
}

export async function deletePolicyTemplate(id: string): Promise<{ deleted: boolean }> {
  return requestJson<{ deleted: boolean }>(researchEngineUrl(`${BASE}/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    envelope: 'research',
    label: LABEL,
  })
}
