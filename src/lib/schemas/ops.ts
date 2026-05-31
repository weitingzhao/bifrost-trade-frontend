import { z } from 'zod'

const BrokerStatusSchema = z.object({
  connected: z.boolean(),
  url_masked: z.string(),
  used_memory_human: z.string().nullable(),
  connected_clients: z.number().nullable(),
  queues: z.record(z.string(), z.number()).nullable(),
}).passthrough()

const WorkerSummarySchema = z.object({
  worker_id: z.string(),
  status: z.string(),
  queues: z.array(z.string()),
  concurrency: z.number(),
  active_tasks: z.number(),
  reserved_tasks: z.number(),
  last_heartbeat: z.number().nullable(),
}).passthrough()

export const WorkersResponseSchema = z.object({
  ok: z.boolean(),
  workers: z.array(WorkerSummarySchema),
  broker: BrokerStatusSchema,
  count: z.number(),
  error: z.string().nullable(),
}).passthrough()

const QueueSummaryRowSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  pending_broker: z.number(),
  running_celery: z.number(),
  done_db: z.number(),
  failed_db: z.number(),
}).passthrough()

export const QueuesResponseSchema = z.object({
  ok: z.boolean(),
  queues: z.array(QueueSummaryRowSchema),
  db_connected: z.boolean(),
}).passthrough()
