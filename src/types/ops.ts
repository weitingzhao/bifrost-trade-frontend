export interface BrokerStatus {
  connected: boolean
  url_masked: string
  used_memory_human: string | null
  connected_clients: number | null
  queues: Record<string, number> | null
}

export interface ExtendedBrokerStatus extends BrokerStatus {
  locally_managed: boolean
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

export interface JobQueueStatusCounts {
  pending: number
  running: number
  done: number
  failed: number
}

export interface AggregatedJobQueueSummaryRow {
  profile_key: string
  label: string
  celery_queue: string
  pipeline: 'stocks_ib' | 'massive_async'
  counts: JobQueueStatusCounts
}

export interface AggregatedJobQueuesSummaryResponse {
  ok: boolean
  rows: AggregatedJobQueueSummaryRow[]
  error?: string
}

export interface WorkerProfileInfo {
  key: string
  label: string
  queues: string[]
  max_worker_instances?: number
}

export interface WorkerProfilesResponse {
  ok: boolean
  profiles: WorkerProfileInfo[]
  count: number
  error?: string
}

export interface SystemdInstance {
  unit: string
  load: string
  active: string
  sub: string
  description: string
}

export interface WorkerInstancesResponse {
  ok: boolean
  instances: SystemdInstance[]
  count: number
  error?: string
}

export interface CelerySupportedTaskRow {
  name: string
  default_queue: string
  task_route_default_queue?: string
}

export interface CeleryCapabilitiesResponse {
  ok: boolean
  registered_tasks: CelerySupportedTaskRow[]
  count: number
  canonical_broker_queues: string[]
  broker_queue_labels?: Record<string, string>
  error?: string
}

export interface MassiveJobApiRow {
  job_id: string
  type?: string
  kind?: string
  goal?: string
  status?: string
  result?: unknown
  created_ts?: number
  updated_ts?: number
}

export interface BarsJob {
  job_id: string
  type: string
  symbol: string
  period: string
  status: 'pending' | 'running' | 'done' | 'failed'
  result?: { ok?: boolean; count?: number; message?: string; error?: string }
  created_ts?: number
  updated_ts?: number
}

export interface MassiveCeleryBeatEntry {
  name: string
  task: string
  label: string
  crontab: Record<string, string | number>
}

export interface MassiveCeleryBeatScheduleResponse {
  ok: boolean
  timezone?: string
  entries?: MassiveCeleryBeatEntry[]
  error?: string
}

export type BrokerAction = 'start' | 'stop' | 'restart'

export type ScaleAction = 'add' | 'remove'

export interface ScaleResult {
  ok: boolean
  action?: string
  unit?: string
  instance_id?: string
  worker_type?: string
  error?: string
}

export interface AuditEntry {
  timestamp: number
  operator: string
  source_ip: string | null
  action: string
  target: string
  command_id: string | null
  outcome: string
  detail: string | null
}
