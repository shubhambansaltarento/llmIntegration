import type { ChatMessagePayload } from './chat.service'

type StreamEvent =
  | { type: 'text'; value: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface StreamCallbacks {
  onChunk: (value: string) => void
  onDone: () => void
  onError: (message: string) => void
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export async function streamChatMessage(
  messages: ChatMessagePayload[],
  callbacks: StreamCallbacks,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed with status ${response.status}`)
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
      const event = JSON.parse(json) as StreamEvent

      if (event.type === 'text') {
        callbacks.onChunk(event.value)
      } else if (event.type === 'error') {
        callbacks.onError(event.message)
      } else if (event.type === 'done') {
        callbacks.onDone()
      }
    }
  }
}
