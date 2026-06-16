import type { LogEntry, LogLevel } from '@/hooks/useLogStream'

export const LEVEL_STYLE: Record<LogLevel, { badge: string; row: string }> = {
  ERROR: { badge: 'bg-danger-soft text-danger', row: 'bg-danger/[0.04]' },
  WARN:  { badge: 'bg-warning-soft text-warning', row: 'bg-warning/[0.03]' },
  INFO:  { badge: 'bg-accent-soft text-link', row: '' },
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

/** Log level toolbar preset — `ALERTS` = ERROR + WARN only (global LogPanel default). */
export type LevelFilterPreset = LogLevel | 'ALL' | 'ALERTS'

export const DEFAULT_LEVEL_FILTER: LevelFilterPreset = 'ALERTS'

export const LEVEL_FILTER_OPTIONS: LevelFilterPreset[] = [
  'ALERTS',
  'ALL',
  'ERROR',
  'WARN',
  'INFO',
  'DEBUG',
]

export function levelFilterLabel(filter: LevelFilterPreset): string {
  if (filter === 'ALL') return 'All'
  if (filter === 'ALERTS') return 'Err · Warn'
  return LEVEL_LABELS[filter]
}

export function levelFilterExportLabel(filter: LevelFilterPreset): string {
  if (filter === 'ALL') return 'ALL'
  if (filter === 'ALERTS') return 'ERROR + WARN'
  return LEVEL_LABELS[filter]
}

export function entryMatchesLevelFilter(level: LogLevel, filter: LevelFilterPreset): boolean {
  if (filter === 'ALL') return true
  if (filter === 'ALERTS') return level === 'ERROR' || level === 'WARN'
  return level === filter
}

export function filterLogEntries(entries: LogEntry[], filter: LevelFilterPreset): LogEntry[] {
  if (filter === 'ALL') return entries
  return entries.filter(e => entryMatchesLevelFilter(e.level, filter))
}
