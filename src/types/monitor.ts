export interface DaemonHeartbeat {
  last_ts: number
  daemon_alive: boolean
  ib_connected: boolean
  ib_client_id: number | null
  next_retry_ts: number | null
  seconds_until_retry: number | null
  heartbeat_interval_sec: number | null
  redis_quotes_connected: boolean
  mock_hedging: boolean
  last_control_message: string | null
  hedge_running: boolean
  graceful_shutdown_at: number | null
}

export interface IbPositionRow {
  account?: string
  symbol?: string
  secType?: string
  position?: number
  avgCost?: number | null
  price?: number | null
  unrealized_pnl?: number | null
  strike?: number
  right?: string
  expiry?: string
  lastTradeDateOrContractMonth?: string
  contract_key?: string | null
  updated_at?: number | null
  price_updated_at?: number | null
  daily_prev_close?: number | null
  category_id?: number | null
  category?: string | null
  optionable?: boolean
  strategy_opportunity_name?: string | null
  strategy_instance_label?: string | null
}

export interface IbAccountSnapshot {
  account_id?: string
  summary?: Record<string, string>
  positions?: IbPositionRow[]
}

export interface AccountSyncHeartbeat {
  last_ts: number | null
  daemon_alive: boolean
  heartbeat_interval_sec: number
  last_sync_version: number
  stream_lag: number
  accounts_synced?: number
  positions_synced?: number
  executions_synced?: number
  open_orders_synced?: number
}

export interface StrategyActiveRef {
  id?: number | null
  name?: string | null
}

export interface StatusStrategyActive {
  structure?: StrategyActiveRef
  gate_safety?: StrategyActiveRef
  allocation?: StrategyActiveRef
}

export interface StatusStrategy {
  active?: StatusStrategyActive
}

export interface StatusMarketData {
  quotes_redis_reader_ok?: boolean
}

/** One IB API connection slot in Redis health (host or secondary TWS connection). */
export interface SocketIbSlot {
  connected?: boolean
  client_id?: number | null
  last_error?: string | null
  reconnects?: number | null
  last_ib_probe_at?: number | null
  ib_probe_interval_sec?: number | null
  ib_probe_ok?: boolean
  next_ib_probe_in_s?: number | null
  ib_probe_stale?: boolean
}

/** GET /status `socket.massive` — Massive WS ingest Redis meta. */
export interface StatusSocketMassive {
  ws_connected?: boolean
  last_msg_age_s?: number | null
  ws_reconnects?: number | null
}

export interface StatusSocketIbIngestor {
  connected?: boolean
  last_msg_age_s?: number | null
  reconnects?: number | null
  msg_count?: number | null
  client_id?: number | null
  last_ib_probe_at?: number | null
  ib_probe_interval_sec?: number | null
  ib_probe_ok?: boolean
  next_ib_probe_in_s?: number | null
  ib_probe_stale?: boolean
  next_service_heartbeat_in_s?: number | null
  service_heartbeat_reconnect_in_progress?: string | null
}

export interface StatusSocketIbOperator {
  service_alive?: boolean
  /** Legacy alias for service_alive. */
  operator_alive?: boolean
  connected?: boolean
  msg_count?: number | null
  last_msg_age_s?: number | null
  reconnects?: number | null
  next_service_heartbeat_in_s?: number | null
  service_heartbeat_reconnect_in_progress?: string | null
  host?: SocketIbSlot
  secondary?: SocketIbSlot
  account?: SocketIbSlot
  market?: SocketIbSlot
}

export interface StatusSocketIbAccountAgent {
  connected?: boolean
  service_alive?: boolean
  /** Legacy alias for service_alive. */
  operator_alive?: boolean
  last_msg_age_s?: number | null
  reconnects?: number | null
  msg_count?: number | null
  client_id?: number | null
  next_service_heartbeat_in_s?: number | null
  service_heartbeat_reconnect_in_progress?: string | null
  host?: SocketIbSlot | null
  secondary?: SocketIbSlot | null
}

export interface StatusSocket {
  massive?: StatusSocketMassive | null
  ib_ingestor?: StatusSocketIbIngestor | null
  ib_operator?: StatusSocketIbOperator | null
  ib_account_agent?: StatusSocketIbAccountAgent | null
}

export interface Operation {
  daemon_auto_operations_id?: number
  ts: number
  type?: string
  side?: string
  quantity?: number
  price?: number
  state_reason?: string
}

export interface StatusLiveUi {
  subscribed_tickers?: string[]
  reference_indices?: { symbol: string; label?: string; polygon_ticker?: string }[]
}

// ─── IB Config types (from GET /status config.ib_client + YAML) ──────────────

export interface IbClientNetwork {
  host_ip?: string
  host_port_type?: 'tws_live' | 'tws_paper' | 'gateway'
  host_port?: number | null
  secondary_host_ip?: string | null
  secondary_port_type?: 'tws_live' | 'tws_paper' | 'gateway' | string | null
  secondary_port?: number | null
}

/** IB API client_id slots from YAML (read-only in Settings). JSON key `port`. */
export interface IbClientPort {
  trading?: number
  listener_host?: number
  listener_secondary?: number
  operator_host?: number
  operator_secondary?: number
  ingestor?: number
  account_agent?: number
  account_agent_secondary?: number
  market_data_worker?: number
}

/** Trading / event stream account IDs from DB settings (editable). */
export interface IbClientAccount {
  trading?: string | null
  event_host?: string | null
  event_secondary?: string | null
}

export interface IbClient {
  client?: IbClientNetwork
  port?: IbClientPort
  account?: IbClientAccount
  timeout_sec?: number
}

/** One row of Flex Query config (cash_transactions or trades). */
export interface FlexAccountItem {
  query_host_id: string
  query_secondary_id?: string | null
  query_label?: string | null
  purpose?: string | null
}

/** GET /status `config.ib_flex` — Flex tokens + query rows + range day preferences. */
export interface StatusIbFlex {
  host_token?: string | null
  secondary_token?: string | null
  rows?: FlexAccountItem[]
  default_range_days?: number | null
  init_range_days?: number | null
}

// ─── Status response ──────────────────────────────────────────────────────────

export interface StatusResponse {
  status_schema_version: number
  health: {
    status_lamp: string
    block_reasons: string[]
  }
  daemon: {
    heartbeat: DaemonHeartbeat | null
    lamp: string
    block_reasons: string[]
    self_check?: string
    trading: {
      trading_suspended: boolean
      auto_status?: {
        ts?: number
        daemon_state?: string
        trading_state?: string
        spot?: number
        stock_position?: number
        daily_hedge_count?: number
        account_id?: string | null
        account_net_liquidation?: number | null
      } | null
    }
  }
  portfolio: {
    accounts: IbAccountSnapshot[] | null
    accounts_fetched_at: number | null
    open_orders: OpenOrderRow[]
  }
  celery: {
    broker_connected: boolean
    workers: string[]
    worker_ib_connected: boolean
    worker_ib_client_id: number | null
  }
  config?: {
    ib_client?: IbClient
    ib_flex?: StatusIbFlex
  }
  account_sync_daemon: {
    heartbeat: AccountSyncHeartbeat
  } | null
  strategy?: StatusStrategy
  market_data?: StatusMarketData
  socket?: StatusSocket
  live_ui?: StatusLiveUi
}

export interface OpenOrderRow {
  order_id?: number | null
  perm_id?: number | null
  account_id?: string | null
  symbol?: string | null
  sec_type?: string | null
  action?: string | null
  total_quantity?: number | null
  filled?: number | null
  remaining?: number | null
  limit_price?: number | null
  status?: string | null
  contract_key?: string | null
  updated_ts?: number | null
}

/** Risk/post-mortem summary (GET /risk_summary). */
export interface RiskSummaryResponse {
  daily_hedge_count?: number | null
  daily_pnl?: number | null
  spot?: number | null
  symbol?: string | null
  operations_count_24h?: number
  block_reasons?: string[]
  ts?: number | null
}
