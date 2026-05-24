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

export interface QueueSummaryRow {
  name: string
  display_name: string
  pending_broker: number
  running_celery: number
  done_db: number
  failed_db: number
  db_totals_shared?: boolean
}

export interface QueuesResponse {
  ok: boolean
  queues: QueueSummaryRow[]
  db_connected: boolean
}
