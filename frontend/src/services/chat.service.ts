export interface ChatMessagePayload {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AssistantMessage {
  id: string
  role: 'assistant'
  content: string
  createdAt: string
}

/**
 * Mirrors the backend's ErrorCode (backend/src/utils/errors.ts). Kept as a
 * plain string union rather than a shared package since these are two
 * independently deployable apps - if it drifts, TypeScript will flag call
 * sites that assume an exhaustive match.
 */
export type ApiErrorCode = 'rate_limit' | 'invalid_request' | 'server_error'

const API_ERROR_CODES: readonly ApiErrorCode[] = ['rate_limit', 'invalid_request', 'server_error']

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && (API_ERROR_CODES as readonly string[]).includes(value)
}

function isAssistantMessage(value: unknown): value is AssistantMessage {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.role === 'assistant' &&
    typeof value.content === 'string' &&
    typeof value.createdAt === 'string'
  )
}

/**
 * Thrown for any non-2xx response or transport-level failure so callers can
 * branch on `code`/`status` instead of pattern-matching the message text.
 */
export class ApiError extends Error {
  code?: ApiErrorCode
  status?: number

  constructor(message: string, options?: { code?: ApiErrorCode; status?: number }) {
    super(message)
    this.name = 'ApiError'
    this.code = options?.code
    this.status = options?.status
  }
}

/**
 * Parses a `{ error, code }` failure body (see the backend's
 * ErrorResponseBody) out of a non-ok response, tolerating a missing or
 * malformed body instead of trusting it blindly.
 */
export async function parseErrorResponse(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null)

  const message =
    isRecord(body) && typeof body.error === 'string'
      ? body.error
      : `Request failed with status ${response.status}`

  const code = isRecord(body) && isApiErrorCode(body.code) ? body.code : undefined

  return new ApiError(message, { code, status: response.status })
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export async function sendChatMessages(
  messages: ChatMessagePayload[],
): Promise<AssistantMessage> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }

  const data: unknown = await response.json()

  if (!isRecord(data) || !isAssistantMessage(data.message)) {
    throw new ApiError('Received an unexpected response shape from the server')
  }

  return data.message
}
