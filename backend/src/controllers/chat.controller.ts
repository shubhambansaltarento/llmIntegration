import type { Context } from 'hono'
import { streamSSE } from 'hono/streaming'
import type {
  ChatMessageInput,
  ChatRole,
  ChatStreamEvent,
} from '../types/chat.types.js'
import type { Bindings } from '../types/env.js'
import { getChatReply, streamChatReply } from '../services/chat.service.js'
import { HttpError, codeForStatus } from '../utils/errors.js'

const MAX_MESSAGE_LENGTH = 4000
const VALID_ROLES: readonly ChatRole[] = ['user', 'assistant', 'system']

type AppContext = Context<{ Bindings: Bindings }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isChatRole(value: unknown): value is ChatRole {
  return typeof value === 'string' && (VALID_ROLES as readonly string[]).includes(value)
}

function validateMessages(body: unknown): ChatMessageInput[] | null {
  if (!isRecord(body) || !Array.isArray(body.messages) || body.messages.length === 0) {
    return null
  }

  const normalized: ChatMessageInput[] = []

  for (const item of body.messages) {
    if (!isRecord(item) || !isChatRole(item.role) || typeof item.content !== 'string') {
      return null
    }

    const trimmed = item.content.trim().replace(/\s+/g, ' ')

    if (trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) {
      return null
    }

    normalized.push({ role: item.role, content: trimmed })
  }

  return normalized
}

const VALIDATION_ERROR_MESSAGE = `messages must be a non-empty array of { role, content } items, each with role in ${VALID_ROLES.join('|')} and non-empty content up to ${MAX_MESSAGE_LENGTH} characters`

export async function postChat(c: AppContext) {
  const body: unknown = await c.req.json().catch(() => null)
  const messages = validateMessages(body)

  if (!messages) {
    return c.json({ error: VALIDATION_ERROR_MESSAGE, code: codeForStatus(400) }, 400)
  }

  const reply = await getChatReply(messages, c.env)

  return c.json(reply, 200)
}

export async function postChatStream(c: AppContext) {
  const body: unknown = await c.req.json().catch(() => null)
  const messages = validateMessages(body)

  if (!messages) {
    return c.json({ error: VALIDATION_ERROR_MESSAGE, code: codeForStatus(400) }, 400)
  }

  return streamSSE(c, async (stream) => {
    const abortController = new AbortController()
    stream.onAbort(() => abortController.abort())

    const send = (event: ChatStreamEvent) => stream.writeSSE({ data: JSON.stringify(event) })

    try {
      for await (const delta of streamChatReply(messages, abortController.signal, c.env)) {
        await send({ type: 'text', value: delta })
      }

      if (!abortController.signal.aborted) {
        await send({ type: 'done' })
      }
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 502
      const message = error instanceof HttpError ? error.message : 'The AI provider failed to generate a response'
      await send({ type: 'error', message, code: codeForStatus(status) })
    }
  })
}
