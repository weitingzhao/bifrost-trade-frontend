import { z } from 'zod'

const DaemonHeartbeatSchema = z.object({
  last_ts: z.number(),
  daemon_alive: z.boolean(),
  ib_connected: z.boolean(),
}).passthrough()

const OperationSchema = z.object({
  ts: z.number(),
  type: z.string().optional(),
  side: z.string().optional(),
  quantity: z.number().optional(),
  price: z.number().optional(),
}).passthrough()

// StatusResponse is deeply nested — validate the structural spine only.
// Inner sections use .passthrough() so extra/missing optional fields don't fail.
export const StatusResponseSchema = z.object({
  status_schema_version: z.number(),
  health: z.object({
    status_lamp: z.string(),
    block_reasons: z.array(z.string()),
  }).passthrough(),
  daemon: z.object({
    heartbeat: DaemonHeartbeatSchema.nullable(),
    lamp: z.string(),
    block_reasons: z.array(z.string()),
  }).passthrough(),
  portfolio: z.object({
    accounts: z.array(z.object({}).passthrough()).nullable(),
    accounts_fetched_at: z.number().nullable(),
  }).passthrough(),
  celery: z.object({
    broker_connected: z.boolean(),
  }).passthrough(),
}).passthrough()

export const OperationsResponseSchema = z.object({
  operations: z.array(OperationSchema),
}).passthrough()
