/**
 * The Research seat: which of the three postures the Owner is sitting in.
 *
 * One dimension the sidebar did not have. Research is used three ways — it
 * runs on its own, it works when asked, or the Owner opens the pages — and a
 * one-column list had to carry all three at once, so twenty-one workbench
 * pages sat beside the two things an autopilot session actually needs. The
 * seat picks which posture the Research group is laid out for; every route
 * stays reachable from every seat, folded rather than hidden.
 *
 * Borrowed from the Ops Console's task-mode seats, scoped to Research only
 * (Owner's choice A, 2026-09-08). Persisted per browser; `?seat=` overrides.
 */
import { Bot, MessageCircle, Wrench, type LucideIcon } from 'lucide-react'
import { STORAGE_KEYS } from '@/constants/storage'
import { createPersistedStore } from '@/lib/cockpit/externalStore'

export type ResearchSeat = 'autopilot' | 'copilot' | 'workbench'

export const RESEARCH_SEATS: readonly ResearchSeat[] = ['autopilot', 'copilot', 'workbench']

export interface SeatMeta {
  id: ResearchSeat
  label: string
  level: string
  /** What the system does in this posture, in one breath. */
  claim: string
  icon: LucideIcon
  /** Where the seat lands when the Owner switches to it. */
  home: string
}

export const SEAT_META: Record<ResearchSeat, SeatMeta> = {
  autopilot: {
    id: 'autopilot',
    label: 'Autopilot',
    level: 'Level 3',
    claim: 'It runs, judges and rates; you approve.',
    icon: Bot,
    home: '/research/loop/harness',
  },
  copilot: {
    id: 'copilot',
    label: 'Copilot',
    level: 'Level 2',
    claim: 'You ask; it reads the pages for you.',
    icon: MessageCircle,
    home: '/research/daily-brief',
  },
  workbench: {
    id: 'workbench',
    label: 'Workbench',
    level: 'Level 1',
    claim: 'You open the pages.',
    icon: Wrench,
    home: '/research/explorer',
  },
}

export function isResearchSeat(v: unknown): v is ResearchSeat {
  return typeof v === 'string' && (RESEARCH_SEATS as readonly string[]).includes(v)
}

const store = createPersistedStore<{ seat: ResearchSeat }>(
  STORAGE_KEYS.researchSeat,
  { seat: 'autopilot' },
  (s) => ({ seat: s.seat }),
)

export function useResearchSeat(): ResearchSeat {
  return store.useStore().seat
}

export function getResearchSeat(): ResearchSeat {
  return store.getState().seat
}

export function setResearchSeat(seat: ResearchSeat): void {
  if (!isResearchSeat(seat)) return
  store.setState({ seat })
}
