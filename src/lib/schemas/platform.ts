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
