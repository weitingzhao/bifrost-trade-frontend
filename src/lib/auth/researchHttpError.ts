/** HTTP status from a Research Engine fetch — the 401 empty-state split hangs on this. */

export class ResearchHttpError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ResearchHttpError'
    this.status = status
  }
}

export function researchHttpStatus(error: unknown): number | null {
  return error instanceof ResearchHttpError ? error.status : null
}

export function researchThrowHttp(res: Response, label: string): never {
  throw new ResearchHttpError(res.status, `${label} HTTP ${res.status}`)
}
