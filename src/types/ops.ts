export interface BrokerStatus {
  connected: boolean
  url_masked: string
  used_memory_human: string | null
  connected_clients: number | null
  queues: Record<string, number> | null
}

export type WorkerStatus =
  | 'running_healthy'
  | 'running_degraded'
  | 'starting'
  | 'stopping'
  | 'stopped'
  | 'failed'
  | 'unknown'

export interface WorkerSummary {
  worker_id: string
  status: WorkerStatus
  queues: string[]
  concurrency: number
  active_tasks: number
  reserved_tasks: number
  last_heartbeat: number | null
  worker_config_profile: string | null
}

export interface WorkersResponse {
  ok: boolean
  workers: WorkerSummary[]
  broker: BrokerStatus
  count: number
  error: string | null
}

export interface QueueCounts {
  pending: number
  running: number
  done: number
  failed: number
}

export interface QueueSummaryRow {
  profile_key: string
  label: string
  celery_queue: string
  pipeline: string
  counts: QueueCounts
}

export interface QueuesResponse {
  ok: boolean
  rows: QueueSummaryRow[]
  error: string | null
}
