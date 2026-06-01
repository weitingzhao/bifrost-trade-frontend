import type { LogLevel } from '@/hooks/useLogStream'

export const LEVEL_STYLE: Record<LogLevel, { badge: string; row: string }> = {
  ERROR: { badge: 'bg-red-500/15 text-red-500', row: 'bg-red-500/[0.04]' },
  WARN:  { badge: 'bg-yellow-500/15 text-yellow-500 dark:text-yellow-400', row: 'bg-yellow-500/[0.03]' },
  INFO:  { badge: 'bg-blue-500/10 text-blue-500', row: '' },
  DEBUG: { badge: 'bg-zinc-500/10 text-zinc-500', row: '' },
  OTHER: { badge: 'bg-zinc-500/10 text-zinc-400', row: '' },
}

export const LEVEL_LABELS: Record<LogLevel, string> = {
  ERROR: 'ERR', WARN: 'WARN', INFO: 'INFO', DEBUG: 'DBG', OTHER: '···',
}

export const STREAM_STATUS_LABEL: Record<string, string> = {
  idle: 'Idle',
  connecting: 'Connecting…',
  live: 'Live',
  error: 'Disconnected',
}
