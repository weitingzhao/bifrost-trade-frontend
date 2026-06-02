import { postControlShutdown } from '@/api/apiControl'

const BASE = import.meta.env.VITE_API_DOCS as string

export async function postDocsShutdown(): Promise<{ ok: boolean; error?: string }> {
  return postControlShutdown(`${BASE.replace(/\/$/, '')}/research/docs/shutdown`)
}
