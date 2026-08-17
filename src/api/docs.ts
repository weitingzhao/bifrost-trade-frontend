import { postControlShutdown } from '@/api/apiControl'
import { docsUrl } from '@/lib/devApiUrl'

export async function postDocsShutdown(): Promise<{ ok: boolean; error?: string }> {
  return postControlShutdown(docsUrl('/research/docs/shutdown'))
}
