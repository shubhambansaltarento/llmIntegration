import type { Request, Response, NextFunction } from 'express'
import type {
  ChatMessageInput,
  ChatResponseBody,
  ChatRole,
  ChatStreamEvent,
  ErrorResponseBody,
} from '../types/chat.types.js'
import { getChatReply, streamChatReply } from '../services/chat.service.js'
import { HttpError, codeForStatus } from '../utils/errors.js'

const MAX_MESSAGE_LENGTH = 4000
const VALID_ROLES: readonly ChatRole[] = ['user', 'assistant', 'system']

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

export async function postChat(
  // The body generic stops at `unknown`, not `ChatRequestBody`: Express
  // performs no runtime validation matching that generic, so asserting
  // ChatRequestBody here would be a claim the type checker can't back up -
  // validateMessages() below is what actually establishes the shape.
  req: Request<unknown, unknown, unknown>,
  res: Response<ChatResponseBody | ErrorResponseBody>,
  next: NextFunction,
) {
  const messages = validateMessages(req.body)

  if (!messages) {
    res.status(400).json({
      error: `messages must be a non-empty array of { role, content } items, each with role in ${[...VALID_ROLES].join('|')} and non-empty content up to ${MAX_MESSAGE_LENGTH} characters`,
      code: codeForStatus(400),
    })
    return
  }

  try {
    const reply = await getChatReply(messages)

    res.status(200).json(reply)
  } catch (error) {
    next(error)
  }
}

export async function postChatStream(
  req: Request<unknown, unknown, unknown>,
  res: Response,
) {
  const messages = validateMessages(req.body)

  if (!messages) {
    res.status(400).json({
      error: `messages must be a non-empty array of { role, content } items, each with role in ${[...VALID_ROLES].join('|')} and non-empty content up to ${MAX_MESSAGE_LENGTH} characters`,
      code: codeForStatus(400),
    })
    return
  }

  const abortController = new AbortController()

  res.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort()
    }
  })

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const send = (event: ChatStreamEvent) => {
    if (res.writableEnded) {
      return
    }

    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }

  try {
    for await (const delta of streamChatReply(messages, abortController.signal)) {
      send({ type: 'text', value: delta })
    }

    if (!abortController.signal.aborted) {
      send({ type: 'done' })
    }
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 502
    const message = error instanceof HttpError ? error.message : 'The AI provider failed to generate a response'
    send({ type: 'error', message, code: codeForStatus(status) })
  } finally {
    if (!res.writableEnded) {
      res.end()
    }
  }
}
