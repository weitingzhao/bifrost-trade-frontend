import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export function LedgerSortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown className="inline h-3 w-3 ml-0.5 opacity-40" />
  return dir === 'asc'
    ? <ArrowUp className="inline h-3 w-3 ml-0.5 text-primary" />
    : <ArrowDown className="inline h-3 w-3 ml-0.5 text-primary" />
}
