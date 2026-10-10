import type { ExhibitPayload } from '@/api/research/exhibit'

export function ivScore(exhibit: ExhibitPayload | undefined, key: string): number | null {
  const value = exhibit?.readings?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

