import {
  ApiError,
  isApiErrorCode,
  isRecord,
  parseErrorResponse,
  type ApiErrorCode,
  type ChatMessagePayload,
} from './chat.service'

/**
 * Discriminated union for the backend's SSE events (mirrors the backend's
 * ChatStreamEvent in backend/src/types/chat.types.ts).
 */
type StreamEvent =
  | { type: 'text'; value: string }
  | { type: 'done' }
  | { type: 'error'; message: string; code?: ApiErrorCode }

function isStreamEvent(value: unknown): value is StreamEvent {
  if (!isRecord(value)) {
    return false
  }

  switch (value.type) {
    case 'text':
      return typeof value.value === 'string'
    case 'done':
      return true
    case 'error':
      return (
        typeof value.message === 'string' &&
        (value.code === undefined || isApiErrorCode(value.code))
      )
    default:
      return false
  }
}

export interface StreamCallbacks {
  onChunk: (value: string) => void
  onDone: () => void
  onError: (message: string, code?: ApiErrorCode) => void
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export async function streamChatMessage(
  messages: ChatMessagePayload[],
  callbacks: StreamCallbacks,
  signal: AbortSignal,
): Promise<void> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
      signal,
    })
  } catch (error) {
    if (signal.aborted) {
      throw error
    }

    // fetch() itself only rejects for transport-level failures (DNS, no
    // connection, CORS, offline) - never for HTTP error statuses. That
    // makes this a reliable signal for "the network dropped", distinct
    // from the server responding with 4xx/5xx below.
    throw new ApiError('Connection interrupted.')
  }

  if (!response.ok || !response.body) {
    throw await parseErrorResponse(response)
  }

  // response.body is a ReadableStream<Uint8Array> of raw network bytes.
  // getReader() locks it and hands us a pull-based reader over those bytes.
  const reader = response.body.getReader()

  // TextDecoder turns raw bytes into text. { stream: true } tells it a
  // multi-byte UTF-8 character might be split across two chunks, so it
  // should hold any incomplete trailing bytes until the next decode() call.
  const decoder = new TextDecoder()

  // A single read() from the network has no relationship to a single SSE
  // "event" - one read can contain half an event, several events, or a
  // truncated one. We accumulate raw text here until we can pull complete
  // "data: ...\n\n" events out of it.
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // SSE events are separated by a blank line ("\n\n"). Split on that,
      // and keep whatever trailing partial event is left (it has no
      // terminating "\n\n" yet) in the buffer for the next chunk.
      const rawEvents = buffer.split('\n\n')
      buffer = rawEvents.pop() ?? ''

      for (const rawEvent of rawEvents) {
        const line = rawEvent.trim()

        if (!line.startsWith('data:')) {
          continue
        }

        const json = line.slice('data:'.length).trim()
        let parsed: unknown

        try {
          parsed = JSON.parse(json)
        } catch {
          // A malformed event shouldn't take down the whole stream - skip
          // it and keep reading rather than throwing out of the loop.
          console.error('Failed to parse SSE event:', json)
          continue
        }

        if (!isStreamEvent(parsed)) {
          console.error('Received a malformed SSE event:', json)
          continue
        }

        switch (parsed.type) {
          case 'text':
            callbacks.onChunk(parsed.value)
            break
          case 'error':
            callbacks.onError(parsed.message, parsed.code)
            break
          case 'done':
            callbacks.onDone()
            break
          default: {
            // Exhaustiveness guard: if StreamEvent ever grows a new variant,
            // this fails to compile until every case above handles it.
            const exhaustiveCheck: never = parsed
            throw new Error(`Unhandled stream event: ${JSON.stringify(exhaustiveCheck)}`)
          }
        }
      }
    }
  } finally {
    // Always release the lock, whether we finished cleanly, the caller
    // aborted, or reading threw - otherwise the ReadableStream stays
    // locked and its underlying resources never get released.
    reader.releaseLock()
  }
}
