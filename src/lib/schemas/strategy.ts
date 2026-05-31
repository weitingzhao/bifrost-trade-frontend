import { z } from 'zod'

export const StrategyInstanceSchema = z.object({
  strategy_instance_id: z.number(),
  strategy_opportunity_id: z.number(),
  account_id: z.string(),
  label: z.string().nullable(),
  notes: z.string().nullable(),
  opened_at: z.string().nullable(),
  opened_at_epoch: z.number().nullable(),
  created_at: z.string().nullable(),
  created_at_epoch: z.number().nullable(),
  updated_at: z.string().nullable(),
  strategy_opportunity_name: z.string().nullable(),
  strategy_structure_id: z.number().nullable(),
  strategy_structure_name: z.string().nullable(),
  executions_count: z.number(),
}).passthrough()

export const StrategyInstancesResponseSchema = z.object({
  items: z.array(StrategyInstanceSchema),
}).passthrough()
