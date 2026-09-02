export class HttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

/**
 * A stable, machine-readable error classification that rides alongside the
 * human-readable message. The frontend uses this (not string-matching on
 * `message`) to decide which failure UI to show (rate limit vs. generic).
 */
export type ErrorCode = 'rate_limit' | 'invalid_request' | 'server_error'

export function codeForStatus(status: number): ErrorCode {
  if (status === 429) {
    return 'rate_limit'
  }

  if (status >= 400 && status < 500) {
    return 'invalid_request'
  }

  return 'server_error'
}
