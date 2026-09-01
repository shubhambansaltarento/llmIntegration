import type { ChatMessageInput, ChatResponseBody } from '../types/chat.types.js'
import { createChatCompletion, streamChatCompletion } from './openai.service.js'

export async function getChatReply(messages: ChatMessageInput[]): Promise<ChatResponseBody> {
  const completion = await createChatCompletion(messages)

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
): AsyncGenerator<string> {
  return streamChatCompletion(messages, signal)
}
