import { z } from 'zod'

// Ops Platform plugin status — platform-api GET /api/v1/plugins/{name}/status,
// reached same-origin through the Trade gateway at /api/platform (see
// bifrost-trade-infra k8s/base/ingress/middlewares.yaml).
//
// Each plugin answers a different shape: market-data and flex-query carry
// deployments + workers, ib-gateway carries slots/mode/autonomy, research
// carries almost nothing. Only `reachable` is common to all of them, so the
// spine is deliberately thin and everything else is optional + passthrough.

const DeploymentSchema = z.object({
  namespace: z.string().optional(),
  name: z.string().optional(),
  ready: z.string().optional(),
  reachability: z.string().optional(),
  detail: z.string().optional(),
}).passthrough()

const WorkerSchema = z.object({
  pool: z.string().optional(),
  status: z.string().optional(),
  jobs_done: z.number().optional(),
  jobs_failed: z.number().optional(),
  uptime_sec: z.number().optional(),
  last_claim_at: z.string().optional(),
}).passthrough()

export const PluginStatusSchema = z.object({
  reachable: z.boolean(),
  reachability: z.string().optional(),
  summary: z.string().optional(),
  error: z.string().optional(),
  hint: z.string().optional(),
  generated_at: z.string().optional(),
  deployments: z.array(DeploymentSchema).optional(),
  workers: z.array(WorkerSchema).optional(),
}).passthrough()

/**
 * Triggering a Research CronJob answers with the Job it created. The UI shows
 * `job_name` back to the operator as the receipt, so the field has to be there.
 */
export const ResearchCronJobTriggerResponseSchema = z
  .object({
    ok: z.boolean(),
    job_name: z.string(),
    cronjob: z.string(),
    namespace: z.string(),
    started_at: z.string(),
    trigger_id: z.string(),
  })
  .passthrough()

/** Ops identity and grants — what the console is allowed to offer this seat. */
export const OpsCapabilitiesSchema = z.object({ ok: z.boolean() }).passthrough()

export const SystemMessagesResponseSchema = z
  .object({ messages: z.array(z.unknown()) })
  .passthrough()

/**
 * The persona the Copilot answers with. `guardrail_locked` decides whether the
 * UI offers an edit control at all, so it must survive validation as a boolean.
 */
export const AgentPersonaSchema = z
  .object({
    owner_id: z.string(),
    agent_name: z.string(),
    persona_md: z.string(),
    guardrail_locked: z.boolean(),
    seeded: z.boolean(),
    updated_at: z.string(),
  })
  .passthrough()

export const AgentPersonaListSchema = z.array(AgentPersonaSchema)

/**
 * Flex tokens are reported as set/last4 only — the plugin never returns the
 * token itself, and this schema exists partly to keep that shape honest.
 */
export const FlexConfigSummarySchema = z
  .object({
    tokens: z
      .object({
        host_token_set: z.boolean(),
        secondary_token_set: z.boolean(),
      })
      .passthrough(),
    range_days: z.object({ default: z.number(), init: z.number() }).passthrough(),
    query_rows: z.array(z.unknown()),
  })
  .passthrough()

export const FlexCoverageFreshnessResponseSchema = z
  .object({ dimensions: z.array(z.unknown()) })
  .passthrough()
