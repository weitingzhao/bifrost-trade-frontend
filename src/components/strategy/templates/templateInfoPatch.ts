/**
 * The template editor's Info save as PATCH /strategies/templates/{id} takes it
 * (api 0.3.0, TD-15).
 *
 * The server refuses a blank text ("explanation is blank; send null to clear
 * it"), so an emptied box goes as `null` — that is how a field is cleared. The
 * six dimensions are already `null` when set to —; a blank one is treated the
 * same. `display_name` is required: a blank one is sent as typed and the
 * server's 400 says so, rather than the editor inventing a name.
 */
import type { TemplateInfoPatch } from '@/api/strategy'
import type { StrategyTemplateDetail } from '@/types/positions'

function textOrNull(v: string | null | undefined): string | null {
  return v == null || v.trim() === '' ? null : v
}

/** The template code as the server keys it: lower snake case, or null when it could not be one. */
export function normalTemplateCode(raw: string): string | null {
  const code = raw.trim().toLowerCase().replace(/\s+/g, '_')
  return code && /^[a-z][a-z0-9_]*$/.test(code) ? code : null
}

export function templateInfoPatch(detail: StrategyTemplateDetail, code: string): TemplateInfoPatch {
  return {
    template_code: code,
    display_name: detail.display_name,
    dim_direction: textOrNull(detail.dim_direction),
    dim_structure: textOrNull(detail.dim_structure),
    dim_coverage: textOrNull(detail.dim_coverage),
    dim_risk: textOrNull(detail.dim_risk),
    dim_volatility: textOrNull(detail.dim_volatility),
    dim_time: textOrNull(detail.dim_time),
    explanation: textOrNull(detail.explanation),
    typical_use: textOrNull(detail.typical_use),
    example: textOrNull(detail.example),
    nature: textOrNull(detail.nature),
    sort_order: detail.sort_order,
    is_active: detail.is_active,
  }
}
