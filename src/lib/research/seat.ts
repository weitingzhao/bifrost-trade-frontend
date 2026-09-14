/**
 * The Research seat: which of the two postures the Owner is sitting in.
 *
 * One dimension the sidebar did not have. Research runs on its own or the
 * Owner opens the pages — manual and automatic, the two modes the business
 * actually has — and a one-column list had to carry both at once. The seat
 * picks which posture the Research group is laid out for; every route stays
 * reachable from every seat, folded rather than hidden.
 *
 * The Copilot was the third seat until 2026-09-14 (§11.0): conversation is an
 * action, not a place — ⌘J raises the panel on any page — so its rail slot is
 * gone and its pages (Desk · Daily Brief · Personas) live in the seat-free
 * `fold:copilot` beside Market. A stored `'copilot'` fails `isSeat` and falls
 * back to autopilot.
 *
 * Borrowed from the Ops Console's task-mode seats, scoped to Research only
 * (Owner's choice A, 2026-09-08). Persisted per browser; `?seat=` overrides.
 */
import { Bot, Wrench, type LucideIcon } from 'lucide-react'
import { STORAGE_KEYS } from '@/constants/storage'
import { createSeatModel } from '@/lib/nav/seatModel'

export type ResearchSeat = 'autopilot' | 'workbench'

/** Rail order (the design's): manual to automatic. The default landing is separate — see `fallback`. */
export const RESEARCH_SEATS: readonly ResearchSeat[] = ['workbench', 'autopilot']

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
  workbench: {
    id: 'workbench',
    label: 'Workbench',
    level: 'Level 1',
    claim: 'You open the pages.',
    icon: Wrench,
    home: '/research/workbench',
  },
}

const model = createSeatModel<ResearchSeat>({
  storageKey: STORAGE_KEYS.researchSeat,
  seats: RESEARCH_SEATS,
  fallback: 'autopilot',
})

export const isResearchSeat = model.isSeat
export const useResearchSeat = model.useSeat
export const getResearchSeat = model.getSeat
export const setResearchSeat = model.setSeat
