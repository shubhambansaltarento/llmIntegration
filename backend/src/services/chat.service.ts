import type { ChatMessageInput, ChatResponseBody } from '../types/chat.types.js'
import type { Bindings } from '../types/env.js'
import { createChatCompletion, streamChatCompletion } from './openai.service.js'

export async function getChatReply(
  messages: ChatMessageInput[],
  env: Bindings,
): Promise<ChatResponseBody> {
  const completion = await createChatCompletion(messages, env)

  return {
    message: {
      id: completion.id,
      role: 'assistant',
      content: completion.content,
      createdAt: completion.createdAt,
    },
  }
}

export function streamChatReply(
  messages: ChatMessageInput[],
  signal: AbortSignal,
  env: Bindings,
): AsyncGenerator<string> {
  return streamChatCompletion(messages, signal, env)
}
