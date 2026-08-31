import type { DenseTagVariant } from '@/components/data-display'

export function ratingTagVariant(rating: string): DenseTagVariant {
  if (rating === 'A') return 'success'
  if (rating === 'B') return 'info'
  if (rating === 'C') return 'warning'
  return 'danger'
}

export function riskTagVariant(risk: string): DenseTagVariant {
  if (risk === 'low') return 'neutral'
  if (risk === 'medium') return 'warning'
  return 'danger'
}
